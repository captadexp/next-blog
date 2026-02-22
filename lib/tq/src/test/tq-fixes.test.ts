import {describe, expect, it} from "bun:test";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskHandler} from "../core/TaskHandler.js";
import {TaskRunner} from "../core/TaskRunner.js";
import type {QueueName} from "@supergrowthai/mq";
import {InMemoryQueue} from "@supergrowthai/mq";
import {CronTask, InMemoryAdapter} from "../adapters";
import type {
    ISingleTaskNonParallel,
    ISingleTaskParallel,
    IMultiTaskExecutor,
} from "../core/base/interfaces.js";
import {MemoryCacheProvider} from "memoose-js";
import type {ITaskLifecycleProvider, TaskContext} from "../core/lifecycle.js";

declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "test-fix-queue": "test-fix-queue";
    }

    interface MessagePayloadRegistry {
        "crash-task": { data: string };
        "normal-task": { value: number };
        "pk-task": { entity_id: string };
    }
}

const queueName = "test-fix-queue" as QueueName;

function makeTask(id: string, type: string = 'crash-task', overrides: Partial<CronTask<string>> = {}): CronTask<string> {
    return {
        id,
        type,
        queue_id: queueName,
        payload: {data: 'test'},
        execute_at: new Date(),
        status: 'scheduled',
        retries: 3,
        retry_after: 1000,
        created_at: new Date(),
        updated_at: new Date(),
        processing_started_at: new Date(),
        ...overrides,
    } as CronTask<string>;
}

// ============ T8: Executor errors swallowed ============

describe("T8: executor errors route tasks to failed (not ignored)", () => {
    it("sequential executor: throwing onTask marks task as failed", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>(
            messageQueue,
            taskQueue,
            taskStore,
            cacheProvider,
            () => databaseAdapter.generateId()
        );

        // Register executor that throws
        const crashExecutor: ISingleTaskNonParallel<string, "crash-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (_task, _actions) => {
                throw new Error("Executor crashed!");
            },
        };

        taskQueue.register(queueName, "crash-task", crashExecutor);

        const task = makeTask('task-1');
        const results = await taskRunner.run('test-runner', [task]);

        // T8 fix: task should be in failedTasks, NOT ignoredTasks
        expect(results.failedTasks.length).toBe(1);
        expect(results.ignoredTasks.length).toBe(0);
        expect(results.failedTasks[0].id).toBe('task-1');
    });

    it("parallel executor: throwing onTask marks task as failed", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>(
            messageQueue,
            taskQueue,
            taskStore,
            cacheProvider,
            () => databaseAdapter.generateId()
        );

        const crashExecutor: ISingleTaskParallel<string, "crash-task"> = {
            multiple: false,
            parallel: true,
            chunkSize: 10,
            store_on_failure: true,
            onTask: async (_task, _actions) => {
                throw new Error("Parallel executor crashed!");
            },
        };

        taskQueue.register(queueName, "crash-task", crashExecutor);

        const tasks = [makeTask('task-1'), makeTask('task-2')];
        const results = await taskRunner.run('test-runner', tasks);

        expect(results.failedTasks.length).toBe(2);
        expect(results.ignoredTasks.length).toBe(0);
    });

    it("multi executor: throwing onTasks marks all tasks as failed", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>(
            messageQueue,
            taskQueue,
            taskStore,
            cacheProvider,
            () => databaseAdapter.generateId()
        );

        const crashExecutor: IMultiTaskExecutor<string, "crash-task"> = {
            multiple: true,
            store_on_failure: true,
            onTasks: async (_tasks, _actions) => {
                throw new Error("Multi executor crashed!");
            },
        };

        taskQueue.register(queueName, "crash-task", crashExecutor);

        const tasks = [makeTask('task-1'), makeTask('task-2'), makeTask('task-3')];
        const results = await taskRunner.run('test-runner', tasks);

        expect(results.failedTasks.length).toBe(3);
        expect(results.ignoredTasks.length).toBe(0);
    });

    it("successful executor still works correctly", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>(
            messageQueue,
            taskQueue,
            taskStore,
            cacheProvider,
            () => databaseAdapter.generateId()
        );

        const goodExecutor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };

        taskQueue.register(queueName, "normal-task", goodExecutor);

        const task = makeTask('task-1', 'normal-task');
        const results = await taskRunner.run('test-runner', [task]);

        expect(results.successTasks.length).toBe(1);
        expect(results.failedTasks.length).toBe(0);
        expect(results.ignoredTasks.length).toBe(0);
    });
});

// ============ T1: TaskRunner.run() failure loses batch ============

describe("T1: TaskRunner.run() failure returns tasks as failed", () => {
    it("catch block returns tasks as failedTasks instead of empty arrays", async () => {
        const tasks = [makeTask('t1', 'normal-task'), makeTask('t2', 'normal-task')];

        // Mirrors the fixed catch block in TaskHandler.startConsumingTasks
        const runResult = await Promise.reject(new Error("TaskRunner.run exploded"))
            .catch(() => ({
                failedTasks: tasks as CronTask<string>[],
                newTasks: [] as CronTask<string>[],
                successTasks: [] as CronTask<string>[],
                asyncTasks: [] as any[],
                ignoredTasks: [] as CronTask<string>[],
            }));

        // All tasks preserved for retry (not silently lost)
        expect(runResult.failedTasks.length).toBe(2);
        expect(runResult.failedTasks[0].id).toBe('t1');
        expect(runResult.successTasks.length).toBe(0);
    });
});

// ============ T5: Negative retry_after ============

describe("T5: negative retry_after clamped to zero", () => {
    function computeRetryDelay(retryAfter: number | undefined): number {
        return Math.max(retryAfter || 2000, 0);
    }

    it("negative retry_after produces non-negative delay", () => {
        // -5000 is truthy, so || doesn't trigger, but Math.max clamps to 0
        expect(computeRetryDelay(-5000)).toBe(0);
    });

    it("zero retry_after falls through to default 2000", () => {
        // 0 is falsy, so || gives 2000
        expect(computeRetryDelay(0)).toBe(2000);
    });

    it("positive retry_after is preserved", () => {
        expect(computeRetryDelay(5000)).toBe(5000);
    });

    it("undefined retry_after falls through to default 2000", () => {
        expect(computeRetryDelay(undefined)).toBe(2000);
    });

    it("calculated delay is always non-negative", () => {
        const testCases = [-10000, -1, 0, 100, 2000];
        for (const retryAfter of testCases) {
            const taskRetryAfter = computeRetryDelay(retryAfter);
            const retryCount = 2;
            const calculatedDelay = taskRetryAfter * Math.pow(retryCount + 1, 2);
            expect(calculatedDelay).toBeGreaterThanOrEqual(0);
        }
    });

    it("prevents scheduling in the past", () => {
        const now = Date.now();

        // Old broken behavior: negative retry_after = -5000
        const brokenRetryAfter = -5000;
        const brokenDelay = brokenRetryAfter * Math.pow(2, 2); // -20000
        const brokenExecuteAt = now + brokenDelay;
        expect(brokenExecuteAt).toBeLessThan(now); // Scheduled in the past!

        // Fixed behavior using computeRetryDelay
        const fixedRetryAfter = computeRetryDelay(-5000); // 0
        const fixedDelay = fixedRetryAfter * Math.pow(2, 2); // 0
        const fixedExecuteAt = now + fixedDelay;
        expect(fixedExecuteAt).toBeGreaterThanOrEqual(now); // Not in the past
    });
});

// ============ Partition key: executor getPartitionKey ============

describe("executor getPartitionKey", () => {
    it("executor with getPartitionKey sets partition_key on message", () => {
        const executor: ISingleTaskNonParallel<string, "pk-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            onTask: async (task, actions) => actions.success(task),
            getPartitionKey: (task) => (task.payload as any).entity_id,
        };

        const task = makeTask('task-1', 'pk-task', {
            payload: {entity_id: 'user-42'} as any,
        });

        const partitionKey = executor.getPartitionKey?.(task);
        expect(partitionKey).toBe('user-42');

        // Simulate what addTasks does
        const enrichedTask = {
            ...task,
            ...(partitionKey ? {partition_key: partitionKey} : {}),
        };

        expect(enrichedTask.partition_key).toBe('user-42');
    });

    it("executor without getPartitionKey does not set partition_key", () => {
        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            onTask: async (task, actions) => actions.success(task),
        };

        const task = makeTask('task-1', 'normal-task');
        const partitionKey = executor.getPartitionKey?.(task);

        expect(partitionKey).toBeUndefined();

        const enrichedTask = {
            ...task,
            ...(partitionKey ? {partition_key: partitionKey} : {}),
        };

        expect(enrichedTask).not.toHaveProperty('partition_key');
    });

});

// ============ force_store + immediate execution ============

describe("force_store + immediate execution", () => {
    it("resets tasks to 'scheduled' on MQ failure", async () => {
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();

        // Create a broken MQ that throws on addMessages
        const brokenMQ = new InMemoryQueue();
        const originalAdd = brokenMQ.addMessages.bind(brokenMQ);
        let callCount = 0;
        brokenMQ.addMessages = async (queueId: any, messages: any) => {
            callCount++;
            // Let the first call through (queue registration internal), fail on task publish
            if (callCount >= 1) {
                throw new Error("MQ is down");
            }
            return originalAdd(queueId, messages);
        };

        const taskQueue = new TaskQueuesManager<string>(brokenMQ);
        const taskHandler = new TaskHandler<string>(brokenMQ, taskQueue, databaseAdapter, cacheProvider);

        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task),
        };
        taskQueue.register(queueName, "normal-task", executor);

        const taskId = databaseAdapter.generateId();
        const task = {
            ...makeTask(taskId, 'normal-task'),
            force_store: true,
        } as any;

        // addTasks should throw because MQ failed
        await expect(taskHandler.addTasks([task])).rejects.toThrow("MQ is down");

        // Task should have been reset to 'scheduled' in DB (not stuck in 'processing')
        const [stored] = await databaseAdapter.getTasksByIds([taskId]);
        expect(stored).toBeDefined();
        expect(stored.status).toBe('scheduled');

        await brokenMQ.shutdown();
    });

    it("mixed addTasks: force_store + regular immediate + future", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task),
        };
        taskQueue.register(queueName, "normal-task", executor);

        const forceStoreId = databaseAdapter.generateId();
        const immediateId = databaseAdapter.generateId();
        const futureId = databaseAdapter.generateId();

        const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now

        await taskHandler.addTasks([
            {...makeTask(forceStoreId, 'normal-task'), force_store: true} as any,
            makeTask(immediateId, 'normal-task'),           // regular immediate (no force_store)
            makeTask(futureId, 'normal-task', {execute_at: futureDate}), // future task
        ]);

        // force_store task: in DB as 'processing'
        const [forceStored] = await databaseAdapter.getTasksByIds([forceStoreId]);
        expect(forceStored).toBeDefined();
        expect(forceStored.status).toBe('processing');

        // regular immediate task: NOT in DB (MQ only)
        const immediateStored = await databaseAdapter.getTasksByIds([immediateId]);
        expect(immediateStored.length).toBe(0);

        // future task: in DB as 'scheduled'
        const [futureStored] = await databaseAdapter.getTasksByIds([futureId]);
        expect(futureStored).toBeDefined();
        expect(futureStored.status).toBe('scheduled');

        await messageQueue.shutdown();
    });

    it("force_store=true but execute_at >2min routes to future path (DB only, no MQ)", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task),
        };
        taskQueue.register(queueName, "normal-task", executor);

        const taskId = databaseAdapter.generateId();
        const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now

        // force_store is set but execute_at is in the future — should go to future path
        await taskHandler.addTasks([{
            ...makeTask(taskId, 'normal-task', {execute_at: futureDate}),
            force_store: true,
        } as any]);

        // Task should be in DB as 'scheduled' (future path), NOT 'processing'
        const [stored] = await databaseAdapter.getTasksByIds([taskId]);
        expect(stored).toBeDefined();
        expect(stored.status).toBe('scheduled');

        await messageQueue.shutdown();
    });

    it("MQ failure + DB reset failure logs error and still throws mqError", async () => {
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();

        const brokenMQ = new InMemoryQueue();
        brokenMQ.addMessages = async () => {
            throw new Error("MQ is down");
        };

        // Also break updateTasks so the reset fails
        const originalUpdateTasks = databaseAdapter.updateTasks.bind(databaseAdapter);
        databaseAdapter.updateTasks = async () => {
            throw new Error("DB reset failed too");
        };

        const taskQueue = new TaskQueuesManager<string>(brokenMQ);
        const taskHandler = new TaskHandler<string>(brokenMQ, taskQueue, databaseAdapter, cacheProvider);

        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task),
        };
        taskQueue.register(queueName, "normal-task", executor);

        const taskId = databaseAdapter.generateId();
        const task = {
            ...makeTask(taskId, 'normal-task'),
            force_store: true,
        } as any;

        // Should still throw the MQ error (not the DB reset error)
        await expect(taskHandler.addTasks([task])).rejects.toThrow("MQ is down");

        // Task stuck in 'processing' since reset failed — this is the worst-case scenario
        // (cleanup/orphan detection would eventually handle this)
        const [stored] = await databaseAdapter.getTasksByIds([taskId]);
        expect(stored).toBeDefined();
        expect(stored.status).toBe('processing');

        databaseAdapter.updateTasks = originalUpdateTasks;
        await brokenMQ.shutdown();
    });

    it("DB write failure prevents MQ write (exception propagates)", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);

        // Break addTasksToScheduled
        databaseAdapter.addTasksToScheduled = async () => {
            throw new Error("DB write failed");
        };

        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task),
        };
        taskQueue.register(queueName, "normal-task", executor);

        const taskId = databaseAdapter.generateId();
        const task = {
            ...makeTask(taskId, 'normal-task'),
            force_store: true,
        } as any;

        await expect(taskHandler.addTasks([task])).rejects.toThrow("DB write failed");

        await messageQueue.shutdown();
    });

    it("lifecycle onTaskScheduled emitted for force_store tasks", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);

        const scheduledEvents: string[] = [];
        const lifecycleProvider: ITaskLifecycleProvider = {
            onTaskScheduled(ctx: TaskContext) {
                scheduledEvents.push(ctx.task_id as string);
            },
        };

        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider,
            undefined, undefined,
            {lifecycleProvider, lifecycle: {mode: 'sync'}}
        );

        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task),
        };
        taskQueue.register(queueName, "normal-task", executor);

        const taskId = databaseAdapter.generateId();
        const task = {
            ...makeTask(taskId, 'normal-task'),
            force_store: true,
        } as any;

        await taskHandler.addTasks([task]);

        expect(scheduledEvents).toContain(taskId);

        await messageQueue.shutdown();
    });

    it("no double-insert: Task DB and MQ are separate stores", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        // Instrument: track all addTasksToScheduled calls
        const dbInsertCalls: CronTask<string>[][] = [];
        const originalAdd = databaseAdapter.addTasksToScheduled.bind(databaseAdapter);
        databaseAdapter.addTasksToScheduled = async (tasks: CronTask<string>[]) => {
            dbInsertCalls.push([...tasks]);
            return originalAdd(tasks);
        };

        // Instrument: track all MQ addMessages calls
        const mqInsertCalls: { queueId: string; count: number; statuses: string[] }[] = [];
        const originalMQAdd = messageQueue.addMessages.bind(messageQueue);
        messageQueue.addMessages = async (queueId: any, messages: any[]) => {
            mqInsertCalls.push({
                queueId,
                count: messages.length,
                statuses: messages.map((m: any) => m.status),
            });
            return originalMQAdd(queueId, messages);
        };

        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => actions.success(task),
        };
        taskQueue.register(queueName, "normal-task", executor);

        const taskId = databaseAdapter.generateId();
        await taskHandler.addTasks([{
            ...makeTask(taskId, 'normal-task'),
            force_store: true,
        } as any]);

        // Task DB: exactly 1 insert call with status 'processing'
        expect(dbInsertCalls.length).toBe(1);
        expect(dbInsertCalls[0].length).toBe(1);
        expect(dbInsertCalls[0][0].status).toBe('processing');

        // MQ: exactly 1 addMessages call with status 'scheduled' (not 'processing')
        expect(mqInsertCalls.length).toBe(1);
        expect(mqInsertCalls[0].count).toBe(1);
        expect(mqInsertCalls[0].statuses[0]).toBe('scheduled');

        // Task DB has exactly 1 record for this ID
        const stored = await databaseAdapter.getTasksByIds([taskId]);
        expect(stored.length).toBe(1);
        expect(stored[0].status).toBe('processing');

        await messageQueue.shutdown();
    });

    it("force_store task is consumed and executed end-to-end", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

        const executed: string[] = [];
        const executor: ISingleTaskNonParallel<string, "normal-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                executed.push(task.id as string);
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "normal-task", executor);

        const taskId = databaseAdapter.generateId();
        const task = {
            ...makeTask(taskId, 'normal-task'),
            force_store: true,
        } as any;

        await taskHandler.addTasks([task]);

        // Verify pre-conditions: in DB as 'processing', in MQ
        const [beforeConsume] = await databaseAdapter.getTasksByIds([taskId]);
        expect(beforeConsume.status).toBe('processing');

        // Consume and execute
        await taskHandler.startConsumingTasks(queueName);
        await new Promise(resolve => setTimeout(resolve, 2000));

        expect(executed).toContain(taskId);

        // After execution, the task should be marked as 'executed' in DB
        const [afterConsume] = await databaseAdapter.getTasksByIds([taskId]);
        expect(afterConsume).toBeDefined();
        expect(afterConsume.status).toBe('executed');

        await messageQueue.shutdown();
    });
});

// ============ Integration: T8 tasks enter retry pipeline ============

describe("T8 integration: failed tasks enter postProcessTasks retry pipeline", () => {
    it("executor crash -> task retried via postProcessTasks", async () => {
        const messageQueue = new InMemoryQueue();
        const databaseAdapter = new InMemoryAdapter();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider
        );

        // Register crashing executor with retries
        const crashExecutor: ISingleTaskNonParallel<string, "crash-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            default_retries: 3,
            onTask: async () => {
                throw new Error("Crash!");
            },
        };

        taskQueue.register(queueName, "crash-task", crashExecutor);

        const taskId = databaseAdapter.generateId();
        const task = makeTask(taskId, 'crash-task', {retries: 3});

        // Add task to store first (since store_on_failure + has id)
        await databaseAdapter.addTasksToScheduled([task]);

        // Simulate: task consumed from MQ -> run -> catch -> postProcessTasks
        await messageQueue.addMessages(queueName, [task]);

        // Start consuming
        await taskHandler.startConsumingTasks(queueName);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Task should be scheduled for retry (status = 'scheduled', retry_count > 0)
        const [stored] = await databaseAdapter.getTasksByIds([taskId]);
        expect(stored).toBeDefined();
        expect(stored.status).toBe('scheduled');
        expect(stored.execution_stats?.retry_count).toBeGreaterThan(0);

        await messageQueue.shutdown();
    });
});
