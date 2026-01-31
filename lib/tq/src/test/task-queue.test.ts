import {describe, expect, it} from "bun:test";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskHandler} from "../core/TaskHandler.js";
import {TaskRunner} from "../core/TaskRunner.js";
import type {QueueName} from "@supergrowthai/mq";
import {InMemoryQueue} from "@supergrowthai/mq";
import {CronTask, InMemoryAdapter} from "../adapters";
import type {ISingleTaskNonParallel} from "../core/base/interfaces.js";
import {MemoryCacheProvider} from "memoose-js";
import {AsyncTaskManager} from "../core/async/AsyncTaskManager.js";
import {LockManager} from "@supergrowthai/utils";
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
});

describe("production readiness fixes", () => {
    it("CRIT-001: should release locks even when executor not found", async () => {
        // Setup with no executor registered for the task type
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider<any>();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>(
            messageQueue,
            taskQueue,
            taskStore,
            cacheProvider,
            () => databaseAdapter.generateId()
        );

        // Create task for unregistered type (no executor will be found)
        const task = {
            id: 'test-lock-release-task',
            type: 'unregistered-task-type',
            queue_id: 'test-tq-queue' as QueueName,
            payload: {message: 'test'}, // Use valid payload type
            execute_at: new Date(),
            status: 'scheduled' as const,
            retries: 0,
            created_at: new Date(),
            updated_at: new Date(),
            processing_started_at: new Date()
        } as any as CronTask<string>;

        // Run TaskRunner (will not find executor, task will be ignored)
        const results = await taskRunner.run('test-runner', [task]);

        // Task should be in ignoredTasks since no executor found
        expect(results.ignoredTasks.length).toBe(1);

        // Verify lock was released by trying to acquire it again
        // If lock wasn't released, this would fail or timeout
        const lockManager = new LockManager(cacheProvider, {prefix: 'task_lock_'});
        const canAcquire = await lockManager.acquire('test-lock-release-task', 5);
        expect(canAcquire).toBe(true);

        // Cleanup
        await lockManager.release('test-lock-release-task');
        console.log("✅ CRIT-001: Lock properly released even when executor not found");
    });

    it("MED-002: should assign generated ID to tasks without ID", async () => {
        const adapter = new InMemoryAdapter();

        // Create task without an ID
        const taskWithoutId = {
            type: 'test-task' as any,
            queue_id: 'test-tq-queue' as QueueName,
            payload: {message: 'test'},
            execute_at: new Date(),
            status: 'scheduled' as const,
            retries: 0,
            created_at: new Date(),
            updated_at: new Date(),
            processing_started_at: new Date()
        } as CronTask<string>;

        const [addedTask] = await adapter.addTasksToScheduled([taskWithoutId]);

        // Verify ID was assigned
        expect(addedTask.id).toBeDefined();
        expect(typeof addedTask.id).toBe('string');
        expect(addedTask.id!.length).toBeGreaterThan(0);

        // Verify we can retrieve the task by ID
        const [retrievedTask] = await adapter.getTasksByIds([addedTask.id!]);
        expect(retrievedTask).toBeDefined();
        expect(retrievedTask.id).toBe(addedTask.id);

        console.log("✅ MED-002: ID properly assigned to tasks without ID");
    });

    it("MED-002: should preserve existing ID when provided", async () => {
        const adapter = new InMemoryAdapter();

        const existingId = 'my-custom-id-12345';
        const taskWithId: CronTask<string> = {
            id: existingId,
            type: 'test-task' as any,
            queue_id: 'test-tq-queue' as QueueName,
            payload: {message: 'test'},
            execute_at: new Date(),
            status: 'scheduled',
            retries: 0,
            created_at: new Date(),
            updated_at: new Date(),
            processing_started_at: new Date()
        };

        const [addedTask] = await adapter.addTasksToScheduled([taskWithId]);

        // Verify original ID was preserved
        expect(addedTask.id).toBe(existingId);

        console.log("✅ MED-002: Existing ID preserved when provided");
    });
});

describe("store_on_failure upsert fixes", () => {
    const makeTask = (id: string, overrides?: Partial<CronTask<string>>): CronTask<string> => ({
        id,
        type: 'test-task',
        queue_id: 'test-tq-queue',
        payload: {message: 'test'},
        execute_at: new Date(),
        status: 'scheduled',
        retries: 3,
        retry_after: 1000,
        created_at: new Date(),
        updated_at: new Date(),
        processing_started_at: new Date(),
        ...overrides
    } as CronTask<string>);

    it("upsertTasks creates record for never-persisted task", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // Task was never inserted into DB (store_on_failure hot path)
        const tasks = await adapter.getTasksByIds([id]);
        expect(tasks.length).toBe(0);

        // Upsert via updateTasksForRetry — should INSERT
        await taskStore.updateTasksForRetry([makeTask(id, {
            status: 'scheduled',
            execution_stats: {retry_count: 1}
        })]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted).toBeDefined();
        expect(persisted.id).toBe(id);
        expect(persisted.execution_stats?.retry_count).toBe(1);
    });

    it("upsertTasks updates existing record on subsequent retry", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // First failure creates the record
        await taskStore.updateTasksForRetry([makeTask(id, {
            execution_stats: {retry_count: 1}
        })]);

        // Second failure updates it
        const laterDate = new Date(Date.now() + 5000);
        await taskStore.updateTasksForRetry([makeTask(id, {
            execute_at: laterDate,
            execution_stats: {retry_count: 2}
        })]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted.execution_stats?.retry_count).toBe(2);
        expect(persisted.execute_at).toBe(laterDate);
    });

    it("markTasksAsFailed upserts for never-persisted task", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // Task exhausted retries but was never in DB
        await taskStore.markTasksAsFailed([makeTask(id, {
            execution_stats: {retry_count: 3, last_error: 'timeout'}
        })]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted).toBeDefined();
        expect(persisted.status).toBe('failed');
        expect(persisted.execution_stats?.failed_at).toBeDefined();
    });

    it("markTasksAsSuccess is no-op for never-persisted task", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // Success path — should NOT create a record (store_on_failure = don't persist successes)
        await taskStore.markTasksAsSuccess([makeTask(id)]);

        // markTasksAsSuccess calls markTasksAsExecuted which uses updateMany — skips missing
        const tasks = await adapter.getTasksByIds([id]);
        expect(tasks.length).toBe(0);
    });

    // --- DB-persisted tasks (future/mature origin) should UPDATE not CREATE ---

    it("updateTasksForRetry updates existing DB task (future/mature origin)", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();
        const originalPayload = {message: 'original'};

        // Task already in DB (future task or mature task)
        await adapter.addTasksToScheduled([makeTask(id, {payload: originalPayload})]);

        const laterDate = new Date(Date.now() + 10000);
        await taskStore.updateTasksForRetry([makeTask(id, {
            execute_at: laterDate,
            execution_stats: {retry_count: 1}
        })]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted.execution_stats?.retry_count).toBe(1);
        expect(persisted.execute_at).toBe(laterDate);
        // Payload must not be overwritten by upsert's update path
        expect((persisted.payload as any).message).toBe('original');
    });

    it("markTasksAsFailed updates existing DB task (future/mature origin)", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();
        const originalPayload = {message: 'original'};

        await adapter.addTasksToScheduled([makeTask(id, {payload: originalPayload})]);

        await taskStore.markTasksAsFailed([makeTask(id, {
            execution_stats: {retry_count: 3, last_error: 'db timeout'}
        })]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted.status).toBe('failed');
        expect(persisted.execution_stats?.failed_at).toBeDefined();
        expect(persisted.execution_stats?.last_error).toBe('db timeout');
        // Payload preserved
        expect((persisted.payload as any).message).toBe('original');
    });

    it("markTasksAsSuccess updates existing DB task to executed", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        await adapter.addTasksToScheduled([makeTask(id)]);

        await taskStore.markTasksAsSuccess([makeTask(id)]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted.status).toBe('executed');
    });

    // --- Mixed batch: some tasks in DB, some not ---

    it("upsertTasks handles mixed batch (some in DB, some not)", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const existingId = adapter.generateId();
        const newId = adapter.generateId();

        // Only one task in DB
        await adapter.addTasksToScheduled([makeTask(existingId)]);

        await taskStore.updateTasksForRetry([
            makeTask(existingId, {execution_stats: {retry_count: 2}}),
            makeTask(newId, {execution_stats: {retry_count: 1}})
        ]);

        const existing = await adapter.getTasksByIds([existingId]);
        const created = await adapter.getTasksByIds([newId]);
        expect(existing.length).toBe(1);
        expect(existing[0].execution_stats?.retry_count).toBe(2);
        expect(created.length).toBe(1);
        expect(created[0].execution_stats?.retry_count).toBe(1);
    });

    // --- Retry count always increments (no infinite loop) ---

    it("retry count increments on each upsert preventing infinite loops", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        for (let i = 1; i <= 5; i++) {
            await taskStore.updateTasksForRetry([makeTask(id, {
                execution_stats: {retry_count: i}
            })]);
        }

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted.execution_stats?.retry_count).toBe(5);
        // Only 1 record — upserts, not duplicates
        const all = await adapter.getTasksByIds([id]);
        expect(all.length).toBe(1);
    });

    // --- markTasksAsFailed preserves execution_stats from retries ---

    it("markTasksAsIgnored persists never-persisted store_on_failure task", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // Task was never in DB (store_on_failure hot path)
        const tasks = await adapter.getTasksByIds([id]);
        expect(tasks.length).toBe(0);

        await taskStore.markTasksAsIgnored([makeTask(id)]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted).toBeDefined();
        expect(persisted.status).toBe('ignored');
        expect(persisted.execution_stats?.ignored_reason).toBe('unknown_executor');
        expect(persisted.execution_stats?.ignored_at).toBeDefined();
    });

    it("markTasksAsIgnored updates existing DB task", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // Task already in DB
        await adapter.addTasksToScheduled([makeTask(id)]);

        await taskStore.markTasksAsIgnored([makeTask(id)]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted).toBeDefined();
        expect(persisted.status).toBe('ignored');
        expect(persisted.execution_stats?.ignored_reason).toBe('unknown_executor');
    });

    it("upsertTasks is idempotent — duplicate calls produce single record with latest state", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // Upsert same task 3 times with increasing retry counts
        for (let i = 1; i <= 3; i++) {
            await taskStore.updateTasksForRetry([makeTask(id, {
                execution_stats: {retry_count: i}
            })]);
        }

        // Should have exactly 1 record
        const all = await adapter.getTasksByIds([id]);
        expect(all.length).toBe(1);
        expect(all[0].execution_stats?.retry_count).toBe(3);
    });

    it("markTasksAsFailed preserves retry history in execution_stats", async () => {
        const adapter = new InMemoryAdapter();
        const taskStore = new TaskStore<string>(adapter);
        const id = adapter.generateId();

        // Simulate: task retried twice, then exhausted
        await taskStore.updateTasksForRetry([makeTask(id, {
            execution_stats: {retry_count: 1, last_error: 'first error'}
        })]);
        await taskStore.updateTasksForRetry([makeTask(id, {
            execution_stats: {retry_count: 2, last_error: 'second error'}
        })]);

        // Now mark as failed
        await taskStore.markTasksAsFailed([makeTask(id, {
            execution_stats: {retry_count: 3, last_error: 'final error'}
        })]);

        const [persisted] = await adapter.getTasksByIds([id]);
        expect(persisted.status).toBe('failed');
        expect(persisted.execution_stats?.retry_count).toBe(3);
        expect(persisted.execution_stats?.last_error).toBe('final error');
        expect(persisted.execution_stats?.failed_at).toBeDefined();
    });
});

describe("postProcessTasks error propagation", () => {
    it("postProcessTasks error propagates to caller (not swallowed)", async () => {
        const messageQueue = new InMemoryQueue();
        const queueName: QueueName = "test-tq-queue";
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        // Monkey-patch upsertTasks to throw (simulates DB down)
        const originalUpsert = databaseAdapter.upsertTasks.bind(databaseAdapter);
        databaseAdapter.upsertTasks = async () => {
            throw new Error("DB connection lost");
        };

        const task: CronTask<string> = {
            id: databaseAdapter.generateId(),
            type: 'test-task',
            queue_id: queueName,
            payload: {message: 'test'},
            execute_at: new Date(),
            status: 'scheduled',
            retries: 0,
            created_at: new Date(),
            updated_at: new Date(),
            processing_started_at: new Date(),
        } as CronTask<string>;

        // postProcessTasks with a failed task should propagate the DB error
        await expect(
            taskHandler.postProcessTasks({
                failedTasks: [task],
                newTasks: [],
                successTasks: []
            })
        ).rejects.toThrow("DB connection lost");

        // Restore
        databaseAdapter.upsertTasks = originalUpsert;
    });
});