import {describe, expect, it} from "bun:test";
import type {BaseMessage, IQueueLifecycleProvider, QueueInfo, QueueName} from "../core";
import {InMemoryQueue} from "../queues";

declare module "../core/types.js" {
    interface QueueRegistry {
        "test-queue": "test-queue";
    }
}

describe("simple mq test", () => {
    it("should produce and consume messages", async () => {
        // Setup
        const queue = new InMemoryQueue();
        const queueName: QueueName = "test-queue";

        // Register the queue
        queue.register(queueName);

        // Track consumed messages
        const consumedMessages: BaseMessage<string>[] = [];
        let processorCalled = false;

        // Start consuming messages
        await queue.consumeMessagesStream(queueName, async (id, messages) => {
            processorCalled = true;
            consumedMessages.push(...messages);
            // No result needed - MQ just delivers messages
        });

        // Create test messages
        const testMessages: BaseMessage<string>[] = [
            {
                id: "message1",
                type: "test-message",
                payload: {message: "Hello World 1"},
                execute_at: new Date(),
                status: "scheduled",
                retries: 0,
                created_at: new Date(),
                updated_at: new Date(),
                queue_id: queueName
            },
            {
                id: "message2",
                type: "test-message",
                payload: {message: "Hello World 2"},
                execute_at: new Date(),
                status: "scheduled",
                retries: 0,
                created_at: new Date(),
                updated_at: new Date(),
                queue_id: queueName
            }
        ];

        // Add messages to the queue
        await queue.addMessages(queueName, testMessages);

        // Wait a bit for the consumer to process (InMemoryQueue polls every 1 second)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify the processor was called
        expect(processorCalled).toBe(true);

        // Verify messages were consumed
        expect(consumedMessages.length).toBe(2);
        expect(consumedMessages[0].payload).toEqual({message: "Hello World 1"});
        expect(consumedMessages[1].payload).toEqual({message: "Hello World 2"});

        // Cleanup
        await queue.shutdown();

        console.log("✅ Test passed: Successfully produced and consumed messages");
    });

    it("should trigger lifecycle callbacks", async () => {
        // Setup
        const queue = new InMemoryQueue();
        const queueName: QueueName = "test-queue";

        // Track lifecycle events
        const events: string[] = [];

        // Create lifecycle provider
        const lifecycleProvider: IQueueLifecycleProvider = {
            onMessagePublished(info: QueueInfo & { message_type: string; message_id?: string }) {
                events.push(`published:${info.message_id}`);
            },
            onMessageConsumed(info: QueueInfo & { message_type: string; message_id?: string; age_ms: number }) {
                events.push(`consumed:${info.message_id}`);
            },
            onConsumerConnected(info: { consumer_id: string; consumer_type: 'worker' | 'shard'; queue_id: string }) {
                events.push(`connected:${info.consumer_id}`);
            },
            onConsumerDisconnected(info: {
                consumer_id: string;
                consumer_type: 'worker' | 'shard';
                queue_id: string;
                reason: string
            }) {
                events.push(`disconnected:${info.consumer_id}:${info.reason}`);
            }
        };

        // Set lifecycle config
        queue.setLifecycleConfig({
            lifecycleProvider,
            mode: 'sync'
        });

        // Register the queue
        queue.register(queueName);

        // Start consuming
        const abortController = new AbortController();
        await queue.consumeMessagesStream(queueName, async (id, messages) => {
            // Process messages
        }, abortController.signal);

        // Add messages (should trigger onMessagePublished)
        const testMessages: BaseMessage<string>[] = [
            {
                id: "lifecycle-msg-1",
                type: "test-message",
                payload: {message: "Lifecycle test"},
                execute_at: new Date(),
                status: "scheduled",
                retries: 0,
                created_at: new Date(),
                updated_at: new Date(),
                queue_id: queueName
            }
        ];

        await queue.addMessages(queueName, testMessages);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Abort to trigger disconnected
        abortController.abort();

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify events
        expect(events.some(e => e.startsWith('connected:'))).toBe(true);
        expect(events.some(e => e.startsWith('published:'))).toBe(true);
        expect(events.some(e => e.startsWith('consumed:'))).toBe(true);
        expect(events.some(e => e.startsWith('disconnected:'))).toBe(true);

        // Cleanup
        await queue.shutdown();

        console.log("✅ Test passed: Lifecycle callbacks triggered correctly");
        console.log("  Events:", events);
    });
})