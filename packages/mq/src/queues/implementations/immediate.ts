import {BaseMessage, getEnvironmentQueueName, IMessageQueue, MessageConsumer, QueueName} from "../../core";

/**
 * Immediate implementation of a message queue that processes messages synchronously
 * when they are added without waiting for polling intervals
 */
export class ImmediateQueue<PAYLOAD, ID> implements IMessageQueue<PAYLOAD, ID> {
    private isRunning: boolean = false;
    private processors: Map<QueueName, MessageConsumer<PAYLOAD, ID, any>> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    constructor() {
        this.isRunning = true;
        this.setupShutdownHandlers();
    }

    name(): string {
        return "immediate";
    }

    /**
     * Adds and immediately processes messages
     * @param queueId - The identifier for the queue
     * @param messages - Array of messages to add and process immediately
     */
    async addMessages(queueId: QueueName, messages: BaseMessage<PAYLOAD, ID>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!messages.length) return;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        const messagesToProcess = messages.map(message => message);

        console.log(`Added ${messages.length} messages to immediate queue ${queueId}`);

        if (this.processors.has(queueId)) {
            const processor = this.processors.get(queueId)!;
            await this.consumeMessagesBatch(queueId, processor, messagesToProcess.length, messagesToProcess);
        } else {
            console.warn(`No processor registered for queue ${queueId}, messages discarded in immediate mode`);
        }
    }

    /**
     * Registers a processor for the queue
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the messages
     */
    async consumeMessagesStream<T = void>(queueId: QueueName, processor: MessageConsumer<PAYLOAD, ID, T>): Promise<T> {
        queueId = getEnvironmentQueueName(queueId);

        if (!this.isRunning) {
            console.warn(`Cannot register processor for queue ${queueId}: queue is shutting down`);
            return undefined as T;
        }

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        // Store the processor for this queue
        this.processors.set(queueId, processor);
        console.log(`Registered processor for immediate queue ${queueId}`);
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
        processor: MessageConsumer<PAYLOAD, ID, T>,
        limit: number = 10,
        messagesOverride?: BaseMessage<PAYLOAD, ID>[]
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

            console.log(`Processed ${messages.length} messages from immediate queue ${queueId}`);
            return result;
        } catch (error) {
            console.error(`Error processing messages from immediate queue ${queueId}:`, error);
            throw error;
        }
    }

    /**
     * Stops accepting and processing tasks
     */
    async shutdown(): Promise<void> {
        this.isRunning = false;
        this.processors.clear();
        console.log('Immediate queue shut down');
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

