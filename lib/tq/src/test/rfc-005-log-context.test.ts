import {describe, expect, it, spyOn} from "bun:test";
import {TaskRunner} from "../core/TaskRunner.js";
import {TaskHandler} from "../core/TaskHandler.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {CronTask, InMemoryAdapter} from "../adapters";
import {InMemoryQueue, QueueName} from "@supergrowthai/mq";
import {MemoryCacheProvider} from "memoose-js";
import {getLogContext, runWithLogContext} from "../core/log-context.js";
import type {IMultiTaskExecutor, ISingleTaskNonParallel, ISingleTaskParallel} from "../core/base/interfaces.js";
import type {ITaskLifecycleProvider} from "../core/lifecycle.js";

declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "test-log-queue": "test-log-queue";
    }

    interface MessagePayloadRegistry {
        "log-task": { data: string };
        "log-task-b": { data: string };
    }
}

const queueName = "test-log-queue" as QueueName;

function makeTask(
    id: string,
    type: string = "log-task",
    overrides: Partial<CronTask<string>> = {}
): CronTask<string> {
    return {
        id,
        type,
        queue_id: queueName,
        payload: {data: "test"},
        execute_at: new Date(),
        status: "scheduled",
        retries: 0,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides,
    } as CronTask<string>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============ B. AsyncLocalStorage — runWithLogContext Isolation ============

describe("B. ALS — runWithLogContext isolation", () => {
    it("B1: ALS store is set inside callback and cleared after", () => {
        let insideStore: Record<string, string> | undefined;

        runWithLogContext({user_id: "abc"}, () => {
            insideStore = getLogContext();
        });

        expect(insideStore).toEqual({user_id: "abc"});
        expect(getLogContext()).toBeUndefined();
    });

    it("B2: nested runWithLogContext: inner scope wins, outer restored", () => {
        let innerStore: Record<string, string> | undefined;
        let outerAfterInner: Record<string, string> | undefined;

        runWithLogContext({a: "1"}, () => {
            runWithLogContext({b: "2"}, () => {
                innerStore = getLogContext();
            });
            outerAfterInner = getLogContext();
        });

        expect(innerStore).toEqual({b: "2"});
        expect(outerAfterInner).toEqual({a: "1"});
    });

    it("B3: ALS store propagates through async/await", async () => {
        const result = await runWithLogContext({user_id: "async"}, async () => {
            await delay(10);
            return getLogContext();
        });

        expect(result).toEqual({user_id: "async"});
    });
});

// ============ C. Task Execution — Single Task Context Propagation ============

describe("C. Single-task context propagation", () => {
    it("C1: single-task executor logs carry task's log_context", async () => {
        const captured: string[] = [];
        const spy = spyOn(console, "info").mockImplementation((...args: any[]) => {
            captured.push(args.join(" "));
        });

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice", campaign_id: "c42"}},
        });

        await taskRunner.run("worker-1", [task]);

        const contextLines = captured.filter(
            (line) => line.includes("[user_id:alice]") && line.includes("[campaign_id:c42]")
        );
        expect(contextLines.length).toBeGreaterThan(0);

        spy.mockRestore();
    });

    it("C2: single-task executor logs also contain runtime context (task_id, worker_id)", async () => {
        const captured: string[] = [];
        const spy = spyOn(console, "info").mockImplementation((...args: any[]) => {
            captured.push(args.join(" "));
        });

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            workerId: "worker-1"
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice", campaign_id: "c42"}},
        });

        await taskRunner.run("worker-1", [task]);

        const contextLines = captured.filter(
            (line) =>
                line.includes("[user_id:alice]") &&
                line.includes("[campaign_id:c42]") &&
                line.includes("[task_id:") &&
                line.includes("[worker_id:worker-1]")
        );
        expect(contextLines.length).toBeGreaterThan(0);

        spy.mockRestore();
    });

    it("C3: task without log_context — runtime-only context, no user keys", async () => {
        const captured: string[] = [];
        const spy = spyOn(console, "info").mockImplementation((...args: any[]) => {
            captured.push(args.join(" "));
        });

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task");
        // no log_context field

        await taskRunner.run("worker-1", [task]);

        const runtimeLines = captured.filter(
            (line) => line.includes("[task_id:") && line.includes("[worker_id:")
        );
        expect(runtimeLines.length).toBeGreaterThan(0);

        // No user context brackets like [user_id:]
        const userContextLines = captured.filter((line) => line.includes("[user_id:"));
        expect(userContextLines.length).toBe(0);

        spy.mockRestore();
    });
});

// ============ D. Parallel Execution — ALS Isolation ============

describe("D. Parallel execution — ALS isolation", () => {
    it("D1: parallel tasks see isolated ALS contexts", async () => {
        const contextsSeenByExecutor: Record<string, Record<string, string> | undefined> = {};

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskParallel<string, "log-task"> = {
            multiple: false,
            parallel: true,
            chunkSize: 2,
            store_on_failure: true,
            onTask: async (task, actions) => {
                await delay(50); // force interleaving
                contextsSeenByExecutor[task.id!] = getLogContext();
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const taskA = makeTask("task-alice", "log-task", {
            metadata: {log_context: {user_id: "alice"}},
        });
        const taskB = makeTask("task-bob", "log-task", {
            metadata: {log_context: {user_id: "bob"}},
        });

        await taskRunner.run("worker-1", [taskA, taskB]);

        expect(contextsSeenByExecutor["task-alice"]?.user_id).toBe("alice");
        expect(contextsSeenByExecutor["task-bob"]?.user_id).toBe("bob");
    });

    it("D2: parallel executor — one task throws, other task's context is unaffected", async () => {
        const contextsSeenByExecutor: Record<string, Record<string, string> | undefined> = {};

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskParallel<string, "log-task"> = {
            multiple: false,
            parallel: true,
            chunkSize: 2,
            store_on_failure: true,
            onTask: async (task, actions) => {
                if (task.id === "task-a-throw") {
                    await delay(50);
                    throw new Error("Task A failed intentionally");
                }
                // Task B succeeds after 100ms
                await delay(100);
                contextsSeenByExecutor[task.id!] = getLogContext();
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const taskA = makeTask("task-a-throw", "log-task", {
            metadata: {log_context: {user_id: "alice"}},
        });
        const taskB = makeTask("task-b-succeed", "log-task", {
            metadata: {log_context: {user_id: "bob"}},
        });

        await taskRunner.run("worker-1", [taskA, taskB]);

        // Task B's context must still show its own user_id despite Task A throwing
        expect(contextsSeenByExecutor["task-b-succeed"]?.user_id).toBe("bob");
    });
});

// ============ E. Multi-Task Executor — Runtime-Only Context ============

describe("E. Multi-task executor", () => {
    it("E1: multi-task executor ALS has runtime-only context", async () => {
        let alsContext: Record<string, string> | undefined;

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            workerId: "worker-1"
        });

        const executor: IMultiTaskExecutor<string, "log-task"> = {
            multiple: true,
            store_on_failure: true,
            onTasks: async (tasks, actions) => {
                alsContext = getLogContext();
                for (const task of tasks) {
                    actions.success(task);
                }
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const tasks = [
            makeTask("multi-1", "log-task", {metadata: {log_context: {user_id: "alice"}}}),
            makeTask("multi-2", "log-task", {metadata: {log_context: {user_id: "bob"}}}),
        ];

        await taskRunner.run("worker-1", tasks);

        expect(alsContext).toBeDefined();
        expect(alsContext!.worker_id).toBe("worker-1");
        expect(alsContext!.user_id).toBeUndefined();
    });

    it("E2: multi-task executor — task.log_context accessible per-task", async () => {
        const taskContextsRead: Record<string, Record<string, string> | undefined> = {};

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: IMultiTaskExecutor<string, "log-task"> = {
            multiple: true,
            store_on_failure: true,
            onTasks: async (tasks, actions) => {
                for (const task of tasks) {
                    taskContextsRead[task.id!] = (task as any).metadata?.log_context;
                    actions.success(task);
                }
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const tasks = [
            makeTask("multi-e2-1", "log-task", {metadata: {log_context: {user_id: "alice", req_id: "r1"}}}),
            makeTask("multi-e2-2", "log-task", {metadata: {log_context: {user_id: "bob", req_id: "r2"}}}),
        ];

        await taskRunner.run("worker-1", tasks);

        expect(taskContextsRead["multi-e2-1"]).toEqual({user_id: "alice", req_id: "r1"});
        expect(taskContextsRead["multi-e2-2"]).toEqual({user_id: "bob", req_id: "r2"});
    });
});

// ============ F. Child Task Inheritance ============

describe("F. Child task inheritance", () => {
    it("F1: child tasks inherit parent log_context with child keys winning", async () => {
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.addTasks([
                    makeTask("", "log-task", {
                        execute_at: new Date(Date.now() + 600_000),
                        metadata: {log_context: {step: "receipt"}},
                    }),
                ]);
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice", req_id: "r1"}},
        });

        const results = await taskRunner.run("worker-1", [task]);

        // Child task in newTasks should have merged log_context
        expect(results.newTasks).toHaveLength(1);
        const child = results.newTasks[0];
        expect(child.metadata?.log_context).toEqual({
            user_id: "alice",
            req_id: "r1",
            step: "receipt",
        });
    });

    it("F2: child key takes precedence over parent key", async () => {
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const results_newTasks: CronTask<string>[] = [];

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.addTasks([
                    makeTask("", "log-task", {
                        execute_at: new Date(Date.now() + 600_000),
                        metadata: {log_context: {step: "child"}},
                    }),
                ]);
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {env: "prod", step: "parent"}},
        });

        const results = await taskRunner.run("worker-1", [task]);

        expect(results.newTasks).toHaveLength(1);
        const child = results.newTasks[0];
        // child's step wins over parent's step; env inherited from parent
        expect(child.metadata?.log_context).toEqual({env: "prod", step: "child"});
    });

    it("F3: parent with no log_context — child keeps its own context unchanged", async () => {
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.addTasks([
                    makeTask("", "log-task", {
                        execute_at: new Date(Date.now() + 600_000),
                        metadata: {log_context: {step: "receipt"}},
                    }),
                ]);
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        // Parent task has no log_context
        const task = makeTask(databaseAdapter.generateId(), "log-task");

        const results = await taskRunner.run("worker-1", [task]);

        expect(results.newTasks).toHaveLength(1);
        const child = results.newTasks[0];
        // Child context unchanged — not undefined, not empty
        expect(child.metadata?.log_context).toEqual({step: "receipt"});
    });
});

// ============ G. Retry Path — DB Persistence Round-Trip ============

describe("G. Retry persistence", () => {
    it("G1: log_context persists through retry cycle", async () => {
        let attempt = 0;
        let retryContext: Record<string, string> | undefined;

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            default_retries: 2,
            onTask: async (task, actions) => {
                attempt++;
                if (attempt === 1) {
                    actions.fail(task, new Error("transient"));
                } else {
                    retryContext = getLogContext();
                    actions.success(task);
                }
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const taskId = databaseAdapter.generateId();
        const task = makeTask(taskId, "log-task", {
            retries: 2,
            retry_after: 100,
            metadata: {log_context: {user_id: "alice", req_id: "r1"}},
        });

        // Pre-store task in DB (simulates how TaskHandler persists tasks with store_on_failure)
        await databaseAdapter.addTasksToScheduled([task]);

        // First execution — fails
        const firstRun = await taskRunner.run("worker-1", [task]);

        // Simulate retry persistence: upsert failed task back to DB
        if (firstRun.failedTasks.length > 0) {
            await databaseAdapter.upsertTasks(firstRun.failedTasks.map(t => ({
                ...t,
                status: 'scheduled' as const,
                execute_at: new Date(),
                execution_stats: {...(t.execution_stats || {}), retry_count: 1},
            })));
        }

        // Simulate retry: read task from DB, re-execute
        const [storedTask] = await databaseAdapter.getTasksByIds([taskId]);
        await taskRunner.run("worker-1", [storedTask]);

        expect(retryContext?.user_id).toBe("alice");
        expect(retryContext?.req_id).toBe("r1");
    });
});

// ============ H. Async Handoff — ALS Propagation ============

describe("H. Async handoff", () => {
    it("H1: ALS context survives async handoff past handoffTimeout", async () => {
        let asyncContext: Record<string, string> | undefined;

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            asyncConfig: {handoffTimeout: 50},
            onTask: async (task, actions) => {
                await delay(100); // past handoff timeout
                asyncContext = getLogContext();
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice"}},
        });

        const {AsyncTaskManager} = await import("../core/async/AsyncTaskManager.js");
        const asyncManager = new AsyncTaskManager<string>(10);
        const results = await taskRunner.run("worker-1", [task], asyncManager);

        if (results.asyncTasks.length > 0) {
            asyncManager.handoffTask(results.asyncTasks[0].task, results.asyncTasks[0].promise);
            await delay(300);
        }

        expect(asyncContext?.user_id).toBe("alice");
    });
});

// ============ I. Lifecycle Events — log_context in TaskContext ============

describe("I. Lifecycle events", () => {
    it("I1: onTaskCompleted lifecycle event includes log_context", async () => {
        let completedCtx: any;
        const lifecycleProvider: ITaskLifecycleProvider = {
            onTaskCompleted: (ctx) => {
                completedCtx = ctx;
            },
        };

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            lifecycleProvider
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice", campaign_id: "c42"}},
        });

        await taskRunner.run("worker-1", [task]);

        expect(completedCtx).toBeDefined();
        expect(completedCtx.log_context).toEqual({user_id: "alice", campaign_id: "c42"});
    });

    it("I2: onTaskFailed lifecycle event includes log_context", async () => {
        let failedCtx: any;
        const lifecycleProvider: ITaskLifecycleProvider = {
            onTaskFailed: (ctx) => {
                failedCtx = ctx;
            },
        };

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            lifecycleProvider
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.fail(task, new Error("deliberate failure"));
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice", campaign_id: "c42"}},
        });

        await taskRunner.run("worker-1", [task]);

        expect(failedCtx).toBeDefined();
        expect(failedCtx.log_context).toEqual({user_id: "alice", campaign_id: "c42"});
    });

    it("I3: onTaskScheduled lifecycle event includes log_context", async () => {
        let scheduledCtx: any;
        const lifecycleProvider: ITaskLifecycleProvider = {
            onTaskScheduled: (ctx) => {
                scheduledCtx = ctx;
            },
        };

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider,
            undefined, undefined,
            {lifecycleProvider}
        );

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            execute_at: new Date(Date.now() + 600_000), // future — goes to DB
            metadata: {log_context: {user_id: "alice", campaign_id: "c42"}},
        });

        await taskHandler.addTasks([task]);

        expect(scheduledCtx).toBeDefined();
        expect(scheduledCtx.log_context).toEqual({user_id: "alice", campaign_id: "c42"});
    });
});

// ============ J. Size Validation ============

describe("J. Size validation", () => {
    it("J1: log_context exceeding 10 keys is truncated at submission", async () => {
        const warnings: string[] = [];
        const spy = spyOn(console, "warn").mockImplementation((...args: any[]) => {
            warnings.push(args.join(" "));
        });

        const bigContext: Record<string, string> = {};
        for (let i = 0; i < 15; i++) {
            bigContext[`key_${i}`] = `val_${i}`;
        }

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider
        );

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: bigContext},
            execute_at: new Date(Date.now() + 600_000), // future — goes to DB
        });

        await taskHandler.addTasks([task]);

        const [stored] = await databaseAdapter.getTasksByIds([task.id!]);
        expect(Object.keys(stored.metadata?.log_context || {}).length).toBeLessThanOrEqual(10);

        const warningLogged = warnings.some((w) => w.includes("log_context"));
        expect(warningLogged).toBe(true);

        spy.mockRestore();
    });

    it("J2: log_context exceeding 1KB is dropped entirely with warning", async () => {
        const warnings: string[] = [];
        const spy = spyOn(console, "warn").mockImplementation((...args: any[]) => {
            warnings.push(args.join(" "));
        });

        // 5 keys each with ~250 byte values (~1.25KB total)
        const largeContext: Record<string, string> = {};
        for (let i = 0; i < 5; i++) {
            largeContext[`key_${i}`] = "x".repeat(250);
        }

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider
        );

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: largeContext},
            execute_at: new Date(Date.now() + 600_000),
        });

        await taskHandler.addTasks([task]);

        const [stored] = await databaseAdapter.getTasksByIds([task.id!]);
        // Entire context must be dropped when total size exceeds 1KB
        const storedKeys = Object.keys(stored.metadata?.log_context || {});
        expect(storedKeys.length).toBe(0);

        const warningLogged = warnings.some((w) => w.includes("log_context"));
        expect(warningLogged).toBe(true);

        spy.mockRestore();
    });

    it("J3: log_context within limits — preserved unchanged", async () => {
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider
        );

        // 3 keys totaling ~100 bytes
        const validContext = {
            user_id: "alice",
            req_id: "r1234",
            env: "prod",
        };

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: validContext},
            execute_at: new Date(Date.now() + 600_000),
        });

        await taskHandler.addTasks([task]);

        const [stored] = await databaseAdapter.getTasksByIds([task.id!]);
        expect(stored.metadata?.log_context).toEqual(validContext);
    });
});

// ============ K. Runtime Key Collision ============

describe("K. Runtime key collision", () => {
    it("K1: runtime keys override user-submitted keys with same name", async () => {
        let alsContext: Record<string, string> | undefined;

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            workerId: "real-worker"
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                alsContext = getLogContext();
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const taskId = databaseAdapter.generateId();
        const task = makeTask(taskId, "log-task", {
            metadata: {log_context: {task_id: "spoofed", worker_id: "fake"}},
        });

        await taskRunner.run("real-worker", [task]);

        expect(alsContext?.task_id).not.toBe("spoofed");
        expect(alsContext?.worker_id).toBe("real-worker");
    });
});

// ============ L. actions.log — Forked Action Child Logger ============

describe("L. actions.log", () => {
    it("L1: actions.log on forked actions includes task's log_context keys", async () => {
        const captured: string[] = [];
        const spy = spyOn(console, "info").mockImplementation((...args: any[]) => {
            captured.push(args.join(" "));
        });

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.log.info("test message from executor");
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice", campaign_id: "c42"}},
        });

        await taskRunner.run("worker-1", [task]);

        const executorLines = captured.filter((line) => line.includes("test message from executor"));
        expect(executorLines.length).toBeGreaterThan(0);
        expect(executorLines[0]).toContain("[user_id:alice]");
        expect(executorLines[0]).toContain("[campaign_id:c42]");

        spy.mockRestore();
    });

    it("L2: actions.log on root actions has runtime-only context", async () => {
        const captured: string[] = [];
        const spy = spyOn(console, "info").mockImplementation((...args: any[]) => {
            captured.push(args.join(" "));
        });

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            workerId: "worker-1"
        });

        const executor: IMultiTaskExecutor<string, "log-task"> = {
            multiple: true,
            store_on_failure: true,
            onTasks: async (tasks, actions) => {
                actions.log.info("processing batch");
                for (const task of tasks) {
                    actions.success(task);
                }
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const tasks = [
            makeTask("multi-1", "log-task", {metadata: {log_context: {user_id: "alice"}}}),
            makeTask("multi-2", "log-task", {metadata: {log_context: {user_id: "bob"}}}),
        ];

        await taskRunner.run("worker-1", tasks);

        const batchLines = captured.filter((line) => line.includes("processing batch"));
        expect(batchLines.length).toBeGreaterThan(0);
        expect(batchLines[0]).toContain("[worker_id:worker-1]");
        expect(batchLines[0]).not.toContain("[user_id:");

        spy.mockRestore();
    });
});

// ============ M. Value Sanitization in Log Output ============

describe("M. Value sanitization", () => {
    it("M1: special characters in log_context values are sanitized in output", async () => {
        const captured: string[] = [];
        const spy = spyOn(console, "info").mockImplementation((...args: any[]) => {
            captured.push(args.join(" "));
        });

        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId()
        });

        const executor: ISingleTaskNonParallel<string, "log-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "log-task", executor);

        const task = makeTask(databaseAdapter.generateId(), "log-task", {
            metadata: {log_context: {user_id: "alice", note: "test]value\ninjected"}},
        });

        await taskRunner.run("worker-1", [task]);

        const contextLines = captured.filter((line) => line.includes("[user_id:alice]"));
        expect(contextLines.length).toBeGreaterThan(0);
        // ] and \n should be sanitized to _
        expect(contextLines[0]).toContain("[note:test_value_injected]");
        expect(contextLines[0]).not.toContain("\n");

        spy.mockRestore();
    });
});
