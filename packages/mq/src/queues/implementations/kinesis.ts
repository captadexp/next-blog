import {
    GetRecordsCommand,
    GetShardIteratorCommand,
    KinesisClient,
    PutRecordsCommand,
    ShardIteratorType
} from '@aws-sdk/client-kinesis';
import * as NodeUtils from 'node:util';
import type {IShardLockProvider} from "../../shard";
import {ShardLeaser} from '../../shard';
import {BaseMessage, getEnvironmentQueueName, IMessageQueue, MessageConsumer as Processor, QueueName} from '../../core';
import {EJSON} from "bson";
import {Logger, LogLevel} from "@supergrowthai/utils";
import {KinesisShardManager} from './_kinesis/KinesisShardManager.ts';
import {KinesisMessageProcessor} from './_kinesis/KinesisMessageProcessor.ts';
import {KinesisShardRebalancer} from './_kinesis/KinesisShardRebalancer.ts';
import {LOCK_TTL_MS, MAX_SHARDS_PER_BATCH} from './_kinesis/constants.ts';

const logger = new Logger('KinesisQueue', LogLevel.INFO)

interface KinesisConfig {
    instanceId?: string;
    shardLockProvider: IShardLockProvider;
}

/**
 * Kinesis implementation of the message queue
 */
export class KinesisQueue<PAYLOAD, ID> implements IMessageQueue<PAYLOAD, ID> {
    private readonly kinesis: KinesisClient;
    private textEncoder: NodeUtils.TextEncoder;
    private readonly textDecoder: NodeUtils.TextDecoder;
    private readonly instanceId: string;
    private shardLeasers: Map<QueueName, ShardLeaser> = new Map();
    private isRunning = false;
    private heldShardsByStream: Map<QueueName, Set<string>> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    // Utility instances
    private shardManager: KinesisShardManager;
    private taskProcessor: KinesisMessageProcessor<PAYLOAD, ID>;
    private shardRebalancer: KinesisShardRebalancer;
    private readonly shardLockProvider: IShardLockProvider;

    // Stats tracking
    private queueStats = new Map<QueueName, {
        processed: number;
        produced: number;
    }>();

    constructor(config: KinesisConfig) {
        this.shardLockProvider = config.shardLockProvider;
        this.kinesis = new KinesisClient({
            region: process.env.AWS_REGION
        });
        this.textEncoder = new NodeUtils.TextEncoder();
        this.textDecoder = new NodeUtils.TextDecoder('utf-8');
        this.instanceId = config?.instanceId || process.env.INSTANCE_ID || `instance-${Date.now()}`;

        // Initialize utilities
        this.shardManager = new KinesisShardManager(this.kinesis, this.instanceId);
        this.taskProcessor = new KinesisMessageProcessor<PAYLOAD, ID>({textDecoder: this.textDecoder, instanceId: this.instanceId});
        this.shardRebalancer = new KinesisShardRebalancer({
            instanceId: this.instanceId,
            kinesis: this.kinesis,
            textDecoder: this.textDecoder,
            isRunningCheck: () => this.isRunning,
            isShardHeldCheck: (streamId, shardId) => this.heldShardsByStream.get(streamId)?.has(shardId) || false,
            onShardLost: (streamId, shardId) => this.handleShardLost(streamId, shardId)
        });

        this.setupShutdownHandlers();
        logger.info(`[${this.instanceId}] KinesisQueue initialized.`);
    }

    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        console.log(`Registered queue ${normalizedQueueId}`);
    }

    /**
     * Returns the name of this queue implementation
     */
    name(): string {
        return "kinesis";
    }


    /**
     * Adds a batch of messages to the Kinesis stream
     * @param streamId - The Kinesis stream name
     * @param messages - Array of messages to add to the stream
     */
    async addMessages(streamId: QueueName, messages: BaseMessage<PAYLOAD, ID>[]): Promise<void> {
        if (!streamId) {
            throw new Error('streamId is required');
        }
        if (!Array.isArray(messages)) {
            throw new Error('messages must be an array');
        }
        if (!messages.length) {
            throw new Error('Empty messages array provided - this should not happen');
        }

        const envStreamId = getEnvironmentQueueName(streamId);

        const params = {
            StreamName: envStreamId as unknown as string,
            Records: messages
                .map((message) => ({
                    PartitionKey: this.generatePartitionKey(message),
                    Data: this.textEncoder.encode(EJSON.stringify(message)),
                })),
        };

        try {
            const result = await this.kinesis.send(new PutRecordsCommand(params));
            logger.info(`[${this.instanceId}] [${envStreamId}] Produced ${messages.length} messages. Shards involved: ${result.Records?.map(record => record.ShardId).join(', ')}`);

            // Track produced messages
            if (!this.queueStats.has(envStreamId)) {
                this.queueStats.set(envStreamId, {processed: 0, produced: 0});
            }
            this.queueStats.get(envStreamId)!.produced += messages.length;

            if (result.FailedRecordCount && result.FailedRecordCount > 0) {
                logger.error(`[${this.instanceId}] [${envStreamId}] Failed to produce ${result.FailedRecordCount} records.`);
                // Basic retry or logging - consider more robust handling
                result.Records?.forEach((record, index) => {
                    if (record.ErrorCode) {
                        logger.error(`[${this.instanceId}] [${envStreamId}] Record ${index} failed: ${record.ErrorCode} - ${record.ErrorMessage}`);
                    }
                });
            }
        } catch (error) {
            logger.error(`[${this.instanceId}] [${envStreamId}] Error producing tasks:`, error);
            throw error;
        }
    }

    /**
     * Consumes messages from the Kinesis stream
     * @param streamId - The Kinesis stream name (base name)
     * @param processor - Function to process the messages
     */
    async consumeMessagesStream<T = void>(streamId: QueueName, processor: Processor<PAYLOAD, ID, T>): Promise<T> {
        const envStreamId = getEnvironmentQueueName(streamId); // Use prefixed name
        logger.info(`[${this.instanceId}] Starting task consumption for stream: ${envStreamId}`);

        // Create a new shard leaser for this stream if it doesn't exist
        if (!this.shardLeasers.has(envStreamId)) {
            logger.info(`[${this.instanceId}] [${envStreamId}] Creating new ShardLeaser.`);
            this.shardLeasers.set(
                envStreamId,
                // Use the lock provider instance, pass TTL
                new ShardLeaser(this.shardLockProvider, envStreamId, this.instanceId, LOCK_TTL_MS)
            );
            // Initialize the shard set for this stream if not present
            if (!this.heldShardsByStream.has(envStreamId)) {
                this.heldShardsByStream.set(envStreamId, new Set());
            }
        }

        const shardLeaser = this.shardLeasers.get(envStreamId)!;
        this.isRunning = true;

        // Start the rebalancing process using the new utility
        this.shardRebalancer.startRebalancing(envStreamId, shardLeaser, processor, this.heldShardsByStream)
            .catch(err => {
                logger.error(`[${this.instanceId}] [${envStreamId}] CRITICAL: Rebalancing loop failed unexpectedly:`, err);
            });
        return undefined as T;
    }

    /**
     * Process a batch of messages from the queue and returns - good for cron based usage
     * @param streamId The stream to process from
     * @param processor Function to process tasks
     * @param limit Maximum number of messages to process
     * @returns void
     */
    async consumeMessagesBatch<T = void>(streamId: QueueName, processor: Processor<PAYLOAD, ID, T>, limit: number = 10): Promise<T> {
        streamId = getEnvironmentQueueName(streamId);
        try {
            // List all shards using the utility
            const availableShards = await this.shardManager.listShards(streamId);
            if (!availableShards.length) {
                return undefined as T;
            }

            // Process up to 'limit' records across all shards (max per constant)
            let processedCount = 0;
            for (const shardId of availableShards.slice(0, MAX_SHARDS_PER_BATCH)) {
                if (processedCount >= limit) break;

                // Create a shardLeaser if it doesn't exist
                if (!this.shardLeasers.has(streamId)) {
                    this.shardLeasers.set(
                        streamId,
                        new ShardLeaser(this.shardLockProvider, streamId, this.instanceId)
                    );
                }

                const shardLeaser = this.shardLeasers.get(streamId)!;
                const checkpoint = await shardLeaser.getCheckpoint(shardId);

                // Get iterator for batch processing
                const shardIterator = await this.getBatchProcessingIterator(
                    streamId,
                    shardId,
                    checkpoint
                );

                if (!shardIterator) continue;

                // Get records from this shard
                const recordsResponse = await this.kinesis.send(
                    new GetRecordsCommand({
                        ShardIterator: shardIterator,
                        Limit: limit - processedCount
                    })
                );

                if (!recordsResponse.Records?.length) continue;

                // Process batch using utility
                await this.taskProcessor.processBatch(
                    recordsResponse.Records as any,//fixme typed hacked here
                    processor,
                    `kinesis:${streamId}:${shardId}`
                );

                // Track processed count
                processedCount += recordsResponse.Records.length;

                // Update checkpoint with last sequence number
                const lastSequence = recordsResponse.Records[recordsResponse.Records.length - 1].SequenceNumber;
                if (lastSequence) {
                    await shardLeaser.setCheckpoint(shardId, lastSequence);
                }
            }
        } catch (error) {
            logger.error(`Error processing batch from Kinesis stream ${streamId}:`, error);
            throw error;
        }
        return undefined as T;
    }

    /**
     * Stops consuming messages and actively releases all tracked shard locks.
     */
    async shutdown(): Promise<void> {
        logger.info(`[${this.instanceId}] Initiating shutdown...`);
        if (!this.isRunning) {
            logger.info(`[${this.instanceId}] Shutdown already in progress or completed.`);
            return;
        }
        this.isRunning = false; // Signal loops to stop

        // Report final stats before shutdown - always send at least a shutdown notification
        let statsMessage = `[${this.instanceId}] Kinesis Shutdown initiated\n`;

        if (this.queueStats.size > 0) {
            let hasStats = false;
            for (const [queue, stats] of this.queueStats) {
                if (stats.produced > 0 || stats.processed > 0) {
                    statsMessage += `${queue}: Produced ${stats.produced}, Processed ${stats.processed}\n`;
                    hasStats = true;
                }
            }
            if (!hasStats) {
                statsMessage += `No messages processed during this session\n`;
            }
        } else {
            statsMessage += `No messages processed during this session\n`;
        }

        try {
            // fixme add support for slack via a callback
            // await slack.sendSlackMessage(undefined, statsMessage);
            logger.info('Sent Kinesis shutdown stats to Slack');
        } catch (err) {
            logger.error(`Failed to send shutdown stats to Slack: ${err}`);
        }

        // Stop all active consumers in the rebalancer
        this.shardRebalancer.stopAllConsumers();

        const releasePromises: Promise<void>[] = [];
        logger.info(`[${this.instanceId}] Releasing actively tracked locks...`);

        // Iterate through the class-level tracking map
        for (const [streamId, heldShards] of this.heldShardsByStream.entries()) {
            const shardLeaser = this.shardLeasers.get(streamId);
            if (!shardLeaser) {
                logger.warn(`[${this.instanceId}] [${streamId}] No shardLeaser found during shutdown`);
                continue;
            }
            if (heldShards.size === 0) {
                logger.info(`[${this.instanceId}] [${streamId}] No shards currently tracked`);
                continue;
            }

            logger.info(`[${this.instanceId}] [${streamId}] Attempting to release ${heldShards.size} tracked shards: ${Array.from(heldShards).join(', ')}`);
            for (const shardId of heldShards) {
                logger.debug(`[${this.instanceId}] [${streamId}] [${shardId}] Releasing lock during shutdown`);
                releasePromises.push(
                    shardLeaser.releaseLock(shardId)
                        .then(() => {
                            logger.debug(`[${this.instanceId}] [${streamId}] [${shardId}] Successfully released lock during shutdown`);
                        })
                        .catch(err => {
                            logger.error(`[${this.instanceId}] [${streamId}] [${shardId}] Error releasing lock during shutdown:`, err);
                        })
                );
            }
        }

        // Wait for all release attempts to settle
        const results = await Promise.allSettled(releasePromises);
        logger.info(`[${this.instanceId}] Lock release attempts completed (${results.filter(r => r.status === 'fulfilled').length} success, ${results.filter(r => r.status === 'rejected').length} failed)`);


        // Cleanup leasers (stop heartbeats etc.)
        logger.info(`[${this.instanceId}] Cleaning up shard leasers (${this.shardLeasers.size})`);
        for (const [streamId, shardLeaser] of this.shardLeasers.entries()) {
            logger.info(`[${this.instanceId}] [${streamId}] Cleaning up leaser`);
            shardLeaser.cleanup();
        }

        this.shardLeasers.clear();
        this.heldShardsByStream.clear();

        logger.info(`[${this.instanceId}] Shutdown complete`);
    }

    /**
     * Handle when a shard is lost (utility callback)
     */
    private handleShardLost(streamId: QueueName, shardId: string): void {
        const streamShards = this.heldShardsByStream.get(streamId);
        if (streamShards?.has(shardId)) {
            streamShards.delete(shardId);
            logger.info(`[${this.instanceId}] [${streamId}] [${shardId}] Shard removed from tracking due to lost lock`);

            if (streamShards.size === 0) {
                this.heldShardsByStream.delete(streamId);
                logger.info(`[${this.instanceId}] [${streamId}] Removed stream entry from tracking map`);
            }
        }
    }

    private setupShutdownHandlers() {

        const sigintHandler = async () => {
            logger.info(`[${this.instanceId}] SIGINT received.`);
            await this.shutdown();
        };

        const sigtermHandler = async () => {
            logger.info(`[${this.instanceId}] SIGTERM received.`);
            await this.shutdown();
        };

        const sigquitHandler = async () => {
            logger.info(`[${this.instanceId}] sigquit received.`);
            await this.shutdown();
        };

        // Register the handlers
        logger.warn("Shutdown handlers not implemented");
        // shutdownManager.sigint.register(sigintHandler);
        // shutdownManager.sigterm.register(sigtermHandler);
        // shutdownManager.sigquit.register(sigquitHandler);

        logger.debug(`[${this.instanceId}] Shutdown handlers registered`);
    }

    private generatePartitionKey<PAYLOAD, ID>(message: BaseMessage<PAYLOAD, ID>): string {
        return message.type;
    }

    /**
     * Get iterator for batch processing (inlined from KinesisIteratorManager)
     */
    private async getBatchProcessingIterator(
        streamId: QueueName,
        shardId: string,
        checkpoint: string | null
    ): Promise<string | undefined> {
        const logPrefix = `[${this.instanceId}] [${streamId}] [${shardId}]`;

        try {
            const iteratorType = checkpoint
                ? ShardIteratorType.AFTER_SEQUENCE_NUMBER
                : ShardIteratorType.TRIM_HORIZON;

            logger.debug(`${logPrefix} Getting batch processing iterator: ${iteratorType}${checkpoint ? ' after ' + checkpoint : ''}`);

            const response = await this.kinesis.send(
                new GetShardIteratorCommand({
                    StreamName: streamId as unknown as string,
                    ShardId: shardId,
                    ShardIteratorType: iteratorType,
                    ...(checkpoint && {StartingSequenceNumber: checkpoint}),
                })
            );

            if (!response.ShardIterator) {
                logger.warn(`${logPrefix} Failed to get batch processing iterator`);
                return undefined;
            }

            logger.debug(`${logPrefix} Successfully obtained batch processing iterator`);
            return response.ShardIterator;

        } catch (error) {
            logger.error(`${logPrefix} Error getting batch processing iterator:`, error);
            return undefined;
        }
    }


}

