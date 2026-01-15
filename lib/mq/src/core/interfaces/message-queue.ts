import type {QueueName} from "../types.js";
import type {BaseMessage, MessageConsumer} from "./base.js";
import type {QueueLifecycleConfig} from "./lifecycle.js";

export interface IMessageQueue<ID> {
    /**
     * Returns the name of the queue implementation
     */
    name(): string;

    /**
     * Adds a batch of messages to the queue
     * @param queueId - The identifier for the queue
     * @param messages - Array of messages to add to the queue
     */
    addMessages(queueId: QueueName, messages: BaseMessage<ID>[]): Promise<void>;

    /**
     * Starts consuming messages from the queue in a background polling loop.
     *
     * **IMPORTANT:** This method returns immediately after starting the consumer.
     * The return value is always `undefined as T`. Processing happens in the background.
     *
     * To stop consumption, either:
     * - Pass an AbortSignal and call `abort()` on the controller
     * - Call `shutdown()` on the queue instance
     *
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the messages (called repeatedly)
     * @param signal - Optional AbortSignal to stop consumption
     * @returns Promise that resolves immediately to undefined (does NOT wait for processing)
     *
     * @example
     * ```typescript
     * const controller = new AbortController();
     * await queue.consumeMessagesStream('my-queue', processor, controller.signal);
     * // Consumer is now running in background
     * // To stop: controller.abort() or queue.shutdown()
     * ```
     */
    consumeMessagesStream<T = void>(queueId: QueueName, processor: MessageConsumer<ID, T>, signal?: AbortSignal): Promise<T>;

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
    consumeMessagesBatch<T = void>(queueId: QueueName, processor: MessageConsumer<ID, T>, limit?: number): Promise<T>;

    /**
     * Registers a queue with the message queue
     * @param queueId The queue to register
     */
    register(queueId: QueueName): void;

    /**
     * Set lifecycle provider for queue events
     * @param config Lifecycle configuration
     */
    setLifecycleConfig(config: QueueLifecycleConfig): void;
}
