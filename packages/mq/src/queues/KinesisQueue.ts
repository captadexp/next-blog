import {
    GetRecordsCommand,
    GetShardIteratorCommand,
    KinesisClient,
    PutRecordsCommand,
    ShardIteratorType
} from '@aws-sdk/client-kinesis';
import * as NodeUtils from 'node:util';
import ShardLeaser from '../shard-leaser/index.js';
import shardLockProvider from "../shard-lock-provider/index.js";
import {IMessageQueue, Processor} from './IMessageQueue.js';
import {EJSON} from "bson";
import {Logger, LogLevel} from "@supergrowthai/utils";
import {getEnvironmentQueueName} from "../utils.js";
import {QueueName} from '../types.js';
import {ShardManager} from './kinesis/shard-manager.js';
import {TaskProcessor} from './kinesis/task-processor.js';
import {ShardRebalancer} from './kinesis/shard-rebalancer.js';
import {LOCK_TTL_MS, MAX_SHARDS_PER_BATCH} from './kinesis/constants.js';
import {BaseTask, ProcessedTaskResult} from "../adapters/index.js";

const logger = new Logger('KinesisQueue', LogLevel.INFO)

interface KinesisConfig {
    instanceId?: string;
}

/**
 * Kinesis implementation of the message queue
 */
class KinesisQueue implements IMessageQueue {
    private readonly kinesis: KinesisClient;
    private textEncoder: NodeUtils.TextEncoder;
    private readonly textDecoder: NodeUtils.TextDecoder;
    private readonly instanceId: string;
    private shardLeasers: Map<QueueName, ShardLeaser> = new Map();
    private isRunning = false;
    private heldShardsByStream: Map<QueueName, Set<string>> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    // Utility instances
    private shardManager: ShardManager;
    private taskProcessor: TaskProcessor;
    private shardRebalancer: ShardRebalancer;

    // Stats tracking
    private queueStats = new Map<QueueName, {
        processed: number;
        produced: number;
    }>();

    constructor(config: KinesisConfig = {}) {
        this.kinesis = new KinesisClient({
            region: process.env.AWS_REGION
        });
        this.textEncoder = new NodeUtils.TextEncoder();
        this.textDecoder = new NodeUtils.TextDecoder('utf-8');
        this.instanceId = config?.instanceId || process.env.INSTANCE_ID || `instance-${Date.now()}`;

        // Initialize utilities
        this.shardManager = new ShardManager(this.kinesis, this.instanceId);
        this.taskProcessor = new TaskProcessor({textDecoder: this.textDecoder, instanceId: this.instanceId});
        this.shardRebalancer = new ShardRebalancer({
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
     * Adds a batch of tasks to the Kinesis stream
     * @param streamId - The Kinesis stream name
     * @param tasks - Array of tasks to add to the stream
     */
    async addTasks<T>(streamId: QueueName, tasks: BaseTask<T>[]): Promise<void> {
        if (!streamId) {
            throw new Error('streamId is required');
        }
        if (!Array.isArray(tasks)) {
            throw new Error('tasks must be an array');
        }
        if (!tasks.length) {
            throw new Error('Empty tasks array provided - this should not happen');
        }

        const envStreamId = getEnvironmentQueueName(streamId);

        const params = {
            StreamName: envStreamId as unknown as string,
            Records: tasks
                .map((task) => ({
                    PartitionKey: this.generatePartitionKey(task),
                    Data: this.textEncoder.encode(EJSON.stringify(task)),
                })),
        };

        try {
            const result = await this.kinesis.send(new PutRecordsCommand(params));
            logger.info(`[${this.instanceId}] [${envStreamId}] Produced ${tasks.length} tasks. Shards involved: ${result.Records?.map(record => record.ShardId).join(', ')}`);

            // Track produced tasks
            if (!this.queueStats.has(envStreamId)) {
                this.queueStats.set(envStreamId, {processed: 0, produced: 0});
            }
            this.queueStats.get(envStreamId)!.produced += tasks.length;

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
     * Consumes tasks from the Kinesis stream
     * @param streamId - The Kinesis stream name (base name)
     * @param processor - Function to process the tasks
     */
    async consumeTasks(streamId: QueueName, processor: Processor): Promise<void> {
        const envStreamId = getEnvironmentQueueName(streamId); // Use prefixed name
        logger.info(`[${this.instanceId}] Starting task consumption for stream: ${envStreamId}`);

        // Create a new shard leaser for this stream if it doesn't exist
        if (!this.shardLeasers.has(envStreamId)) {
            logger.info(`[${this.instanceId}] [${envStreamId}] Creating new ShardLeaser.`);
            this.shardLeasers.set(
                envStreamId,
                // Use the lock provider instance, pass TTL
                new ShardLeaser(shardLockProvider, envStreamId, this.instanceId, LOCK_TTL_MS)
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
    }

    /**
     * Process a batch of tasks from the queue
     * @param streamId The stream to process from
     * @param processor Function to process tasks
     * @param limit Maximum number of tasks to process
     * @returns ProcessedTaskResult
     */
    async processBatch(streamId: QueueName, processor: Processor, limit: number = 10): Promise<ProcessedTaskResult> {
        streamId = getEnvironmentQueueName(streamId);
        try {
            const result: ProcessedTaskResult = {
                failedTasks: [],
                newTasks: [],
                successTasks: []
            };

            // List all shards using the utility
            const availableShards = await this.shardManager.listShards(streamId);
            if (!availableShards.length) {
                return result;
            }

            // Process up to 'limit' records across all shards (max per constant)
            let processedCount = 0;
            for (const shardId of availableShards.slice(0, MAX_SHARDS_PER_BATCH)) {
                if (processedCount >= limit) break;

                // Create a shardLeaser if it doesn't exist
                if (!this.shardLeasers.has(streamId)) {
                    this.shardLeasers.set(
                        streamId,
                        new ShardLeaser(shardLockProvider, streamId, this.instanceId)
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
                const batchResult = await this.taskProcessor.processBatch(
                    recordsResponse.Records as any,//fixme typed hacked here
                    processor,
                    `kinesis:${streamId}:${shardId}`
                );

                // Aggregate results
                result.failedTasks = [...result.failedTasks, ...batchResult.failedTasks];
                result.successTasks = [...result.successTasks, ...batchResult.successTasks];
                result.newTasks = [...result.newTasks, ...batchResult.newTasks];
                processedCount += batchResult.successTasks.length + batchResult.failedTasks.length;

                // Update checkpoint with last sequence number
                const lastSequence = recordsResponse.Records[recordsResponse.Records.length - 1].SequenceNumber;
                if (lastSequence) {
                    await shardLeaser.setCheckpoint(shardId, lastSequence);
                }
            }

            return result;
        } catch (error) {
            logger.error(`Error processing batch from Kinesis stream ${streamId}:`, error);
            return {
                failedTasks: [],
                newTasks: [],
                successTasks: []
            };
        }
    }

    /**
     * Stops consuming tasks and actively releases all tracked shard locks.
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
                statsMessage += `No tasks processed during this session\n`;
            }
        } else {
            statsMessage += `No tasks processed during this session\n`;
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


    private generatePartitionKey<T>(task: BaseTask<T>): string {
        return task.type;
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

export default KinesisQueue;