import {
    GetRecordsCommand,
    GetRecordsCommandOutput,
    GetShardIteratorCommand,
    KinesisClient,
    ShardIteratorType
} from '@aws-sdk/client-kinesis';
import {ShardLeaser} from '../../../shard';
import {MessageConsumer, QueueName} from '../../../core';
import {Logger, LogLevel} from "@supergrowthai/utils";
import {EJSON} from "bson";
import {
    BATCH_RECORD_LIMIT,
    LOCK_RENEWAL_INTERVAL,
    MAX_CONSECUTIVE_ERRORS,
    PROCESSING_DELAY,
    PROCESSOR_TIMEOUT_MS
} from "./constants";
import {transformTask} from "./task-transformer.js";
import * as NodeUtils from 'node:util';

const logger = new Logger('ShardConsumer', LogLevel.INFO);

interface ConsumerConfig {
    instanceId: string;
    streamId: QueueName;
    shardId: string;
    kinesis: KinesisClient;
    shardLeaser: ShardLeaser;
    processor: MessageConsumer<unknown, unknown>;
    textDecoder: NodeUtils.TextDecoder;
    onShardLost?: () => void;
    isRunningCheck: () => boolean;
    isShardHeldCheck: (streamId: QueueName, shardId: string) => boolean;
}

/**
 * Handles consumption from a single Kinesis shard
 */
export class KinesisShardConsumer {
    private shardIterator: string | undefined;
    private renewalTimer: NodeJS.Timeout | null = null;
    private consecutiveErrorCount = 0;
    private processorTimedOut = false;
    private isRenewing = false;
    private isShuttingDown = false;


    constructor(private config: ConsumerConfig) {
        const {instanceId, streamId, shardId} = config;
    }

    /**
     * Start consuming from the shard
     */
    async consume(): Promise<void> {
        const {instanceId, streamId, shardId} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        logger.debug(`${logPrefix} Starting consumption`);

        try {
            // Initialize iterator
            await this.initializeIterator();

            if (!this.shardIterator) {
                logger.warn(`${logPrefix} Failed to get initial shard iterator`);
                return;
            }

            // Start lock renewal
            this.startLockRenewal();

            logger.info(`${logPrefix} Entering main processing loop`);

            // Main processing loop
            await this.processRecords();

        } catch (error) {
            logger.error(`${logPrefix} Unrecoverable error during consumption:`, error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Initialize the shard iterator based on checkpoint
     */
    private async initializeIterator(): Promise<void> {
        const {shardLeaser, shardId, kinesis, streamId} = this.config;
        const logPrefix = `[${this.config.instanceId}] [${streamId}] [${shardId}]`;

        const checkpoint = await shardLeaser.getCheckpoint(shardId);
        const iteratorType = checkpoint
            ? ShardIteratorType.AFTER_SEQUENCE_NUMBER
            : ShardIteratorType.TRIM_HORIZON;

        logger.debug(`${logPrefix} Starting iterator type: ${iteratorType}${checkpoint ? ' after ' + checkpoint : ''}`);

        const response = await kinesis.send(
            new GetShardIteratorCommand({
                StreamName: streamId as unknown as string,
                ShardId: shardId,
                ShardIteratorType: iteratorType,
                ...(checkpoint && {StartingSequenceNumber: checkpoint}),
            })
        );

        this.shardIterator = response.ShardIterator;
    }

    /**
     * Start the lock renewal timer
     */
    private startLockRenewal(): void {
        const {instanceId, streamId, shardId, shardLeaser, isRunningCheck, isShardHeldCheck} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        // CRITICAL FIX: Prevent timer leak by clearing existing timer
        if (this.renewalTimer) {
            logger.debug(`${logPrefix} Clearing existing renewal timer before creating new one`);
            clearInterval(this.renewalTimer);
            this.renewalTimer = null;
        }

        this.renewalTimer = setInterval(async () => {
            // FIXME: Optimize race condition handling - isRenewing flag is not atomic
            // TODO: Consider using proper mutex/semaphore for lock renewal synchronization
            if (this.isShuttingDown || !isRunningCheck() || !isShardHeldCheck(streamId, shardId) || this.isRenewing) {
                if (this.isShuttingDown) {
                    logger.debug(`${logPrefix} Consumer shutting down, skipping renewal`);
                } else if (!isRunningCheck()) {
                    logger.info(`${logPrefix} Instance stopping, skipping renewal`);
                } else if (!isShardHeldCheck(streamId, shardId)) {
                    logger.info(`${logPrefix} Shard no longer tracked, skipping renewal`);
                } else if (this.isRenewing) {
                    logger.debug(`${logPrefix} Lock renewal already in progress, skipping`);
                }
                return;
            }

            this.isRenewing = true;
            try {
                logger.debug(`${logPrefix} Renewing lock...`);

                await shardLeaser.renewLock(shardId);

                logger.debug(`${logPrefix} Lock renewed successfully`);
            } catch (error) {
                logger.error(`${logPrefix} CRITICAL: Failed to renew lock!`, error);
                this.handleLockRenewalFailure();
            } finally {
                this.isRenewing = false;
            }
        }, LOCK_RENEWAL_INTERVAL);

        logger.debug(`${logPrefix} Lock renewal timer started`);
    }

    /**
     * Handle lock renewal failure with graceful degradation
     */
    private handleLockRenewalFailure(): void {
        const {instanceId, streamId, shardId} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        logger.warn(`${logPrefix} Handling lock renewal failure - stopping consumer gracefully`);

        // Signal processing loop to stop
        this.shardIterator = undefined;

        // Trigger shard lost callback
        if (this.config.onShardLost) {
            this.config.onShardLost();
        }

        // Clean up renewal timer
        this.stopLockRenewal();
    }

    /**
     * Stop the lock renewal timer
     */
    private stopLockRenewal(): void {
        if (this.renewalTimer) {
            const {instanceId, streamId, shardId} = this.config;
            const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

            logger.debug(`${logPrefix} Stopping lock renewal timer`);
            clearInterval(this.renewalTimer);
            this.renewalTimer = null;
        }
    }

    /**
     * Main record processing loop
     */
    private async processRecords(): Promise<void> {
        const {instanceId, streamId, shardId, isRunningCheck, isShardHeldCheck, shardLeaser} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        while (isRunningCheck() && this.shardIterator && !this.processorTimedOut) {
            if (!isShardHeldCheck(streamId, shardId)) {
                logger.warn(`${logPrefix} Shard no longer tracked as held`);
                break;
            }

            try {
                const recordsResponse = await this.fetchRecords();

                if (!isRunningCheck()) {
                    logger.info(`${logPrefix} Instance stopping after GetRecords`);
                    break;
                }

                if (recordsResponse.Records?.length) {
                    await this.processRecordBatch(recordsResponse);
                } else {
                    logger.debug(`${logPrefix} No records found, pausing`);
                    await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
                }

                // Move to next iterator
                this.shardIterator = recordsResponse.NextShardIterator;

                if (!this.shardIterator) {
                    logger.info(`${logPrefix} Shard iterator became null (likely shard closed)`);
                    break;
                }

                if (this.consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS) {
                    logger.error(`${logPrefix} Exceeded maximum consecutive errors`);
                    break;
                }

            } catch (error: any) {
                await this.handleProcessingError(error);

                if (this.processorTimedOut) {
                    logger.info(`${logPrefix} Processor timed out, breaking loop`);
                    break;
                }
            }
        }

        this.logLoopTermination();

        // CRITICAL FIX: Handle precautionary cleanup with graceful degradation instead of hard exit
        const exitLogPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        if ((!isRunningCheck() || !this.shardIterator || this.processorTimedOut) && typeof shardLeaser.releaseLock === 'function') {
            logger.warn(`${exitLogPrefix} PRECAUTIONARY CALL: Loop exited. Explicitly attempting to release lock and cleanup.`);

            await this.handleGracefulShardFailure(exitLogPrefix, shardLeaser, shardId);
        }
    }

    /**
     * Handle graceful shard failure instead of hard process exit
     */
    private async handleGracefulShardFailure(logPrefix: string, shardLeaser: ShardLeaser, shardId: string): Promise<void> {
        logger.error(`${logPrefix} CRITICAL: Shard consumption failure detected - handling gracefully`);

        // Set shutdown flag to prevent new operations
        this.isShuttingDown = true;

        // Stop renewal timer immediately
        this.stopLockRenewal();

        // Attempt to release lock with timeout protection
        const releasePromise = shardLeaser.releaseLock(shardId)
            .then(() => {
                logger.info(`${logPrefix} Successfully released lock during graceful failure`);
            })
            .catch((err: any) => {
                logger.error(`${logPrefix} Error releasing lock during graceful failure:`, err);
            });

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
                logger.warn(`${logPrefix} Lock release timed out during graceful failure`);
                resolve();
            }, 5000); // 5 second timeout
        });

        await Promise.race([releasePromise, timeoutPromise]);

        // Notify parent that shard was lost
        if (this.config.onShardLost) {
            try {
                this.config.onShardLost();
                logger.info(`${logPrefix} Shard lost callback completed`);
            } catch (callbackErr) {
                logger.error(`${logPrefix} Error in shard lost callback:`, callbackErr);
            }
        }

        logger.warn(`${logPrefix} Graceful shard failure handling completed - consumer will exit`);
    }

    /**
     * Fetch records from Kinesis
     */
    private async fetchRecords(): Promise<GetRecordsCommandOutput> {
        const {kinesis} = this.config;
        const logPrefix = `[${this.config.instanceId}] [${this.config.streamId}] [${this.config.shardId}]`;

        logger.debug(`${logPrefix} Getting records with current iterator...`);

        // Get records from Kinesis
        return await kinesis.send(
            new GetRecordsCommand({
                ShardIterator: this.shardIterator,
                Limit: BATCH_RECORD_LIMIT
            })
        );
    }

    /**
     * Process a batch of records
     */
    private async processRecordBatch(recordsResponse: GetRecordsCommandOutput): Promise<void> {
        const {instanceId, streamId, shardId, processor, textDecoder, shardLeaser} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        this.consecutiveErrorCount = 0; // Reset on successful fetch

        const messages = recordsResponse.Records!
            .map((record) => {
                try {
                    return transformTask(EJSON.parse(textDecoder.decode(record.Data)));
                } catch (error) {
                    logger.error(`${logPrefix} Error parsing record (Seq: ${record.SequenceNumber}):`, error);
                    return null;
                }
            })
            .filter((task): task is NonNullable<typeof task> => task !== null);

        if (messages.length > 0) {
            logger.info(`${logPrefix} Processing ${messages.length} messages`);

            try {
                logger.debug(`${logPrefix} Calling processor function...`);

                await Promise.race([
                    processor(`${streamId}:${shardId}`, messages),
                    new Promise((_, reject) =>
                        setTimeout(
                            () => reject(new Error(`Processor timed out after ${PROCESSOR_TIMEOUT_MS}ms`)),
                            PROCESSOR_TIMEOUT_MS
                        )
                    )
                ]);

                logger.debug(`${logPrefix} Processor function returned`);

                // Update checkpoint
                const lastSequence = recordsResponse.Records![recordsResponse.Records!.length - 1].SequenceNumber;
                if (lastSequence) {
                    logger.debug(`${logPrefix} Setting checkpoint to ${lastSequence}`);
                    await shardLeaser.setCheckpoint(shardId, lastSequence);
                }

            } catch (processorError: any) {
                logger.error(`${logPrefix} Error during task processing:`, processorError);
                this.consecutiveErrorCount++;

                if (processorError.message?.includes('timed out')) {
                    logger.error(`${logPrefix} PROCESSOR TIMED OUT`);
                    this.processorTimedOut = true;
                }
            }
        }
    }

    /**
     * Handle processing errors
     */
    private async handleProcessingError(error: any): Promise<void> {
        const {instanceId, streamId, shardId, kinesis, shardLeaser} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        this.consecutiveErrorCount++;
        logger.error(`${logPrefix} Error in processing iteration (Count: ${this.consecutiveErrorCount}):`, error);

        if (error.name === 'ExpiredIteratorException') {
            logger.warn(`${logPrefix} Iterator expired, attempting to get new one`);

            try {
                const lastCheckpoint = await shardLeaser.getCheckpoint(shardId);
                const response = await kinesis.send(
                    new GetShardIteratorCommand({
                        StreamName: streamId as unknown as string,
                        ShardId: shardId,
                        ShardIteratorType: lastCheckpoint
                            ? ShardIteratorType.AFTER_SEQUENCE_NUMBER
                            : ShardIteratorType.TRIM_HORIZON,
                        ...(lastCheckpoint && {StartingSequenceNumber: lastCheckpoint}),
                    })
                );

                this.shardIterator = response.ShardIterator;

                if (!this.shardIterator) {
                    logger.error(`${logPrefix} Failed to get new iterator after expiry`);
                } else {
                    logger.info(`${logPrefix} Successfully obtained new iterator`);
                    this.consecutiveErrorCount = 0;
                }
            } catch (iteratorError) {
                logger.error(`${logPrefix} Critical error getting new iterator`, iteratorError);
                this.shardIterator = undefined;
            }

        } else if (error.name === 'ProvisionedThroughputExceededException') {
            logger.warn(`${logPrefix} Throughput exceeded, backing off`);
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY * 5));

        } else {
            logger.warn(`${logPrefix} Non-specific error, will retry`);
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
        }
    }

    /**
     * Log the reason for loop termination
     */
    private logLoopTermination(): void {
        const {instanceId, streamId, shardId, isRunningCheck} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        logger.info(`${logPrefix} Main processing loop terminated`);

        if (this.processorTimedOut) {
            logger.warn(`${logPrefix} Reason: Processor timed out`);
        } else if (!isRunningCheck()) {
            logger.info(`${logPrefix} Reason: Instance stopping`);
        } else if (!this.shardIterator) {
            logger.info(`${logPrefix} Reason: Iterator became null/undefined`);
        } else {
            logger.warn(`${logPrefix} Reason: Loop broken internally`);
        }
    }

    /**
     * Cleanup resources
     */
    private async cleanup(): Promise<void> {
        const {instanceId, streamId, shardId} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        logger.info(`${logPrefix} Entering cleanup`);

        // FIXME: Optimize shutdown sequence to prevent race conditions
        // TODO: Consider implementing a proper state machine for consumer lifecycle
        this.isShuttingDown = true;

        // Wait for any ongoing renewal to complete
        let attempts = 0;
        while (this.isRenewing && attempts < 10) {
            logger.debug(`${logPrefix} Waiting for ongoing renewal to complete...`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (this.isRenewing) {
            logger.warn(`${logPrefix} Renewal still in progress after cleanup timeout`);
        }

        // Clean up renewal timer
        this.stopLockRenewal();

        logger.info(`${logPrefix} Cleanup finished`);
    }

}