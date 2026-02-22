import {
    GetRecordsCommand,
    GetRecordsCommandOutput,
    GetShardIteratorCommand,
    KinesisClient,
    ShardIteratorType
} from '@aws-sdk/client-kinesis';
import {ShardLeaser} from '../../../shard';
import {MessageConsumer, QueueName} from '../../../core';
import type {IAdaptiveStrategy} from '../../../core';
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

/** Default number of failures from the same checkpoint before advancing past it */
const POISON_PILL_THRESHOLD = 3;

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
    onCheckpoint?: (shardId: string, checkpoint: string, recordCount: number) => void;
    adaptiveStrategy?: IAdaptiveStrategy;
    onPoisonPill?: (shardId: string, checkpoint: string, recordCount: number) => void;
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
    private stopped = false;

    // Poison pill tracking (K1)
    private lastCheckpoint: string | null = null;
    private checkpointFailureCount = 0;


    constructor(private config: ConsumerConfig) {
        const {instanceId, streamId, shardId} = config;
    }

    /**
     * Signal the consumer to stop its processing loop
     */
    stop(): void {
        this.stopped = true;
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

    private static readonly LOCK_RENEWAL_MAX_RETRIES = 2;
    private static readonly LOCK_RENEWAL_RETRY_DELAY_MS = 2000;

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
            // Note: isRenewing check is safe - JS event loop ensures check+set are atomic (no await between them)
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
                let renewed = false;

                for (let attempt = 0; attempt <= KinesisShardConsumer.LOCK_RENEWAL_MAX_RETRIES; attempt++) {
                    try {
                        logger.debug(`${logPrefix} Renewing lock (attempt ${attempt + 1})...`);
                        renewed = await shardLeaser.renewLock(shardId);

                        if (renewed) {
                            logger.debug(`${logPrefix} Lock renewed successfully`);
                            break;
                        }

                        if (attempt < KinesisShardConsumer.LOCK_RENEWAL_MAX_RETRIES) {
                            logger.warn(`${logPrefix} Lock renewal returned false, retrying in ${KinesisShardConsumer.LOCK_RENEWAL_RETRY_DELAY_MS}ms...`);
                            await new Promise(resolve => setTimeout(resolve, KinesisShardConsumer.LOCK_RENEWAL_RETRY_DELAY_MS));
                        }
                    } catch (error) {
                        if (attempt < KinesisShardConsumer.LOCK_RENEWAL_MAX_RETRIES) {
                            logger.warn(`${logPrefix} Lock renewal threw error, retrying in ${KinesisShardConsumer.LOCK_RENEWAL_RETRY_DELAY_MS}ms...`, error);
                            await new Promise(resolve => setTimeout(resolve, KinesisShardConsumer.LOCK_RENEWAL_RETRY_DELAY_MS));
                        } else {
                            logger.error(`${logPrefix} CRITICAL: Lock renewal failed after all retries!`, error);
                        }
                    }
                }

                if (!renewed) {
                    logger.error(`${logPrefix} CRITICAL: Lock renewal failed after ${KinesisShardConsumer.LOCK_RENEWAL_MAX_RETRIES + 1} attempts - lock lost!`);
                    this.handleLockRenewalFailure();
                }
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

        const {adaptiveStrategy} = this.config;

        while (isRunningCheck() && this.shardIterator && !this.processorTimedOut && !this.stopped) {
            if (!isShardHeldCheck(streamId, shardId)) {
                logger.warn(`${logPrefix} Shard no longer tracked as held`);
                break;
            }

            // Check adaptive backoff
            if (adaptiveStrategy?.shouldBackoff(shardId)) {
                logger.debug(`${logPrefix} Adaptive backoff active, delaying`);
                await new Promise(resolve => setTimeout(resolve, adaptiveStrategy.getProcessingDelay(shardId)));
                continue;
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
                    const delay = adaptiveStrategy?.getProcessingDelay(shardId) ?? PROCESSING_DELAY;
                    logger.debug(`${logPrefix} No records found, pausing ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
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
        const {kinesis, shardId, adaptiveStrategy} = this.config;
        const logPrefix = `[${this.config.instanceId}] [${this.config.streamId}] [${shardId}]`;

        const limit = adaptiveStrategy?.getBatchSize(shardId) ?? BATCH_RECORD_LIMIT;
        logger.debug(`${logPrefix} Getting records (limit: ${limit})...`);

        return await kinesis.send(
            new GetRecordsCommand({
                ShardIterator: this.shardIterator,
                Limit: limit
            })
        );
    }

    /**
     * Process a batch of records
     */
    private async processRecordBatch(recordsResponse: GetRecordsCommandOutput): Promise<void> {
        const {instanceId, streamId, shardId, processor, textDecoder, shardLeaser, adaptiveStrategy} = this.config;
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
            const taskTypes = [...new Set(messages.map(m => m.type))];
            const batchStartTime = Date.now();
            logger.info(`${logPrefix} Processing ${messages.length} messages`);

            // K1: Check poison pill — same checkpoint failing repeatedly
            const currentCheckpoint = recordsResponse.Records![0].SequenceNumber ?? null;
            if (currentCheckpoint && currentCheckpoint === this.lastCheckpoint) {
                this.checkpointFailureCount++;
            } else {
                this.lastCheckpoint = currentCheckpoint;
                this.checkpointFailureCount = 0;
            }

            if (this.checkpointFailureCount >= POISON_PILL_THRESHOLD) {
                logger.error(`${logPrefix} POISON PILL DETECTED: checkpoint ${currentCheckpoint} failed ${this.checkpointFailureCount} times, advancing past batch`);

                // Advance checkpoint past this batch
                const lastSequence = recordsResponse.Records![recordsResponse.Records!.length - 1].SequenceNumber;
                if (lastSequence) {
                    await shardLeaser.setCheckpoint(shardId, lastSequence);
                    this.config.onCheckpoint?.(shardId, lastSequence, messages.length);
                    this.config.onPoisonPill?.(shardId, lastSequence, messages.length);
                }

                // Notify adaptive strategy
                adaptiveStrategy?.recordBatchResult({
                    shardId,
                    recordCount: messages.length,
                    successCount: 0,
                    failureCount: messages.length,
                    processingTimeMs: Date.now() - batchStartTime,
                    taskTypes,
                    failedTaskTypes: taskTypes,
                    throttled: false,
                    poisonPill: true,
                });

                // Reset tracking
                this.checkpointFailureCount = 0;
                this.lastCheckpoint = null;
                return;
            }

            try {
                // TODO(K4): Pass AbortSignal to processor and abort it on timeout.
                //   Currently Promise.race abandons the timeout but the processor keeps running
                //   in background — holding DB connections, task locks (30min TTL in TaskRunner),
                //   and potentially writing stale results. Create an AbortController, pass its
                //   signal to the processor, and call .abort() on timeout.
                //   Severity: HIGH. Requires processor contract change (breaking).
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
                    this.config.onCheckpoint?.(shardId, lastSequence, messages.length);
                }

                // Reset poison pill tracking on success
                this.checkpointFailureCount = 0;
                this.lastCheckpoint = null;

                // Notify adaptive strategy of success
                adaptiveStrategy?.recordBatchResult({
                    shardId,
                    recordCount: messages.length,
                    successCount: messages.length,
                    failureCount: 0,
                    processingTimeMs: Date.now() - batchStartTime,
                    taskTypes,
                    failedTaskTypes: [],
                    throttled: false,
                    poisonPill: false,
                });

            } catch (processorError: any) {
                logger.error(`${logPrefix} Error during task processing:`, processorError);
                this.consecutiveErrorCount++;

                // Notify adaptive strategy of failure
                adaptiveStrategy?.recordBatchResult({
                    shardId,
                    recordCount: messages.length,
                    successCount: 0,
                    failureCount: messages.length,
                    processingTimeMs: Date.now() - batchStartTime,
                    taskTypes,
                    failedTaskTypes: taskTypes,
                    throttled: false,
                    poisonPill: false,
                });

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
        const {instanceId, streamId, shardId, kinesis, shardLeaser, adaptiveStrategy} = this.config;
        const logPrefix = `[${instanceId}] [${streamId}] [${shardId}]`;

        const isThrottle = error.name === 'ProvisionedThroughputExceededException';
        if (!isThrottle) {
            this.consecutiveErrorCount++;
        }
        logger.error(`${logPrefix} Error in processing iteration (Count: ${this.consecutiveErrorCount}):`, error);

        // Notify adaptive strategy of the error
        if (isThrottle) {
            adaptiveStrategy?.recordBatchResult({
                shardId,
                recordCount: 0,
                successCount: 0,
                failureCount: 0,
                processingTimeMs: 0,
                taskTypes: [],
                failedTaskTypes: [],
                throttled: true,
                poisonPill: false,
            });
        }

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

        } else if (isThrottle) {
            const throttleDelay = adaptiveStrategy?.getProcessingDelay(shardId) ?? PROCESSING_DELAY * 5;
            logger.warn(`${logPrefix} Throughput exceeded, backing off ${throttleDelay}ms (not counted as error)`);
            await new Promise(resolve => setTimeout(resolve, throttleDelay));

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