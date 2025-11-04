import {BaseMessage, getEnvironmentQueueName, IMessageQueue, MessageConsumer, QueueName} from "../../core";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('ImmediateQueue', LogLevel.INFO);

/**
 * Immediate implementation of a message queue that processes messages synchronously
 * when they are added without waiting for polling intervals
 */
export class ImmediateQueue<ID> implements IMessageQueue<ID> {
    private isRunning: boolean = false;
    private processors: Map<QueueName, MessageConsumer<ID, unknown>> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    constructor() {
        this.isRunning = true;
    }

    name(): string {
        return "immediate";
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

        logger.info(`Added ${messages.length} messages to immediate queue ${queueId}`);

        if (this.processors.has(queueId)) {
            const processor = this.processors.get(queueId)!;
            await this.consumeMessagesBatch(queueId, processor, messages.length, messages);
        } else {
            logger.warn(`No processor registered for queue ${queueId}, messages discarded in immediate mode`);
        }
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

        // Store the processor for this queue
        this.processors.set(queueId, processor);
        logger.info(`Registered processor for immediate queue ${queueId}`);

        // Clean up on abort
        if (signal) {
            signal.addEventListener('abort', () => {
                this.processors.delete(queueId);
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

            const result = await processor(`immediate:${queueId}`, messages);

            logger.info(`Processed ${messages.length} messages from immediate queue ${queueId}`);
            return result;
        } catch (error) {
            logger.error(`Error processing messages from immediate queue ${queueId}:`, error);
            throw error;
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

