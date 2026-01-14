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

/**
 * MongoDB implementation of message queue that manages its own database operations
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
            const messages = await collection.find({
                queue_id: queueId,
                status: 'scheduled',
            }).limit(limit).toArray();

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
                    const now = Date.now();
                    for (const msg of messagesForProcessor) {
                        const age = now - (msg.created_at?.getTime() || now);
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

                await collection.updateMany(
                    {_id: {$in: messageIds}},
                    {
                        $set: {status: 'failed', updated_at: new Date()}
                    }
                );
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

