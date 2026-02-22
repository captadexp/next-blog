import type {
    BaseMessage,
    IMessageQueue,
    IQueueLifecycleProvider,
    MessageConsumer,
    QueueLifecycleConfig
} from "../../core";
import {getEnvironmentQueueName, QueueName} from "../../core";
import {CacheProvider} from "memoose-js";
import {LockManager, Logger, LogLevel} from "@supergrowthai/utils";
import {ObjectId} from "bson";
import {Collection} from "mongodb";

const logger = new Logger('MongoDBQueue', LogLevel.INFO);

// Retry configuration
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 30000; // 30 seconds

/**
 * MongoDB-backed message queue implementation.
 *
 * @description Persists messages to MongoDB collection with status tracking.
 * Uses application-level locking for single-instance deployments.
 *
 * @use-case Single-instance production deployments
 * @multi-instance NOT SAFE - uses application-level lock, not distributed lock.
 *   For multi-instance, use KinesisQueue with Redis lock provider.
 * @persistence Full - messages stored in MongoDB until processed/expired
 * @requires MongoDB connection via abstract `collection` getter
 *
 * @features
 * - execute_at scheduling: messages only consumed when execute_at <= now
 * - expires_at expiration: messages marked 'expired' if past expiry
 * - Retry logic: 3 attempts with 30s backoff on failure
 *
 * @example
 * ```typescript
 * class MyMongoQueue extends MongoDBQueue {
 *   get collection() { return db.collection('messages'); }
 * }
 * const queue = new MyMongoQueue(cacheAdapter);
 * ```
 */
export abstract class MongoDBQueue implements IMessageQueue<ObjectId> {
    private isRunning: boolean = false;
    private processingIntervals: Map<QueueName, NodeJS.Timeout> = new Map();
    private lockManager: LockManager;
    private registeredQueues: Set<QueueName> = new Set();
    private lifecycleProvider?: IQueueLifecycleProvider;
    private lifecycleMode: 'sync' | 'async' = 'async';
    private consumerId: string;

    protected constructor(private cacheAdapter: CacheProvider<string>) {
        this.lockManager = new LockManager(cacheAdapter, {
            prefix: 'mq-lock:',
            defaultTimeout: 300 // 5 minutes lock by default
        });
        this.consumerId = `mongodb-${process.pid}-${Date.now()}`;
        logger.warn(
            `MongoDBQueue: when used with TQ force_store tasks, the MQ collection must be ` +
            `separate from the Task DB collection to avoid duplicate _id conflicts.`
        );
    }

    /**
     * Set lifecycle configuration for queue events
     */
    setLifecycleConfig(config: QueueLifecycleConfig): void {
        this.lifecycleProvider = config.lifecycleProvider;
        this.lifecycleMode = config.mode || 'async';
    }

    async addMessages(queueId: QueueName, messages: BaseMessage<ObjectId>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);

        if (!messages.length) return;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        const collection = await this.collection;

        try {
            const messagesToInsert = messages
                .map(message => {
                    const {id, ...messageData} = message;
                    return {
                        ...messageData,
                        queue_id: queueId,
                        _id: id || new ObjectId(),
                        created_at: message.created_at || new Date()
                    };
                });

            await collection.insertMany(messagesToInsert);

            // Emit onMessagePublished for each message
            if (this.lifecycleProvider?.onMessagePublished) {
                for (const msg of messages) {
                    this.emitLifecycleEvent(
                        this.lifecycleProvider.onMessagePublished,
                        {
                            queue_id: queueId,
                            provider: 'mongodb' as const,
                            message_type: msg.type,
                            message_id: msg.id?.toString()
                        }
                    );
                }
            }

            logger.info(`Added ${messages.length} messages to MongoDB queue ${queueId}`);
        } catch (error) {
            logger.error(`Error adding messages to MongoDB queue ${queueId}:`, error);
            throw error;
        }
    }

    abstract get collection(): Promise<Collection<Omit<BaseMessage<ObjectId>, 'id'> & { _id?: ObjectId }>>;

    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        logger.info(`Registered queue ${normalizedQueueId}`);
    }

    name(): string {
        return "mongodb";
    }

    async consumeMessagesStream<T = void>(queueId: QueueName, processor: MessageConsumer<ObjectId, T>, signal?: AbortSignal): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);

        if (signal?.aborted) {
            return undefined as T;
        }

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        this.isRunning = true;

        if (!this.processingIntervals.has(queueId)) {
            // Emit consumer connected
            if (this.lifecycleProvider?.onConsumerConnected) {
                this.emitLifecycleEvent(
                    this.lifecycleProvider.onConsumerConnected,
                    {
                        consumer_id: this.consumerId,
                        consumer_type: 'worker' as const,
                        queue_id: queueId
                    }
                );
            }

            const interval = setInterval(async () => {
                if (this.isRunning && (!signal || !signal.aborted)) {
                    await this.consumeMessagesBatch(queueId, processor);
                }
            }, 5000);

            this.processingIntervals.set(queueId, interval);

            // Clean up on abort
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    this.processingIntervals.delete(queueId);

                    // Emit consumer disconnected
                    if (this.lifecycleProvider?.onConsumerDisconnected) {
                        this.emitLifecycleEvent(
                            this.lifecycleProvider.onConsumerDisconnected,
                            {
                                consumer_id: this.consumerId,
                                consumer_type: 'worker' as const,
                                queue_id: queueId,
                                reason: 'shutdown' as const
                            }
                        );
                    }
                });
            }
        }

        logger.info(`Started consuming from MongoDB queue ${queueId}`);
        await this.consumeMessagesBatch(queueId, processor);

        return undefined as T
    }

    async consumeMessagesBatch<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<ObjectId, T>,
        limit: number = 10
    ): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);

        if (!this.isRunning) return undefined as T;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        const collection = await this.collection;

        //fixme if we have 2 runners and instance id is same, they might query exactly at the same time, causing double processing
        const lockKey = `queue:${queueId}:${process.env.INSTANCE_ID || 'default'}`;
        const lockAcquired = await this.lockManager.acquire(lockKey, 60);
        if (!lockAcquired) return undefined as T;

        try {
            const now = new Date();

            // Mark expired messages before fetching
            await collection.updateMany(
                {
                    queue_id: queueId,
                    status: 'scheduled',
                    expires_at: {$lt: now, $exists: true}
                } as any,
                {$set: {status: 'expired', updated_at: now}}
            );

            // Fetch messages that are ready to execute (execute_at <= now) and not expired
            const messages = await collection.find({
                queue_id: queueId,
                status: 'scheduled',
                execute_at: {$lte: now},
                $or: [
                    {expires_at: {$exists: false}},
                    {expires_at: {$gt: now}}
                ]
            } as any).limit(limit).toArray();

            if (messages.length === 0) {
                return undefined as T;
            }

            const messageIds = messages.map((message) => message._id);
            await collection.updateMany(
                {_id: {$in: messageIds}},
                {$set: {status: 'processing', processing_started_at: new Date(), updated_at: new Date()}}
            );

            try {
                const messagesForProcessor = messages
                    .map(message => {
                        const {_id, ...messageData} = message;
                        return {
                            ...messageData,
                            id: _id
                        };
                    });

                // Emit onMessageConsumed for each message
                if (this.lifecycleProvider?.onMessageConsumed) {
                    const nowMs = Date.now();
                    for (const msg of messagesForProcessor) {
                        const age = nowMs - (msg.created_at?.getTime() || nowMs);
                        this.emitLifecycleEvent(
                            this.lifecycleProvider.onMessageConsumed,
                            {
                                queue_id: queueId,
                                provider: 'mongodb' as const,
                                message_type: msg.type,
                                message_id: msg.id?.toString(),
                                age_ms: age
                            }
                        );
                    }
                }

                const result = await processor(`mongodb:${queueId}`, messagesForProcessor);

                await collection.updateMany(
                    {_id: {$in: messageIds}},
                    {$set: {status: 'executed', updated_at: new Date()}}
                );

                logger.info(`Processed ${messages.length} messages from MongoDB queue ${queueId}`);
                return result;
            } catch (error) {
                logger.error(`Error processing messages from MongoDB queue ${queueId}:`, error);

                // Implement retry logic for failed messages
                for (const message of messages) {
                    const currentRetries = (message as any).retries || 0;

                    if (currentRetries < DEFAULT_MAX_RETRIES) {
                        const retryAfter = (message as any).retry_after || DEFAULT_RETRY_AFTER_MS;
                        await collection.updateOne(
                            {_id: message._id},
                            {
                                $set: {
                                    status: 'scheduled',
                                    execute_at: new Date(Date.now() + retryAfter),
                                    updated_at: new Date()
                                },
                                $inc: {retries: 1}
                            }
                        );
                        logger.info(`Message ${message._id} scheduled for retry ${currentRetries + 1}/${DEFAULT_MAX_RETRIES}`);
                    } else {
                        await collection.updateOne(
                            {_id: message._id},
                            {$set: {status: 'failed', updated_at: new Date()}}
                        );
                        logger.warn(`Message ${message._id} exceeded max retries, marked as failed`);
                    }
                }
                throw error;
            }
        } catch (error) {
            logger.error(`Error in batch processing for MongoDB queue ${queueId}:`, error);
            throw error;
        } finally {
            await this.lockManager.release(lockKey);
        }
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

    async shutdown(): Promise<void> {
        this.isRunning = false;

        for (const [queueId, interval] of this.processingIntervals.entries()) {
            clearInterval(interval);
            this.processingIntervals.delete(queueId);
        }

        logger.info('MongoDB queue shut down');
    }
}

