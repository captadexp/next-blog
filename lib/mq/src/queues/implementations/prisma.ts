import {CacheProvider} from "memoose-js";
import {
    BaseMessage,
    getEnvironmentQueueName,
    IMessageQueue,
    IQueueLifecycleProvider,
    MessageConsumer,
    QueueLifecycleConfig,
    QueueName
} from "../../core/index.js";
import {LockManager, Logger, LogLevel} from "@supergrowthai/utils";
import {PrismaClient} from "@prisma/client/extension";

const logger = new Logger('PrismaQueue', LogLevel.INFO);

// Retry configuration
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 30000; // 30 seconds

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
 * Prisma-backed message queue implementation.
 *
 * @description Persists messages to any Prisma model with status tracking.
 * Uses application-level locking for single-instance deployments.
 *
 * @use-case Single-instance production deployments with Prisma ORM
 * @multi-instance NOT SAFE - uses application-level lock, not distributed lock.
 *   For multi-instance, use KinesisQueue with Redis lock provider.
 * @persistence Full - messages stored in database until processed/expired
 * @requires Prisma client with a model matching BaseMessage structure
 *
 * @features
 * - execute_at scheduling: messages only consumed when execute_at <= now
 * - expires_at expiration: messages marked 'expired' if past expiry
 * - Retry logic: 3 attempts with 30s backoff on failure
 *
 * @typeParam TId - The ID type (string, number, etc.)
 * @typeParam K - The Prisma model key (e.g. 'messageQueue')
 * @typeParam Msg - The message type extending BaseMessage<TId>
 *
 * @example
 * ```typescript
 * const queue = new PrismaQueue({
 *   prismaClient: prisma,
 *   messageModel: 'messageQueue',
 *   cacheAdapter: redisAdapter
 * });
 * ```
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
    private lifecycleProvider?: IQueueLifecycleProvider;
    private lifecycleMode: 'sync' | 'async' = 'async';
    private consumerId: string;

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
        this.consumerId = `prisma-${process.pid}-${Date.now()}`;
    }

    /**
     * Set lifecycle configuration for queue events
     */
    setLifecycleConfig(config: QueueLifecycleConfig): void {
        this.lifecycleProvider = config.lifecycleProvider;
        this.lifecycleMode = config.mode || 'async';
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

            // Emit onMessagePublished for each message
            if (this.lifecycleProvider?.onMessagePublished) {
                for (const msg of messages) {
                    this.emitLifecycleEvent(
                        this.lifecycleProvider.onMessagePublished,
                        {
                            queue_id: queueId,
                            provider: 'prisma' as const,
                            message_type: msg.type,
                            message_id: String(msg.id)
                        }
                    );
                }
            }

            logger.info(`Added ${messages.length} messages to Prisma queue ${queueId}`);
        } catch (error) {
            logger.error(`Error adding messages to Prisma queue ${queueId}:`, error);
            throw error;
        }
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
            const now = new Date();

            // Mark expired messages before fetching
            await this.delegate.updateMany({
                where: {
                    queue_id: queueId,
                    status: 'scheduled',
                    expires_at: {lt: now, not: null}
                },
                data: {status: 'expired', updated_at: now}
            });

            // Fetch messages that are ready to execute (execute_at <= now) and not expired
            const messages = await this.delegate.findMany({
                where: {
                    queue_id: queueId,
                    status: 'scheduled',
                    execute_at: {lte: now},
                    OR: [
                        {expires_at: null},
                        {expires_at: {gt: now}}
                    ]
                },
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
                // Emit onMessageConsumed for each message
                if (this.lifecycleProvider?.onMessageConsumed) {
                    const nowMs = Date.now();
                    for (const msg of messages) {
                        const age = nowMs - ((msg as any).created_at?.getTime() || nowMs);
                        this.emitLifecycleEvent(
                            this.lifecycleProvider.onMessageConsumed,
                            {
                                queue_id: queueId,
                                provider: 'prisma' as const,
                                message_type: msg.type,
                                message_id: String(msg.id),
                                age_ms: age
                            }
                        );
                    }
                }

                const result = await processor(`prisma:${queueId}`, messages);

                await this.delegate.updateMany({
                    where: {_id: {in: messageIds}},
                    data: {status: 'executed', updated_at: new Date()}
                });

                logger.info(`Processed ${messages.length} messages from Prisma queue ${queueId}`);
                return result;
            } catch (error) {
                logger.error(`Error processing messages from Prisma queue ${queueId}:`, error);

                // Implement retry logic for failed messages
                for (const message of messages) {
                    const currentRetries = (message as any).retries || 0;
                    const msgId = (message as any)._id;

                    if (currentRetries < DEFAULT_MAX_RETRIES) {
                        const retryAfter = (message as any).retry_after || DEFAULT_RETRY_AFTER_MS;
                        await this.delegate.update({
                            where: {_id: msgId},
                            data: {
                                status: 'scheduled',
                                execute_at: new Date(Date.now() + retryAfter),
                                updated_at: new Date(),
                                retries: currentRetries + 1
                            }
                        });
                        logger.info(`Message ${msgId} scheduled for retry ${currentRetries + 1}/${DEFAULT_MAX_RETRIES}`);
                    } else {
                        await this.delegate.update({
                            where: {_id: msgId},
                            data: {status: 'failed', updated_at: new Date()}
                        });
                        logger.warn(`Message ${msgId} exceeded max retries, marked as failed`);
                    }
                }
                throw error;
            }
        } catch (error) {
            logger.error(`Error in batch processing for Prisma queue ${queueId}:`, error);
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

        logger.info('Prisma queue shut down');
    }

    private generateId(): TId {
        return crypto.randomUUID() as TId;
    }
}
