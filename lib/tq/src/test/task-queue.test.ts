import {describe, expect, it} from "bun:test";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskHandler} from "../core/TaskHandler.js";
import type {QueueName} from "@supergrowthai/mq";
import {InMemoryQueue} from "@supergrowthai/mq";
import {CronTask, InMemoryAdapter} from "../adapters";
import type {ISingleTaskNonParallel} from "../core/base/interfaces.js";
import {MemoryCacheProvider} from "memoose-js";
import {AsyncTaskManager} from "../core/async/AsyncTaskManager.js";
import type {
    ITaskLifecycleProvider,
    IWorkerLifecycleProvider,
    TaskContext,
    TaskTiming,
    WorkerInfo
} from "../core/lifecycle.js";

declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "test-tq-queue": "test-tq-queue";
        "test-tq-queue-2": "test-tq-queue-2";
    }

    interface MessagePayloadRegistry {
        "test-task": { message: string };
        "test-task-x": { x: number };
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
        const taskQueue = new TaskQueuesManager<string>(messageQueue);

        // Use proper MemoryCacheProvider
        const cacheProvider = new MemoryCacheProvider();

        const generateId = () => databaseAdapter.generateId();
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        // Track executed tasks
        const executedTasks: CronTask<string>[] = [];
        let taskExecutorCalled = false;

        // Define a typed task executor for "test-task"
        const testTaskExecutor: ISingleTaskNonParallel<string, "test-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                taskExecutorCalled = true;
                executedTasks.push(task);

                // Simulate successful task execution
                // task.payload is now typed as { message: string }
                console.log(`Executing task: ${task.payload.message}`);
                actions.success(task);
            }
        };

        // Register the task executor
        taskQueue.register(queueName, "test-task", testTaskExecutor);

        // Create test tasks
        const task1Id = generateId();
        const task2Id = generateId();
        const testTasks: CronTask<string>[] = [
            {
                id: task1Id,
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
                id: task2Id,
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
        // Cast payload to the expected type for verification
        expect((executedTasks[0].payload as { message: string }).message).toBe("Hello from Task 1");
        expect((executedTasks[1].payload as { message: string }).message).toBe("Hello from Task 2");

        // Verify task executor is registered
        const registeredExecutor = taskQueue.getExecutor(queueName, "test-task");
        expect(registeredExecutor).toBeDefined();

        // Verify queue is registered
        const registeredQueues = taskQueue.getQueues();
        expect(registeredQueues).toContain(`${queueName}-test` as QueueName);

        // Verify task types for queue
        const taskTypes = taskQueue.getTaskTypesForQueue(queueName);
        expect(taskTypes).toContain("test-task");

        // Cleanup
        await messageQueue.shutdown();

        console.log("✅ Test passed: Successfully registered, added, and consumed tasks");
    });

    it("should handle AbortSignal for graceful shutdown", async () => {
        // Setup
        const messageQueue = new InMemoryQueue();
        const queueName: QueueName = "test-tq-queue";
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const asyncTaskManager = new AsyncTaskManager<string>(10);
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider, asyncTaskManager);

        // Create AbortController for testing
        const abortController = new AbortController();

        // Test 1: AsyncTaskManager shutdown with AbortSignal
        const shutdownPromise = asyncTaskManager.shutdown(abortController.signal);

        // Abort after 1 second (should interrupt the 10-second grace period)
        setTimeout(() => abortController.abort(), 1000);

        const startTime = Date.now();
        await shutdownPromise;
        const duration = Date.now() - startTime;

        // Should complete in ~1 second, not the full 10-second grace period
        expect(duration).toBeLessThan(2000);

        // Test 2: TaskHandler startConsumingTasks with AbortSignal
        const abortController2 = new AbortController();
        abortController2.abort(); // Already aborted

        // Register queue and executor for this test
        const testExecutor: ISingleTaskNonParallel<string, "test-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task)
        };
        taskQueue.register(queueName, "test-task", testExecutor);

        // This should return early due to abort
        const consumeResult = taskHandler.startConsumingTasks(queueName, abortController2.signal);

        // Test 3: Batch processing with AbortSignal
        const abortController3 = new AbortController();
        abortController3.abort(); // Already aborted

        const batchResult = await taskHandler.processBatch(queueName, async () => {
        }, 10, abortController3.signal);
        expect(batchResult).toBeUndefined(); // Should return early due to abort

        console.log("✅ Test passed: AbortSignal properly handles graceful shutdown");
    });

    it("should trigger lifecycle callbacks", async () => {
        // Setup
        const messageQueue = new InMemoryQueue();
        const queueName: QueueName = "test-tq-queue";
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const generateId = () => databaseAdapter.generateId();

        // Track lifecycle events
        const lifecycleEvents: string[] = [];
        const workerEvents: string[] = [];

        // Create lifecycle provider
        const lifecycleProvider: ITaskLifecycleProvider = {
            onTaskScheduled(ctx: TaskContext) {
                lifecycleEvents.push(`scheduled:${ctx.task_id}`);
            },
            onTaskStarted(ctx: TaskContext & { started_at: Date; queued_duration_ms: number }) {
                lifecycleEvents.push(`started:${ctx.task_id}`);
            },
            onTaskCompleted(ctx: TaskContext & { timing: TaskTiming; result?: unknown }) {
                lifecycleEvents.push(`completed:${ctx.task_id}`);
            },
            onTaskFailed(ctx: TaskContext & { timing: TaskTiming; error: Error; will_retry: boolean }) {
                lifecycleEvents.push(`failed:${ctx.task_id}`);
            }
        };

        const workerProvider: IWorkerLifecycleProvider = {
            onWorkerStarted(info: WorkerInfo) {
                workerEvents.push(`worker_started:${info.worker_id}`);
            },
            onBatchStarted(info: WorkerInfo & { batch_size: number; task_types: string[] }) {
                workerEvents.push(`batch_started:${info.batch_size}`);
            },
            onBatchCompleted(info: WorkerInfo & { batch_size: number; succeeded: number; failed: number }) {
                workerEvents.push(`batch_completed:${info.succeeded}/${info.batch_size}`);
            }
        };

        // Create TaskHandler with lifecycle providers
        const taskHandler = new TaskHandler<string>(
            messageQueue,
            taskQueue,
            databaseAdapter,
            cacheProvider,
            undefined,  // asyncTaskManager
            undefined,  // notificationProvider
            {
                lifecycleProvider,
                workerProvider,
                lifecycle: {
                    mode: 'sync'
                }
            }
        );

        // Define task executor
        const testExecutor: ISingleTaskNonParallel<string, "test-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task);
            }
        };

        taskQueue.register(queueName, "test-task", testExecutor);

        // Create and add tasks
        const taskId = generateId();
        const testTask: CronTask<string> = {
            id: taskId,
            type: "test-task",
            queue_id: queueName,
            payload: {message: "Test lifecycle"},
            execute_at: new Date(),
            status: "scheduled",
            retries: 0,
            created_at: new Date(),
            updated_at: new Date(),
            processing_started_at: new Date()
        };

        // Add tasks (should trigger onTaskScheduled)
        await taskHandler.addTasks([testTask]);

        // Start consuming
        await taskHandler.startConsumingTasks(queueName);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify lifecycle events
        // Note: worker_started is only emitted by taskProcessServer(), not startConsumingTasks()
        expect(lifecycleEvents.some(e => e.startsWith('scheduled:'))).toBe(true);
        expect(lifecycleEvents.some(e => e.startsWith('started:'))).toBe(true);
        expect(lifecycleEvents.some(e => e.startsWith('completed:'))).toBe(true);

        // Cleanup
        await messageQueue.shutdown();

        console.log("✅ Test passed: Lifecycle callbacks triggered correctly");
        console.log("  Lifecycle events:", lifecycleEvents);
    });
})