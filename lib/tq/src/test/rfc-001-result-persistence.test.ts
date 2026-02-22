import {describe, expect, it, beforeEach} from "bun:test";
import {Actions} from "../core/Actions.js";
import {CronTask, InMemoryAdapter} from "../adapters";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskHandler} from "../core/TaskHandler.js";
import {TaskRunner} from "../core/TaskRunner.js";
import type {QueueName} from "@supergrowthai/mq";
import {InMemoryQueue} from "@supergrowthai/mq";
import type {ISingleTaskNonParallel, IMultiTaskExecutor, ExecutorActions} from "../core/base/interfaces.js";
import {MemoryCacheProvider} from "memoose-js";
import type {ITaskLifecycleProvider, TaskContext, TaskTiming} from "../core/lifecycle.js";

declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "rfc001-queue": "rfc001-queue";
    }

    interface MessagePayloadRegistry {
        "rfc001-task": { input: string };
        "rfc001-task-b": { input: string };
        "rfc001-task-c": { input: string };
    }
}

const QUEUE: QueueName = "rfc001-queue";

function makeTask(overrides: Partial<CronTask<string>> = {}): CronTask<string> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return {
        id,
        type: "rfc001-task",
        queue_id: QUEUE,
        payload: {input: "hello"},
        execute_at: new Date(),
        status: "scheduled",
        retries: 0,
        created_at: new Date(),
        updated_at: new Date(),
        processing_started_at: new Date(),
        ...overrides
    } as CronTask<string>;
}

// ============ Phase 2: Actions.ts — Capture Layer ============

describe("RFC-001: Result Persistence", () => {

    describe("Phase 2: Actions capture layer", () => {

        it("forkForTask success(task, result) stores result on task", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();
            const forked = actions.forkForTask(task);

            forked.success(task, {output: 42});

            const results = actions.extractSyncResults([]);
            expect(results.successTasks).toHaveLength(1);
            expect(results.successTasks[0].execution_result).toEqual({output: 42});
        });

        it("success(task) without result leaves execution_result undefined", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();
            const forked = actions.forkForTask(task);

            forked.success(task);

            const results = actions.extractSyncResults([]);
            expect(results.successTasks).toHaveLength(1);
            expect(results.successTasks[0].execution_result).toBeUndefined();
        });

        it("success(task, null) preserves null as valid result", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();
            const forked = actions.forkForTask(task);

            forked.success(task, null);

            const results = actions.extractSyncResults([]);
            expect(results.successTasks[0].execution_result).toBeNull();
        });

        it("root success(task, result) captures result for multi-task executors", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();

            actions.success(task, {multi: true});

            const results = actions.extractSyncResults([]);
            expect(results.successTasks).toHaveLength(1);
            expect(results.successTasks[0].execution_result).toEqual({multi: true});
        });

        it("fail(task, error, meta) enriches execution_stats", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();
            const forked = actions.forkForTask(task);

            const err = new Error("gpu exploded");
            forked.fail(task, err, {gpu_id: "gpu-7"});

            const results = actions.extractSyncResults([]);
            expect(results.failedTasks).toHaveLength(1);
            const failedTask = results.failedTasks[0];
            expect(failedTask.execution_stats?.last_error).toBe("gpu exploded");
            expect(failedTask.execution_stats?.last_error_stack).toBeDefined();
            expect(failedTask.execution_stats?.gpu_id).toBe("gpu-7");
        });

        it("fail(task) without error/meta preserves existing behavior", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask({execution_stats: {retry_count: 1}});
            const forked = actions.forkForTask(task);

            forked.fail(task);

            const results = actions.extractSyncResults([]);
            expect(results.failedTasks).toHaveLength(1);
            // Original execution_stats should be untouched
            expect(results.failedTasks[0].execution_stats?.retry_count).toBe(1);
        });

        it("fail(task, 'string error') stores string without stack", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();
            const forked = actions.forkForTask(task);

            forked.fail(task, "some string error");

            const results = actions.extractSyncResults([]);
            const failedTask = results.failedTasks[0];
            expect(failedTask.execution_stats?.last_error).toBe("some string error");
            expect(failedTask.execution_stats?.last_error_stack).toBeUndefined();
        });
    });

    // ============ Phase 3: Size Validation ============

    describe("Phase 3: Size validation", () => {

        it("result exceeding 256KB is dropped from task", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();
            const forked = actions.forkForTask(task);

            // Create a result > 256KB
            const bigResult = {data: "x".repeat(300 * 1024)};
            forked.success(task, bigResult);

            const results = actions.extractSyncResults([]);
            expect(results.successTasks).toHaveLength(1);
            expect(results.successTasks[0].execution_result).toBeUndefined();
        });

        it("circular reference result is dropped", () => {
            const actions = new Actions<string>("test-runner");
            const task = makeTask();
            const forked = actions.forkForTask(task);

            const circular: any = {a: 1};
            circular.self = circular;
            forked.success(task, circular);

            const results = actions.extractSyncResults([]);
            expect(results.successTasks).toHaveLength(1);
            expect(results.successTasks[0].execution_result).toBeUndefined();
        });
    });

    // ============ Phase 4: InMemoryAdapter — Persist Layer ============

    describe("Phase 4: InMemoryAdapter persistence", () => {

        it("markTasksAsExecuted persists execution_result on task", async () => {
            const adapter = new InMemoryAdapter();
            const task = makeTask();

            // First add the task
            await adapter.addTasksToScheduled([task]);

            // Mark as executed with result
            const taskWithResult = {...task, execution_result: {output: "done"}};
            await adapter.markTasksAsExecuted([taskWithResult]);

            const stored = await adapter.getTasksByIds([task.id!]);
            expect(stored).toHaveLength(1);
            expect(stored[0].execution_result).toEqual({output: "done"});
            expect(stored[0].status).toBe("executed");
        });

        it("markTasksAsExecuted without result does not add field", async () => {
            const adapter = new InMemoryAdapter();
            const task = makeTask();

            await adapter.addTasksToScheduled([task]);
            await adapter.markTasksAsExecuted([task]);

            const stored = await adapter.getTasksByIds([task.id!]);
            expect(stored).toHaveLength(1);
            expect(stored[0].execution_result).toBeUndefined();
        });
    });

    // ============ Phase 5: TaskRunner — Lifecycle Propagation ============

    describe("Phase 5: TaskRunner lifecycle propagation", () => {

        it("emitTaskCompleted receives result matching executor output", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const taskStore = new TaskStore<string>(databaseAdapter);
            const cacheProvider = new MemoryCacheProvider();

            let completedResult: unknown = undefined;

            const lifecycleProvider: ITaskLifecycleProvider = {
                onTaskCompleted: (ctx) => {
                    completedResult = (ctx as any).result;
                }
            };

            const taskRunner = new TaskRunner<string>(
                messageQueue, taskQueue, taskStore, cacheProvider,
                () => databaseAdapter.generateId(),
                lifecycleProvider
            );

            const executor: ISingleTaskNonParallel<string, "rfc001-task"> = {
                multiple: false,
                parallel: false,
                store_on_failure: true,
                onTask: async (task, actions) => {
                    actions.success(task, {computed: 123});
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            const task = makeTask();
            await taskRunner.run("test-run", [task]);

            expect(completedResult).toEqual({computed: 123});
        });
    });

    // ============ Phase 6: Full Pipeline ============

    describe("Phase 6: Full pipeline", () => {

        it("result survives executor → Actions → postProcessTasks → DB", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const cacheProvider = new MemoryCacheProvider();
            const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

            const task = makeTask();
            await databaseAdapter.addTasksToScheduled([task]);

            const executor: ISingleTaskNonParallel<string, "rfc001-task"> = {
                multiple: false,
                parallel: false,
                store_on_failure: true,
                onTask: async (t, actions) => {
                    actions.success(t, {pipeline: "works"});
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            // Add tasks to MQ and consume
            await messageQueue.addMessages(QUEUE, [task]);
            await taskHandler.startConsumingTasks(QUEUE);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const stored = await databaseAdapter.getTasksByIds([task.id!]);
            expect(stored).toHaveLength(1);
            expect(stored[0].status).toBe("executed");
            expect(stored[0].execution_result).toEqual({pipeline: "works"});

            await messageQueue.shutdown();
        });

        it("mixed batch: per-task results don't cross-contaminate", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const cacheProvider = new MemoryCacheProvider();
            const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

            const taskA = makeTask({id: "task-a", payload: {input: "A"}});
            const taskB = makeTask({id: "task-b", payload: {input: "B"}});
            const taskC = makeTask({id: "task-c", payload: {input: "C"}});

            await databaseAdapter.addTasksToScheduled([taskA, taskB, taskC]);

            const executor: IMultiTaskExecutor<string, "rfc001-task"> = {
                multiple: true,
                store_on_failure: true,
                onTasks: async (tasks, actions) => {
                    for (const t of tasks) {
                        const p = t.payload as {input: string};
                        if (p.input === "A") {
                            actions.success(t, {out: "A"});
                        } else if (p.input === "B") {
                            actions.success(t); // no result
                        } else {
                            actions.fail(t, new Error("C failed"), {reason: "test"});
                        }
                    }
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            await messageQueue.addMessages(QUEUE, [taskA, taskB, taskC]);
            await taskHandler.startConsumingTasks(QUEUE);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const [storedA] = await databaseAdapter.getTasksByIds(["task-a"]);
            const [storedB] = await databaseAdapter.getTasksByIds(["task-b"]);
            const [storedC] = await databaseAdapter.getTasksByIds(["task-c"]);

            expect(storedA.execution_result).toEqual({out: "A"});
            expect(storedB.execution_result).toBeUndefined();
            // Task C failed — check error in stats
            expect(storedC.execution_stats?.last_error).toBe("C failed");
            expect(storedC.execution_stats?.reason).toBe("test");

            await messageQueue.shutdown();
        });

        it("error + meta survive retry pipeline to DB on exhaustion", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const cacheProvider = new MemoryCacheProvider();
            const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

            // Task with 0 retries — will be exhausted on first failure
            const task = makeTask({retries: 0});
            await databaseAdapter.addTasksToScheduled([task]);

            const executor: ISingleTaskNonParallel<string, "rfc001-task"> = {
                multiple: false,
                parallel: false,
                store_on_failure: true,
                default_retries: 0,
                onTask: async (t, actions) => {
                    actions.fail(t, new Error("gpu crashed"), {gpu_id: "gpu-3"});
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            await messageQueue.addMessages(QUEUE, [task]);
            await taskHandler.startConsumingTasks(QUEUE);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const stored = await databaseAdapter.getTasksByIds([task.id!]);
            expect(stored).toHaveLength(1);
            expect(stored[0].execution_stats?.last_error).toBe("gpu crashed");
            expect(stored[0].execution_stats?.last_error_stack).toBeDefined();
            expect(stored[0].execution_stats?.gpu_id).toBe("gpu-3");

            await messageQueue.shutdown();
        });

        it("result over size limit: task succeeds, result dropped", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const cacheProvider = new MemoryCacheProvider();
            const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

            const task = makeTask();
            await databaseAdapter.addTasksToScheduled([task]);

            const executor: ISingleTaskNonParallel<string, "rfc001-task"> = {
                multiple: false,
                parallel: false,
                store_on_failure: true,
                onTask: async (t, actions) => {
                    actions.success(t, {data: "x".repeat(300 * 1024)});
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            await messageQueue.addMessages(QUEUE, [task]);
            await taskHandler.startConsumingTasks(QUEUE);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const stored = await databaseAdapter.getTasksByIds([task.id!]);
            expect(stored).toHaveLength(1);
            expect(stored[0].status).toBe("executed");
            expect(stored[0].execution_result).toBeUndefined();

            await messageQueue.shutdown();
        });

        it("lifecycle onTaskCompleted receives result matching DB", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const cacheProvider = new MemoryCacheProvider();

            let lifecycleResult: unknown = undefined;

            const lifecycleProvider: ITaskLifecycleProvider = {
                onTaskCompleted: (ctx) => {
                    lifecycleResult = (ctx as any).result;
                }
            };

            const taskHandler = new TaskHandler<string>(
                messageQueue, taskQueue, databaseAdapter, cacheProvider,
                undefined, undefined,
                {lifecycleProvider}
            );

            const task = makeTask();
            await databaseAdapter.addTasksToScheduled([task]);

            const executor: ISingleTaskNonParallel<string, "rfc001-task"> = {
                multiple: false,
                parallel: false,
                store_on_failure: true,
                onTask: async (t, actions) => {
                    actions.success(t, {lifecycle: "consistent"});
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            await messageQueue.addMessages(QUEUE, [task]);
            await taskHandler.startConsumingTasks(QUEUE);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Lifecycle event should have the result
            expect(lifecycleResult).toEqual({lifecycle: "consistent"});

            // DB should also have the result
            const stored = await databaseAdapter.getTasksByIds([task.id!]);
            expect(stored[0].execution_result).toEqual({lifecycle: "consistent"});

            await messageQueue.shutdown();
        });
    });

    // ============ Phase 7: Async Path ============

    describe("Phase 7: Async path", () => {

        it("async task result flows through AsyncActions to DB", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const cacheProvider = new MemoryCacheProvider();

            // Import AsyncTaskManager
            const {AsyncTaskManager} = await import("../core/async/AsyncTaskManager.js");
            const asyncTaskManager = new AsyncTaskManager<string>(10);

            const taskHandler = new TaskHandler<string>(
                messageQueue, taskQueue, databaseAdapter, cacheProvider,
                asyncTaskManager
            );

            const task = makeTask();
            await databaseAdapter.addTasksToScheduled([task]);

            // Executor that takes longer than handoff timeout
            const executor: ISingleTaskNonParallel<string, "rfc001-task"> = {
                multiple: false,
                parallel: false,
                store_on_failure: true,
                asyncConfig: {
                    handoffTimeout: 50, // 50ms — task will take longer
                },
                onTask: async (t, actions) => {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    actions.success(t, {async_result: "from_async"});
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            await messageQueue.addMessages(QUEUE, [task]);
            await taskHandler.startConsumingTasks(QUEUE);

            // Wait for async completion
            await new Promise(resolve => setTimeout(resolve, 2000));

            const stored = await databaseAdapter.getTasksByIds([task.id!]);
            expect(stored).toHaveLength(1);
            expect(stored[0].status).toBe("executed");
            expect(stored[0].execution_result).toEqual({async_result: "from_async"});

            const abortController = new AbortController();
            setTimeout(() => abortController.abort(), 100);
            await asyncTaskManager.shutdown(abortController.signal);
            await messageQueue.shutdown();
        }, 10000);
    });

    // ============ Phase 8: Error Forwarding ============

    describe("Phase 8: Error forwarding", () => {

        it("executor crash error appears in execution_stats.last_error", async () => {
            const messageQueue = new InMemoryQueue();
            const databaseAdapter = new InMemoryAdapter();
            const taskQueue = new TaskQueuesManager<string>(messageQueue);
            const cacheProvider = new MemoryCacheProvider();
            const taskHandler = new TaskHandler<string>(messageQueue, taskQueue, databaseAdapter, cacheProvider);

            const task = makeTask({retries: 0});
            await databaseAdapter.addTasksToScheduled([task]);

            // Executor that crashes without calling fail()
            const executor: ISingleTaskNonParallel<string, "rfc001-task"> = {
                multiple: false,
                parallel: false,
                store_on_failure: true,
                default_retries: 0,
                onTask: async (_t, _actions) => {
                    throw new Error("unhandled crash");
                }
            };

            taskQueue.register(QUEUE, "rfc001-task", executor);

            await messageQueue.addMessages(QUEUE, [task]);
            await taskHandler.startConsumingTasks(QUEUE);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const stored = await databaseAdapter.getTasksByIds([task.id!]);
            expect(stored).toHaveLength(1);
            expect(stored[0].execution_stats?.last_error).toBe("unhandled crash");

            await messageQueue.shutdown();
        });
    });
});
