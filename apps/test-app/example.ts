import {messageQueue} from './lib/mq.js';
import {taskHandler} from "./lib/tq.js";

async function runExample() {
    console.log('🚀 Starting memory-based TQ/MQ example...');

    // Add a simple message to the queue
    await messageQueue.addMessages("test-queue-mq", [
        {
            id: "msg-1",
            type: "example-task",
            payload: {message: "Hello from memory queue!"},
            execute_at: new Date(),
            status: 'scheduled',
            retries: 0,
            created_at: new Date(),
            updated_at: new Date(),
            queue_id: "test-queue-mq",
            processing_started_at: new Date()
        }
    ]);

    await messageQueue.consumeMessagesBatch("test-queue-mq", async (queueName, messages) => {
        console.log(`📨 Processing ${messages.length} messages from ${queueName}:`);
        for (const msg of messages) {
            console.log(`  - Message ID: ${msg.id}, Payload:`, msg.payload);
        }
    });

    // Add a cron task using the cron adapter
    await taskHandler.addTasks([{
        id: "cron-1",
        type: "example-task",
        payload: {action: "cleanup"},
        execute_at: new Date(Date.now() + 5_000),
        status: 'scheduled',
        retries: 1,
        created_at: new Date(),
        updated_at: new Date(),
        queue_id: "test-queue-tq",
        processing_started_at: new Date()
    }]);

    await Bun.sleep(5000)
    console.log('✅ Example completed successfully!');
}

// Run the example
runExample()
    .then(() => process.exit(0))
    .catch(console.error);