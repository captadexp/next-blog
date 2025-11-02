import {describe, expect, it} from "bun:test";
import type {BaseMessage, QueueName} from "../core";
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
        const consumedMessages: BaseMessage[] = [];
        let processorCalled = false;

        // Start consuming messages
        await queue.consumeMessagesStream(queueName, async (id, messages) => {
            processorCalled = true;
            consumedMessages.push(...messages);
            // No result needed - MQ just delivers messages
        });

        // Create test messages
        const testMessages: BaseMessage[] = [
            {
                _id: "message1",
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
                _id: "message2",
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
    })
})