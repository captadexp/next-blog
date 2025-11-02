import type {BaseMessage, IMessageQueue, MessageConsumer, QueueName} from "../../core";
import {getEnvironmentQueueName} from "../../core";

/**
 * In-memory implementation of the message queue.
 * This is primarily for development, testing, and environments where external message queues are not available.
 */
export class InMemoryQueue<PAYLOAD = any> implements IMessageQueue<PAYLOAD, string> {
    private queues: Map<QueueName, BaseMessage<PAYLOAD, string>[]> = new Map();
    private isRunning: boolean = false;
    private processingIntervals: Map<QueueName, NodeJS.Timeout> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    constructor() {
        this.setupShutdownHandlers();
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
    async addMessages(queueId: QueueName, messages: BaseMessage<PAYLOAD, string>[]): Promise<void> {
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

        console.log(`Added ${messages.length} messages to in-memory queue ${queueId}`);
    }

    /**
     * Consumes messages from the in-memory queue
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the messages
     */
    async consumeMessagesStream<T = void>(
        queueId: QueueName,
        processor: MessageConsumer<PAYLOAD, string, T>
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
        if (!this.processingIntervals.has(queueId)) {
            const interval = setInterval(async () => {
                if (this.isRunning) {
                    await this.consumeMessagesBatch(queueId, processor);
                }
            }, 1000);
            this.processingIntervals.set(queueId, interval);
        }

        console.log(`Started consuming from in-memory queue ${queueId}`);
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
        processor: MessageConsumer<PAYLOAD, string, T>,
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
                console.log(`Processed ${batch.length} messages from in-memory queue ${queueId}`);
                return result;
            } catch (error) {
                console.error(`Error processing messages from in-memory queue ${queueId}:`, error);
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

        console.log('In-memory queue shut down');
    }

    /**
     * Registers a queue with the message queue
     * @param queueId The queue to register
     */
    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        console.log(`Registered queue ${normalizedQueueId}`);
    }

    /**
     * Handles graceful shutdown by registering signal handlers
     */
    private setupShutdownHandlers() {
        process.on('SIGINT', async () => await this.shutdown());
        process.on('SIGTERM', async () => await this.shutdown());
        process.on('SIGQUIT', async () => await this.shutdown());
    }
}

