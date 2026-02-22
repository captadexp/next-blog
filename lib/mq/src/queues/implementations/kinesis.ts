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
import {
    BaseMessage,
    getEnvironmentQueueName,
    IMessageQueue,
    IQueueLifecycleProvider,
    MessageConsumer as Processor,
    QueueLifecycleConfig,
    QueueName,
    QueueNotifier
} from '../../core';
import type {IAdaptiveStrategy} from '../../core/interfaces/adaptive-strategy.js';
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
    notifier?: QueueNotifier;
    signal?: AbortSignal;
    /** Default partition key generator. Defaults to message.type. */
    defaultPartitionKey?: (message: BaseMessage<any>) => string;
    /** Consumer-side adaptive processing strategy */
    adaptiveStrategy?: IAdaptiveStrategy;
}

/**
 * AWS Kinesis-based distributed message queue.
 *
 * @description High-throughput, distributed message queue using AWS Kinesis streams.
 * Supports multiple consumers via shard-based distribution with distributed locking.
 *
 * @use-case Multi-server production deployments requiring horizontal scaling
 * @multi-instance SAFE - uses shard-based distribution with distributed locking
 * @persistence Kinesis stream retention (configurable, default 24h-7d)
 * @requires AWS Kinesis stream, distributed lock provider (Redis recommended)
 *
 * @features
 * - Shard-based parallel processing
 * - Automatic shard rebalancing across instances
 * - Checkpoint-based recovery after failures
 * - Lock renewal with ownership verification
 * - Graceful shutdown with lock release
 *
 * @typeParam ID - The message ID type
 *
 * @example
 * ```typescript
 * const lockProvider = new RedisClusterShardLockProvider(redis);
 * const queue = new KinesisQueue({
 *   streamName: 'my-stream',
 *   lockProvider,
 *   instanceId: 'worker-1'
 * });
 * ```
 */
export class KinesisQueue<ID> implements IMessageQueue<ID> {
    private readonly kinesis: KinesisClient;
    private textEncoder: NodeUtils.TextEncoder;
    private readonly textDecoder: NodeUtils.TextDecoder;
    private readonly instanceId: string;
    private shardLeasers: Map<QueueName, ShardLeaser> = new Map();
    private isRunning = false;
    private heldShardsByStream: Map<QueueName, Set<string>> = new Map();
    private registeredQueues: Set<QueueName> = new Set();
    private lifecycleProvider?: IQueueLifecycleProvider;
    private lifecycleMode: 'sync' | 'async' = 'async';

    // Utility instances
    private shardManager: KinesisShardManager;
    private taskProcessor: KinesisMessageProcessor<ID>;
    private shardRebalancer: KinesisShardRebalancer;
    private readonly shardLockProvider: IShardLockProvider;

    // Stats tracking
    private queueStats = new Map<QueueName, {
        processed: number;
        produced: number;
    }>();
    private readonly notifier?: QueueNotifier;
    private readonly signal?: AbortSignal;
    private readonly config: KinesisConfig;

    constructor(config: KinesisConfig) {
        this.config = config;
        this.shardLockProvider = config.shardLockProvider;
        this.notifier = config.notifier;
        this.signal = config.signal;
        this.kinesis = new KinesisClient({
            region: process.env.AWS_REGION
        });
        this.textEncoder = new NodeUtils.TextEncoder();
        this.textDecoder = new NodeUtils.TextDecoder('utf-8');
        this.instanceId = config?.instanceId || process.env.INSTANCE_ID || `instance-${Date.now()}`;

        // Initialize utilities
        this.shardManager = new KinesisShardManager(this.kinesis, this.instanceId);
        this.taskProcessor = new KinesisMessageProcessor<ID>({
            textDecoder: this.textDecoder,
            instanceId: this.instanceId
        });
        this.shardRebalancer = new KinesisShardRebalancer({
            instanceId: this.instanceId,
            kinesis: this.kinesis,
            textDecoder: this.textDecoder,
            isRunningCheck: () => this.isRunning,
            isShardHeldCheck: (streamId, shardId) => this.heldShardsByStream.get(streamId)?.has(shardId) || false,
            onShardLost: (streamId, shardId) => this.handleShardLost(streamId, shardId),
            onShardConnected: (streamId, shardId) => {
                if (this.lifecycleProvider?.onConsumerConnected) {
                    this.emitLifecycleEvent(this.lifecycleProvider.onConsumerConnected, {
                        consumer_id: `${this.instanceId}:${shardId}`,
                        consumer_type: 'shard' as const,
                        queue_id: streamId,
                        shard_id: shardId,
                        parent_consumer_id: this.instanceId,
                    });
                }
            },
            onShardDisconnected: (streamId, shardId, reason) => {
                if (this.lifecycleProvider?.onConsumerDisconnected) {
                    this.emitLifecycleEvent(this.lifecycleProvider.onConsumerDisconnected, {
                        consumer_id: `${this.instanceId}:${shardId}`,
                        consumer_type: 'shard' as const,
                        queue_id: streamId,
                        shard_id: shardId,
                        parent_consumer_id: this.instanceId,
                        reason,
                    });
                }
            },
            adaptiveStrategy: config.adaptiveStrategy,
            onPoisonPill: (streamId, shardId, checkpoint, recordCount) => {
                logger.warn(`[${this.instanceId}] [${streamId}] [${shardId}] Poison pill detected at checkpoint ${checkpoint}, skipped ${recordCount} records`);
            },
            onCheckpoint: (streamId, shardId, checkpoint, recordCount) => {
                if (this.lifecycleProvider?.onConsumerCheckpoint) {
                    this.emitLifecycleEvent(this.lifecycleProvider.onConsumerCheckpoint, {
                        queue_id: streamId,
                        consumer_id: `${this.instanceId}:${shardId}`,
                        shard_id: shardId,
                        checkpoint,
                        records_since_last: recordCount,
                    });
                }
            },
        });

        // Listen for abort signal
        if (this.signal) {
            this.signal.addEventListener('abort', () => {
                this.shutdown()
                    .catch(err => {
                        logger.error(`Error during abort-triggered shutdown: ${err}`);
                    });
            });
        }

        logger.info(`[${this.instanceId}] KinesisQueue initialized.`);
    }

    /**
     * Set lifecycle configuration for queue events
     */
    setLifecycleConfig(config: QueueLifecycleConfig): void {
        this.lifecycleProvider = config.lifecycleProvider;
        this.lifecycleMode = config.mode || 'async';
    }

    /**
     * Adds a batch of messages to the Kinesis stream
     * @param streamId - The Kinesis stream name
     * @param messages - Array of messages to add to the stream
     */
    async addMessages(streamId: QueueName, messages: BaseMessage<ID>[]): Promise<void> {
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

        const MAX_RETRIES = 3;
        try {
            let records = [...params.Records];
            let lastResult;

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                lastResult = await this.kinesis.send(new PutRecordsCommand({...params, Records: records}));

                if (!lastResult.FailedRecordCount || lastResult.FailedRecordCount === 0) {
                    break; // all succeeded
                }

                // Collect only failed records for retry
                const failedRecords = records.filter((_, i) => lastResult!.Records![i].ErrorCode);
                logger.error(`[${this.instanceId}] [${envStreamId}] PutRecords attempt ${attempt + 1}: ${failedRecords.length} failed records`);
                lastResult.Records?.forEach((record, index) => {
                    if (record.ErrorCode) {
                        logger.error(`[${this.instanceId}] [${envStreamId}] Record ${index} failed: ${record.ErrorCode} - ${record.ErrorMessage}`);
                    }
                });

                records = failedRecords;

                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt)));
                }
            }

            // After retries, if still have failures, throw
            if (lastResult?.FailedRecordCount && lastResult.FailedRecordCount > 0) {
                throw new Error(`Failed to publish ${records.length} records to ${envStreamId} after ${MAX_RETRIES} attempts`);
            }

            logger.info(`[${this.instanceId}] [${envStreamId}] Produced ${messages.length} messages.`);

            // Emit onMessagePublished for each message
            if (this.lifecycleProvider?.onMessagePublished) {
                for (const msg of messages) {
                    this.emitLifecycleEvent(
                        this.lifecycleProvider.onMessagePublished,
                        {
                            queue_id: envStreamId,
                            provider: 'kinesis' as const,
                            message_type: msg.type,
                            message_id: msg.id as string | undefined
                        }
                    );
                }
            }

            // Track produced messages
            if (!this.queueStats.has(envStreamId)) {
                this.queueStats.set(envStreamId, {processed: 0, produced: 0});
            }
            this.queueStats.get(envStreamId)!.produced += messages.length;
        } catch (error) {
            logger.error(`[${this.instanceId}] [${envStreamId}] Error producing tasks:`, error);
            throw error;
        }
    }

    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        logger.info(`Registered queue ${normalizedQueueId}`);
    }

    /**
     * Returns the name of this queue implementation
     */
    name(): string {
        return "kinesis";
    }

    /**
     * Consumes messages from the Kinesis stream
     * @param streamId - The Kinesis stream name (base name)
     * @param processor - Function to process the messages
     */
    async consumeMessagesStream<T = void>(streamId: QueueName, processor: Processor<ID, T>, signal?: AbortSignal): Promise<T> {
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
        // Use provided signal or the constructor signal
        const abortSignal = signal || this.signal;

        if (abortSignal?.aborted) {
            logger.warn(`[${this.instanceId}] [${envStreamId}] Cannot start consumption - already aborted`);
            return undefined as T;
        }

        this.isRunning = true;

        // Emit consumer connected for the main worker
        if (this.lifecycleProvider?.onConsumerConnected) {
            this.emitLifecycleEvent(
                this.lifecycleProvider.onConsumerConnected,
                {
                    consumer_id: this.instanceId,
                    consumer_type: 'worker' as const,
                    queue_id: envStreamId
                }
            );
        }

        // Start the rebalancing process using the new utility
        this.shardRebalancer.startRebalancing(envStreamId, shardLeaser, processor, this.heldShardsByStream)
            .catch(err => {
                logger.error(`[${this.instanceId}] [${envStreamId}] CRITICAL: Rebalancing loop failed unexpectedly:`, err);
            });
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

        // Notify via callback if provided
        if (this.notifier?.onShutdown) {
            try {
                const allStats = Array.from(this.queueStats.entries()).map(([queue, stats]) => ({
                    queueName: queue,
                    messagesProduced: stats.produced,
                    messagesProcessed: stats.processed
                }));

                // Send individual stats for each queue
                await Promise.all(allStats.map(stat =>
                    this.notifier!.onShutdown!(this.instanceId, stat)
                ));
            } catch (err) {
                logger.error(`Failed to send shutdown notification: ${err}`);
            }
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

        // Emit consumer disconnected for all queues this worker was consuming
        if (this.lifecycleProvider?.onConsumerDisconnected) {
            for (const queueId of this.registeredQueues) {
                this.emitLifecycleEvent(
                    this.lifecycleProvider.onConsumerDisconnected,
                    {
                        consumer_id: this.instanceId,
                        consumer_type: 'worker' as const,
                        queue_id: queueId,
                        reason: 'shutdown' as const
                    }
                );
            }
        }

        logger.info(`[${this.instanceId}] Shutdown complete`);
    }

    /**
     * Process a batch of messages from the queue and returns - good for cron based usage
     * @param streamId The stream to process from
     * @param processor Function to process tasks
     * @param limit Maximum number of messages to process
     * @returns void
     */
    async consumeMessagesBatch<T = void>(streamId: QueueName, processor: Processor<ID, T>, limit: number = 10): Promise<T> {
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
                    recordsResponse.Records,
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

    private emitLifecycleEvent<T>(
        callback: ((ctx: T) => void | Promise<void>) | undefined,
        ctx: T
    ): void {
        if (!callback) return;
        try {
            const result = callback(ctx);
            if (result instanceof Promise) {
                result.catch(err => logger.error(`[MQ] Lifecycle callback error: ${err}`));
            }
        } catch (err) {
            logger.error(`[MQ] Lifecycle callback error: ${err}`);
        }
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


    private generatePartitionKey<ID>(message: BaseMessage<ID>): string {
        return message.partition_key
            ?? this.config.defaultPartitionKey?.(message)
            ?? message.type;
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

