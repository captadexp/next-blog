import {CacheProvider} from "memoose-js";
import {BaseMessage, getEnvironmentQueueName, IMessageQueue, MessageConsumer, QueueName} from "@supergrowthai/mq";
import {LockManager, Logger, LogLevel} from "@supergrowthai/utils";
import {PrismaClient} from "@prisma/client/extension";

const logger = new Logger('PrismaQueue', LogLevel.INFO);

// ---- Type utilities ----

/** A Prisma client that is guaranteed to have model delegate K. */
export type ClientWithModel<K extends keyof PrismaClient> =
    Pick<PrismaClient, K>;

/** Extract the entity (row) type from a model delegate. */
type EntityOf<D> =
    D extends { findUnique(args: any): Promise<infer U | null> } ? U :
        D extends { findFirst(args: any): Promise<infer U | null> } ? U :
            D extends { findMany(args?: any): Promise<(infer U)[]> } ? U :
                never;

/** Compile-time guard: model’s entity must be compatible with the shape you require. */
type EnsureModelShape<Delegate, Needed> =
    EntityOf<Delegate> extends Needed ? unknown : never;

// ---- Queue ----

/**
 * PrismaQueue
 * - K: model key on Prisma client (e.g. 'messageQueue', 'jobs', etc.)
 * - Msg: the minimal row shape your lib expects (must extend BaseMessage<TId>)
 */
export class PrismaQueue<
    TId = any,
    K extends keyof PrismaClient = never,
    Msg extends BaseMessage<TId> = BaseMessage<TId>
> implements IMessageQueue<TId> {

    private isRunning = false;
    private processingIntervals = new Map<QueueName, NodeJS.Timeout>();
    private lockManager: LockManager;
    private registeredQueues = new Set<QueueName>();

    constructor(private config: {
        prismaClient: ClientWithModel<K>;
        messageModel: K;
        cacheAdapter: CacheProvider<string>;
        /**
         * Phantom type param that enforces:
         *  - client has model K
         *  - entity type of client[K] extends Msg (which extends BaseMessage<TId>)
         * Do not pass at runtime.
         */
        _shapeCheck?: EnsureModelShape<PrismaClient[K], Msg> & (Msg extends BaseMessage<TId> & {
            _id?: any,
            id: TId
        } ? unknown : never);
    }) {
        this.lockManager = new LockManager(config.cacheAdapter, {prefix: 'prisma-mq-lock:', defaultTimeout: 300});
    }

    get prismaClient(): PrismaClient {
        // runtime cast remains fine; compile-time access goes through `delegate`
        return this.config.prismaClient as unknown as PrismaClient;
    }

    /** String name if you need it for logs */
    get messageTableName(): string {
        return String(this.config.messageModel);
    }

    private get delegate(): PrismaClient[K] {
        return this.config.prismaClient[this.config.messageModel];
    }

    name(): string {
        return "prisma";
    }

    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        logger.info(`Registered queue ${normalizedQueueId}`);
    }

    async addMessages(queueId: QueueName, messages: Msg[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!messages.length) return;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        try {
            await this.delegate.createMany({
                data: messages.map(message => ({
                    ...message,
                    _id: (message as any)._id || this.generateId(),
                    queue_id: queueId,
                    created_at: (message as any).created_at || new Date(),
                    status: 'scheduled'
                })),
                skipDuplicates: true
            });

            logger.info(`Added ${messages.length} messages to Prisma queue ${queueId}`);
        } catch (error) {
            logger.error(`Error adding messages to Prisma queue ${queueId}:`, error);
            throw error;
        }
    }

    async consumeMessagesStream<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<TId, T>,
        signal?: AbortSignal
    ): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);
        if (signal?.aborted) return undefined as T;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        this.isRunning = true;

        if (!this.processingIntervals.has(queueId)) {
            const interval = setInterval(async () => {
                if (this.isRunning && (!signal || !signal.aborted)) {
                    await this.consumeMessagesBatch(queueId, processor);
                }
            }, 5000);

            this.processingIntervals.set(queueId, interval);

            if (signal) {
                signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    this.processingIntervals.delete(queueId);
                });
            }
        }

        logger.info(`Started consuming from Prisma queue ${queueId}`);
        await this.consumeMessagesBatch(queueId, processor);

        return undefined as T;
    }

    async consumeMessagesBatch<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<TId, T>,
        limit: number = 10
    ): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);
        if (!this.isRunning) return undefined as T;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        const lockKey = `queue:${queueId}:${process.env.INSTANCE_ID || 'default'}`;
        const lockAcquired = await this.lockManager.acquire(lockKey, 60);
        if (!lockAcquired) return undefined as T;

        try {
            const messages = await this.delegate.findMany({
                where: {queue_id: queueId, status: 'scheduled'},
                take: limit,
                orderBy: {created_at: 'asc'}
            }) as Msg[];

            if (messages.length === 0) return undefined as T;

            const messageIds = messages.map((m: any) => m._id);

            await this.delegate.updateMany({
                where: {_id: {in: messageIds}},
                data: {
                    status: 'processing',
                    processing_started_at: new Date(),
                    updated_at: new Date()
                }
            });

            try {
                const result = await processor(`prisma:${queueId}`, messages);

                await this.delegate.updateMany({
                    where: {_id: {in: messageIds}},
                    data: {status: 'executed', updated_at: new Date()}
                });

                logger.info(`Processed ${messages.length} messages from Prisma queue ${queueId}`);
                return result;
            } catch (error) {
                logger.error(`Error processing messages from Prisma queue ${queueId}:`, error);

                await this.delegate.updateMany({
                    where: {_id: {in: messageIds}},
                    data: {status: 'failed', updated_at: new Date()}
                });
                throw error;
            }
        } catch (error) {
            logger.error(`Error in batch processing for Prisma queue ${queueId}:`, error);
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

        logger.info('Prisma queue shut down');
    }

    private generateId(): TId {
        return crypto.randomUUID() as TId;
    }
}
