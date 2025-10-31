import {describe, expect, it} from "bun:test";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskHandler} from "../core/TaskHandler.js";
import type {QueueName} from "@supergrowthai/mq";
import {InMemoryQueue} from "@supergrowthai/mq";
import {CronTask, InMemoryAdapter} from "../adapters";
import type {ISingleTaskNonParallel} from "../core/base/interfaces.js";
import {MemoryCacheProvider} from "memoose-js";


// Augment the QueueRegistry to add our test queue
declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "test-tq-queue": "test-tq-queue";
    }
}

describe("simple tq test", () => {
    it("should register, add, and consume tasks", async () => {
        // Setup message queue
        const messageQueue = new InMemoryQueue();
        const queueName: QueueName = "test-tq-queue";

        // Setup TQ components
        const databaseAdapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskQueue = new TaskQueuesManager(messageQueue);

        // Use proper MemoryCacheProvider
        const cacheProvider = new MemoryCacheProvider();

        const generateId = () => databaseAdapter.generateId();
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        // Track executed tasks
        const executedTasks: CronTask[] = [];
        let taskExecutorCalled = false;

        // Define a simple task executor
        const testTaskExecutor: ISingleTaskNonParallel<{ message: string }> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                taskExecutorCalled = true;
                executedTasks.push(task);

                // Simulate successful task execution
                console.log(`Executing task: ${task.payload.message}`);
                actions.success(task);
            }
        };

        // Register the task executor
        taskQueue.register(queueName, "test-task", testTaskExecutor);

        // Create test tasks
        const task1Id = generateId();
        const task2Id = generateId();
        const testTasks: CronTask<{ message: string }>[] = [
            {
                _id: task1Id,
                type: "test-task",
                queue_id: queueName,
                payload: {message: "Hello from Task 1"},
                execute_at: new Date(),
                status: "scheduled",
                retries: 0,
                created_at: new Date(),
                updated_at: new Date(),
                processing_started_at: new Date()
            },
            {
                _id: task2Id,
                type: "test-task",
                queue_id: queueName,
                payload: {message: "Hello from Task 2"},
                execute_at: new Date(),
                status: "scheduled",
                retries: 0,
                created_at: new Date(),
                updated_at: new Date(),
                processing_started_at: new Date()
            }
        ];

        // Add tasks to the task store
        await taskStore.addTasksToScheduled(testTasks);

        // Add tasks to the message queue (this would normally be done by a scheduler)
        await messageQueue.addMessages(queueName, testTasks);

        // Start consuming messages
        await taskHandler.startConsumingTasks(queueName);

        // Wait a bit for the consumer to process (InMemoryQueue polls every 1 second)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify the task executor was called
        expect(taskExecutorCalled).toBe(true);

        // Verify tasks were executed
        expect(executedTasks.length).toBe(2);
        expect(executedTasks[0].payload.message).toBe("Hello from Task 1");
        expect(executedTasks[1].payload.message).toBe("Hello from Task 2");

        // Verify task executor is registered
        const registeredExecutor = taskQueue.getExecutor(queueName, "test-task");
        expect(registeredExecutor).toBeDefined();

        // Verify queue is registered
        const registeredQueues = taskQueue.getQueues();
        expect(registeredQueues).toContain(`${queueName}-test` as QueueName);

        // Verify task types for queue
        const taskTypes = taskQueue.getTasksForQueue(queueName);
        expect(taskTypes).toContain("test-task");

        // Cleanup
        await messageQueue.shutdown();

        console.log("✅ Test passed: Successfully registered, added, and consumed tasks");
    });
})