import {
    BaseMessage,
    getEnvironmentQueueName,
    IMessageQueue,
    IQueueLifecycleProvider,
    MessageConsumer,
    QueueLifecycleConfig,
    QueueName
} from "../../core";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('ImmediateQueue', LogLevel.INFO);

/**
 * Immediate/synchronous message queue implementation.
 *
 * @description Processes messages immediately when added, without polling.
 * Messages are processed synchronously in the addMessages call.
 *
 * @use-case Development, testing, and scenarios requiring immediate processing
 * @multi-instance NOT SAFE - processors stored in process memory
 * @persistence None - messages processed immediately, never stored
 * @requires No external dependencies
 *
 * @important A processor MUST be registered via consumeMessagesStream BEFORE
 * calling addMessages, otherwise an error will be thrown.
 *
 * @example
 * ```typescript
 * const queue = new ImmediateQueue();
 * queue.register('my-queue');
 * await queue.consumeMessagesStream('my-queue', async (id, msgs) => { ... });
 * await queue.addMessages('my-queue', [message]); // Processed immediately
 * ```
 */
export class ImmediateQueue<ID> implements IMessageQueue<ID> {
    private isRunning: boolean = false;
    private processors: Map<QueueName, MessageConsumer<ID, unknown>> = new Map();
    private registeredQueues: Set<QueueName> = new Set();
    private lifecycleProvider?: IQueueLifecycleProvider;
    private lifecycleMode: 'sync' | 'async' = 'async';
    private consumerId: string;

    constructor() {
        this.isRunning = true;
        this.consumerId = `immediate-${process.pid}-${Date.now()}`;
    }

    /**
     * Set lifecycle configuration for queue events
     */
    setLifecycleConfig(config: QueueLifecycleConfig): void {
        this.lifecycleProvider = config.lifecycleProvider;
        this.lifecycleMode = config.mode || 'async';
    }

    /**
     * Adds and immediately processes messages
     * @param queueId - The identifier for the queue
     * @param messages - Array of messages to add and process immediately
     */
    async addMessages(queueId: QueueName, messages: BaseMessage<ID>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!messages.length) return;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        // Emit onMessagePublished for each message
        if (this.lifecycleProvider?.onMessagePublished) {
            for (const msg of messages) {
                this.emitLifecycleEvent(
                    this.lifecycleProvider.onMessagePublished,
                    {
                        queue_id: queueId,
                        provider: 'immediate' as const,
                        message_type: msg.type,
                        message_id: msg.id as string | undefined
                    }
                );
            }
        }

        logger.info(`Added ${messages.length} messages to immediate queue ${queueId}`);

        if (this.processors.has(queueId)) {
            const processor = this.processors.get(queueId)!;
            await this.consumeMessagesBatch(queueId, processor, messages.length, messages);
        } else {
            throw new Error(
                `No processor registered for queue ${queueId}. ` +
                `In ImmediateQueue, you must call consumeMessagesStream() before addMessages().`
            );
        }
    }

    name(): string {
        return "immediate";
    }

    /**
     * Registers a processor for the queue
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the messages
     * @param signal - Optional AbortSignal to stop consumption
     */
    async consumeMessagesStream<T = void>(queueId: QueueName, processor: MessageConsumer<ID, T>, signal?: AbortSignal): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);

        if (!this.isRunning || signal?.aborted) {
            logger.warn(`Cannot register processor for queue ${queueId}: queue is shutting down or aborted`);
            return undefined as T;
        }

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

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

        // Store the processor for this queue
        this.processors.set(queueId, processor);
        logger.info(`Registered processor for immediate queue ${queueId}`);

        // Clean up on abort
        if (signal) {
            signal.addEventListener('abort', () => {
                this.processors.delete(queueId);

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

        return undefined as T;
    }

    /**
     * Process a batch of messages immediately
     * @param queueId The queue identifier
     * @param processor Function to process tasks
     * @param limit Maximum number of messages to process
     * @param messagesOverride Optional messages to process instead of fetching from storage
     */
    async consumeMessagesBatch<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<ID, T>,
        limit: number = 10,
        messagesOverride?: BaseMessage<ID>[]
    ): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);
        if (!this.isRunning) return undefined as T;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        try {
            const messages = messagesOverride || [];
            if (messages.length === 0) return undefined as T;

            // Emit onMessageConsumed for each message
            if (this.lifecycleProvider?.onMessageConsumed) {
                const now = Date.now();
                for (const msg of messages) {
                    const age = now - (msg.created_at?.getTime() || now);
                    this.emitLifecycleEvent(
                        this.lifecycleProvider.onMessageConsumed,
                        {
                            queue_id: queueId,
                            provider: 'immediate' as const,
                            message_type: msg.type,
                            message_id: msg.id as string | undefined,
                            age_ms: age
                        }
                    );
                }
            }

            const result = await processor(`immediate:${queueId}`, messages);

            logger.info(`Processed ${messages.length} messages from immediate queue ${queueId}`);
            return result;
        } catch (error) {
            logger.error(`Error processing messages from immediate queue ${queueId}:`, error);
            throw error;
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

    /**
     * Stops accepting and processing tasks
     */
    async shutdown(): Promise<void> {
        this.isRunning = false;
        this.processors.clear();
        logger.info('Immediate queue shut down');
    }

    /**
     * Registers a queue with the message queue
     * @param queueId The queue to register
     */
    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        logger.info(`Registered queue ${normalizedQueueId}`);
    }
}

