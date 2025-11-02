import type {QueueName} from "../types.js";
import type {BaseMessage, MessageConsumer} from "./base.js";

export interface IMessageQueue<PAYLOAD, ID> {
    /**
     * Returns the name of the queue implementation
     */
    name(): string;

    /**
     * Adds a batch of messages to the queue
     * @param queueId - The identifier for the queue
     * @param messages - Array of messages to add to the queue
     */
    addMessages(queueId: QueueName, messages: BaseMessage<PAYLOAD, ID>[]): Promise<void>;

    /**
     * Consumes messages from the queue and processes them with the provided function
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the messages
     */
    consumeMessagesStream<T = void>(queueId: QueueName, processor: MessageConsumer<PAYLOAD, ID, T>): Promise<T>;

    /**
     * Stops consuming messages and cleans up resources
     */
    shutdown(): Promise<void>;

    /**
     * Process a batch of messages from the queue
     * @param queueId The queue to process from
     * @param processor Function to process messages
     * @param limit Maximum number of messages to process
     */
    consumeMessagesBatch<T = void>(queueId: QueueName, processor: MessageConsumer<PAYLOAD, ID, T>, limit?: number): Promise<T>;

    /**
     * Registers a queue with the message queue
     * @param queueId The queue to register
     */
    register(queueId: QueueName): void;
}
