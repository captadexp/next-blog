import type {BaseMessage, IMessageQueue, MessageConsumer, QueueName} from "../../core";
import {getEnvironmentQueueName} from "../../core";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('InMemoryQueue', LogLevel.INFO);

/**
 * In-memory implementation of the message queue.
 * This is primarily for development, testing, and environments where external message queues are not available.
 */
export class InMemoryQueue implements IMessageQueue<string> {
    private queues: Map<QueueName, BaseMessage<string>[]> = new Map();
    private isRunning: boolean = false;
    private processingIntervals: Map<QueueName, NodeJS.Timeout> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    constructor() {
    }

    /**
     * Returns the name of this queue implementation
     */
    name(): string {
        return "memory";
    }

    /**
     * Adds messages to the in-memory queue
     * @param queueId - The identifier for the queue
     * @param messages - Array of messages to add to the queue
     */
    async addMessages(queueId: QueueName, messages: BaseMessage<string>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!messages.length) {
            return;
        }

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        if (!this.queues.has(queueId)) {
            this.queues.set(queueId, []);
        }

        const queue = this.queues.get(queueId)!;
        queue.push(...messages);

        logger.info(`Added ${messages.length} messages to in-memory queue ${queueId}`);
    }

    /**
     * Consumes messages from the in-memory queue
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the messages
     * @param signal - Optional AbortSignal to stop consumption
     */
    async consumeMessagesStream<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<string, T>,
        signal?: AbortSignal
    ): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);
        this.isRunning = true;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        // Create the queue if it doesn't exist
        if (!this.queues.has(queueId)) {
            this.queues.set(queueId, []);
        }

        // Set up a polling interval for this queue if not already set
        if (this.processingIntervals.has(queueId)) {
            logger.warn(`Queue ${queueId} already has a consumer registered. Multiple consumers for the same queue may cause unexpected behavior.`);
        } else {
            const interval = setInterval(async () => {
                if (this.isRunning && (!signal || !signal.aborted)) {
                    await this.consumeMessagesBatch(queueId, processor);
                }
            }, 1000);
            this.processingIntervals.set(queueId, interval);

            // Clean up on abort
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    this.processingIntervals.delete(queueId);
                });
            }
        }

        logger.info(`Started consuming from in-memory queue ${queueId}`);
        return undefined as T;
    }

    /**
     * Process a batch of messages from the queue
     * @param queueId The queue to process from
     * @param processor Function to process tasks
     * @param limit Maximum number of messages to process
     * @returns void
     */
    async consumeMessagesBatch<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<string, T>,
        limit: number = 10
    ): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        if (!this.queues.has(queueId)) {
            this.queues.set(queueId, []);
            return undefined as T;
        }

        const queue = this.queues.get(queueId)!;
        if (queue.length === 0) return undefined as T;

        // Take a batch of messages (up to limit)
        const batch = queue.splice(0, Math.min(limit, queue.length));

        if (batch.length > 0) {
            try {
                // Process the batch and return result
                const result = await processor(`memory:${queueId}`, batch);
                logger.info(`Processed ${batch.length} messages from in-memory queue ${queueId}`);
                return result;
            } catch (error) {
                logger.error(`Error processing messages from in-memory queue ${queueId}:`, error);
                // Put the failed messages back in the queue
                queue.unshift(...batch);
                throw error;
            }
        }
        return undefined as T;
    }

    /**
     * Stops consuming messages and cleans up resources
     */
    async shutdown(): Promise<void> {
        this.isRunning = false;

        for (const [queueId, interval] of this.processingIntervals.entries()) {
            clearInterval(interval);
            this.processingIntervals.delete(queueId);
        }

        logger.info('In-memory queue shut down');
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

