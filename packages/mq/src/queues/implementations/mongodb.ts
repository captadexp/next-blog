import {IMessageQueue} from "../../core/interfaces/message-queue.js";
import {BaseMessage, MessageConsumer} from "../../adapters/index.js";
import {getEnvironmentQueueName} from "../../core/utils.js";
import {QueueName} from "../../core/types.js";
import {CacheProvider} from "memoose-js";
import {LockManager} from "@supergrowthai/utils";
import {ObjectId} from "bson";

/**
 * MongoDB implementation of message queue that manages its own database operations
 */
export class MongoDBQueue<PAYLOAD = any> implements IMessageQueue<PAYLOAD, ObjectId> {
    private isRunning: boolean = false;
    private processingIntervals: Map<QueueName, NodeJS.Timeout> = new Map();
    private lockManager: LockManager;
    private registeredQueues: Set<QueueName> = new Set();

    constructor(private cacheAdapter: CacheProvider<any>, private mongoCollection: any) {
        this.lockManager = new LockManager(cacheAdapter, {
            prefix: 'mq-lock:',
            defaultTimeout: 300 // 5 minutes lock by default
        });
        this.setupShutdownHandlers();
    }

    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        console.log(`Registered queue ${normalizedQueueId}`);
    }

    name(): string {
        return "mongodb";
    }

    async addMessages(queueId: QueueName, messages: BaseMessage<PAYLOAD, ObjectId>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!messages.length) return;

        try {
            const messagesToInsert = messages.map(message => ({
                ...message,
                queue_id: queueId,
                _id: message._id || new ObjectId(),
                status: message.status || "scheduled",
                created_at: message.created_at || new Date()
            }));

            await this.mongoCollection.insertMany(messagesToInsert);
            console.log(`Added ${messages.length} messages to MongoDB queue ${queueId}`);
        } catch (error) {
            console.error(`Error adding messages to MongoDB queue ${queueId}:`, error);
            throw error;
        }
    }

    async consumeMessagesStream<T = void>(queueId: QueueName, processor: MessageConsumer<PAYLOAD, ObjectId, T>): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);
        this.isRunning = true;

        if (!this.processingIntervals.has(queueId)) {
            const interval = setInterval(async () => {
                if (this.isRunning) {
                    await this.consumeMessagesBatch(queueId, processor);
                }
            }, 5000);

            this.processingIntervals.set(queueId, interval);
        }

        console.log(`Started consuming from MongoDB queue ${queueId}`);
        await this.consumeMessagesBatch(queueId, processor);

        return undefined as T
    }

    async consumeMessagesBatch<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<PAYLOAD, ObjectId, T>,
        limit: number = 10
    ): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);
        if (!this.isRunning) return undefined as T;

        const lockKey = `queue:${queueId}:${process.env.INSTANCE_ID || 'default'}`;
        const lockAcquired = await this.lockManager.acquire(lockKey, 60);
        if (!lockAcquired) return undefined as T;

        try {
            const messages = await this.mongoCollection.find({
                queue_id: queueId,
                status: 'scheduled',
                execute_at: {$lte: new Date()}
            }).limit(limit).toArray();

            if (messages.length === 0) {
                return undefined as T;
            }

            const messageIds = messages.map((message: BaseMessage<PAYLOAD, ObjectId>) => message._id);
            await this.mongoCollection.updateMany(
                {_id: {$in: messageIds}},
                {$set: {status: 'processing', processing_started_at: new Date(), updated_at: new Date()}}
            );

            try {
                const result = await processor(`mongodb:${queueId}`, messages);

                await this.mongoCollection.updateMany(
                    {_id: {$in: messageIds}},
                    {$set: {status: 'executed', updated_at: new Date()}}
                );

                console.log(`Processed ${messages.length} messages from MongoDB queue ${queueId}`);
                return result;
            } catch (error) {
                console.error(`Error processing messages from MongoDB queue ${queueId}:`, error);

                await this.mongoCollection.updateMany(
                    {_id: {$in: messageIds}},
                    {
                        $set: {status: 'failed', updated_at: new Date()},
                        $inc: {retries: 1}
                    }
                );
                throw error;
            }
        } catch (error) {
            console.error(`Error in batch processing for MongoDB queue ${queueId}:`, error);
            throw error;
        } finally {
            await this.lockManager.release(lockKey);
        }
    }

    async shutdown(): Promise<void> {
        this.isRunning = false;

        for (const [queueId, interval] of this.processingIntervals.entries()) {
            clearInterval(interval);
            this.processingIntervals.delete(queueId);
        }

        console.log('MongoDB queue shut down');
    }

    private setupShutdownHandlers() {
        // Standard process handlers for graceful shutdown
        process.on('SIGINT', async () => await this.shutdown());
        process.on('SIGTERM', async () => await this.shutdown());
        process.on('SIGQUIT', async () => await this.shutdown());
    }
}

