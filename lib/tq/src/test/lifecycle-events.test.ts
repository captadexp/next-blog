import {describe, expect, it, mock} from "bun:test";
import {TaskRunner} from "../core/TaskRunner.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {CronTask, InMemoryAdapter} from "../adapters";
import {getEnvironmentQueueName, InMemoryQueue, QueueName} from "@supergrowthai/mq";
import {MemoryCacheProvider} from "memoose-js";
import type {IMultiTaskExecutor, ISingleTaskNonParallel} from "../core/base/interfaces.js";
import type {IFlowLifecycleProvider, ITaskLifecycleProvider, IWorkerLifecycleProvider} from "../core/lifecycle.js";
import {InMemoryFlowBarrierProvider} from "../core/flow/InMemoryFlowBarrierProvider.js";
import {FlowMiddleware} from "../core/flow/FlowMiddleware.js";
import {TaskHandler} from "../core/TaskHandler.js";
import type {FlowMeta} from "../core/flow/types.js";
import type {EntityTaskProjection, IEntityProjectionProvider} from "../core/entity/IEntityProjectionProvider.js";

// ============ Module augmentations ============

declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "test-lifecycle-queue": "test-lifecycle-queue";
        "test-consumer-queue": "test-consumer-queue";
    }

    interface MessagePayloadRegistry {
        "batch-task": { data: string };
        "single-task": { data: string };
        "child-task": { data: string };
        "lc-step-task": { data: string };
        "lc-join-task": { flow_results: any };
        "_flow.timeout": { flow_id: string; is_timeout: boolean };
        "consumer-task": { data: string };
    }
}

const queueName = "test-lifecycle-queue" as QueueName;

// ============ Helpers ============

function makeTask(
    id: string,
    type: string = "batch-task",
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

function createMockLifecycleProvider(): ITaskLifecycleProvider & { calls: Record<string, any[]> } {
    const calls: Record<string, any[]> = {
        onTaskScheduled: [],
        onTaskStarted: [],
        onTaskCompleted: [],
        onTaskFailed: [],
        onTaskBatchStarted: [],
        onTaskBatchCompleted: [],
    };
    return {
        calls,
        onTaskScheduled: mock((ctx: any) => {
            calls.onTaskScheduled.push(ctx);
        }),
        onTaskStarted: mock((ctx: any) => {
            calls.onTaskStarted.push(ctx);
        }),
        onTaskCompleted: mock((ctx: any) => {
            calls.onTaskCompleted.push(ctx);
        }),
        onTaskFailed: mock((ctx: any) => {
            calls.onTaskFailed.push(ctx);
        }),
        onTaskBatchStarted: mock((ctx: any) => {
            calls.onTaskBatchStarted.push(ctx);
        }),
        onTaskBatchCompleted: mock((ctx: any) => {
            calls.onTaskBatchCompleted.push(ctx);
        }),
    };
}

function createMockFlowLifecycleProvider(): IFlowLifecycleProvider & { calls: Record<string, any[]> } {
    const calls: Record<string, any[]> = {
        onFlowStarted: [],
        onFlowCompleted: [],
        onFlowAborted: [],
        onFlowTimedOut: [],
    };
    return {
        calls,
        onFlowStarted: mock((ctx: any) => {
            calls.onFlowStarted.push(ctx);
        }),
        onFlowCompleted: mock((ctx: any) => {
            calls.onFlowCompleted.push(ctx);
        }),
        onFlowAborted: mock((ctx: any) => {
            calls.onFlowAborted.push(ctx);
        }),
        onFlowTimedOut: mock((ctx: any) => {
            calls.onFlowTimedOut.push(ctx);
        }),
    };
}

function createMockEntityProvider(): IEntityProjectionProvider<string> & {
    calls: EntityTaskProjection<string>[][];
} {
    const calls: EntityTaskProjection<string>[][] = [];
    return {
        calls,
        upsertProjections: mock(async (entries: EntityTaskProjection<string>[]) => {
            calls.push(entries);
        }),
    };
}

function createStack(opts?: {
    lifecycleProvider?: ITaskLifecycleProvider;
    flowLifecycleProvider?: IFlowLifecycleProvider;
    entityProjection?: IEntityProjectionProvider<string>;
}) {
    const databaseAdapter = new InMemoryAdapter();
    const messageQueue = new InMemoryQueue();
    const cacheProvider = new MemoryCacheProvider();
    const taskQueue = new TaskQueuesManager<string>(messageQueue);
    const taskStore = new TaskStore<string>(databaseAdapter);
    const barrierProvider = new InMemoryFlowBarrierProvider();
    const flowMiddleware = new FlowMiddleware<string>(
        barrierProvider,
        () => databaseAdapter.generateId(),
        opts?.flowLifecycleProvider,
        "test-server-1-12345-1710000000000",
    );

    const taskRunner = new TaskRunner<string>({
        messageQueue,
        taskQueue,
        taskStore,
        cacheProvider,
        generateId: databaseAdapter.generateId.bind(databaseAdapter),
        lifecycleProvider: opts?.lifecycleProvider,
        lifecycleConfig: {include_payload: true},
        entityProjection: opts?.entityProjection,
        flowMiddleware,
        flowLifecycleProvider: opts?.flowLifecycleProvider,
        workerId: "test-server-1-12345-1710000000000",
    });

    // Register timeout executor
    const timeoutExecutor: ISingleTaskNonParallel<string, "_flow.timeout"> = {
        multiple: false,
        parallel: false,
        store_on_failure: true,
        default_retries: 0,
        onTask: async (task, actions) => {
            actions.success(task);
        },
    };
    taskQueue.register(queueName, "_flow.timeout", timeoutExecutor);

    return {
        databaseAdapter,
        messageQueue,
        cacheProvider,
        taskQueue,
        taskStore,
        taskRunner,
        barrierProvider,
        flowMiddleware,
    };
}

// ============ M1-M4: Multi-task Batch Lifecycle Events ============

describe("Multi-task batch lifecycle events", () => {

    it("M1: onTaskBatchStarted emitted with correct task_type, tasks, worker_id", async () => {
        const lp = createMockLifecycleProvider();
        const {taskQueue, taskRunner} = createStack({lifecycleProvider: lp});

        const batchExecutor: IMultiTaskExecutor<string, "batch-task"> = {
            multiple: true,
            store_on_failure: false,
            default_retries: 0,
            onTasks: async (tasks, actions) => {
                for (const t of tasks) actions.success(t);
            },
        };
        taskQueue.register(queueName, "batch-task", batchExecutor);

        const tasks = [makeTask("t1"), makeTask("t2"), makeTask("t3")];
        await taskRunner.run("worker-1", tasks);

        expect(lp.calls.onTaskBatchStarted.length).toBe(1);
        const ctx = lp.calls.onTaskBatchStarted[0];
        expect(ctx.task_type).toBe("batch-task");
        expect(ctx.queue_id).toBe(queueName);
        expect(ctx.tasks.length).toBe(3);
        expect(ctx.worker_id).toBe("test-server-1-12345-1710000000000");
        expect(ctx.started_at).toBeInstanceOf(Date);
    });

    it("M2: onTaskBatchCompleted emitted with correct succeeded/failed counts", async () => {
        const lp = createMockLifecycleProvider();
        const {taskQueue, taskRunner} = createStack({lifecycleProvider: lp});

        const batchExecutor: IMultiTaskExecutor<string, "batch-task"> = {
            multiple: true,
            store_on_failure: false,
            default_retries: 0,
            onTasks: async (tasks, actions) => {
                actions.success(tasks[0]);
                actions.success(tasks[1]);
                actions.fail(tasks[2], new Error("oops"));
            },
        };
        taskQueue.register(queueName, "batch-task", batchExecutor);

        const tasks = [makeTask("t1"), makeTask("t2"), makeTask("t3")];
        await taskRunner.run("worker-1", tasks);

        expect(lp.calls.onTaskBatchCompleted.length).toBe(1);
        const ctx = lp.calls.onTaskBatchCompleted[0];
        expect(ctx.succeeded).toEqual(["t1", "t2"]);
        expect(ctx.failed).toEqual(["t3"]);
        expect(ctx.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("M3: When onTasks throws, onTaskBatchCompleted has all tasks as failed", async () => {
        const lp = createMockLifecycleProvider();
        const {taskQueue, taskRunner} = createStack({lifecycleProvider: lp});

        const batchExecutor: IMultiTaskExecutor<string, "batch-task"> = {
            multiple: true,
            store_on_failure: false,
            default_retries: 0,
            onTasks: async () => {
                throw new Error("batch crash");
            },
        };
        taskQueue.register(queueName, "batch-task", batchExecutor);

        const tasks = [makeTask("t1"), makeTask("t2")];
        await taskRunner.run("worker-1", tasks);

        expect(lp.calls.onTaskBatchCompleted.length).toBe(1);
        const ctx = lp.calls.onTaskBatchCompleted[0];
        expect(ctx.succeeded.length).toBe(0);
        expect(ctx.failed.length).toBe(2);
    });

    it("M4: No error when lifecycleProvider is not set", async () => {
        const {taskQueue, taskRunner} = createStack(); // no lifecycle provider

        const batchExecutor: IMultiTaskExecutor<string, "batch-task"> = {
            multiple: true,
            store_on_failure: false,
            default_retries: 0,
            onTasks: async (tasks, actions) => {
                for (const t of tasks) actions.success(t);
            },
        };
        taskQueue.register(queueName, "batch-task", batchExecutor);

        const tasks = [makeTask("t1"), makeTask("t2")];
        // Should not throw
        const result = await taskRunner.run("worker-1", tasks);
        expect(result.successTasks.length).toBe(2);
    });
});

// ============ Async Scheduling Lifecycle Events ============
// TODO: These tests require the async timeout handoff path (AsyncTaskManager mock +
//   executor with asyncConfig.handoffTimeout) to properly exercise:
//   - AsyncActions.onScheduled → onTaskScheduled for async-spawned child tasks
//   - Entity projections written in AsyncActions.scheduleNewTasks for entity-bearing children
//   - Partition key enrichment via executor.getPartitionKey in AsyncActions.scheduleNewTasks
//   The sync TaskRunner.run() path does NOT exercise AsyncActions — child tasks are returned
//   as newTasks and processed by TaskHandler.addTasks (which has its own test coverage).

describe.todo("Async scheduling lifecycle events — requires async timeout handoff path", () => {
});

// ============ F1-F6: Flow Lifecycle Events ============

describe("Flow lifecycle events", () => {

    it("F1: onFlowStarted emitted on actions.startFlow()", async () => {
        const flowLp = createMockFlowLifecycleProvider();
        const {taskQueue, taskRunner} = createStack({flowLifecycleProvider: flowLp});

        const executor: ISingleTaskNonParallel<string, "single-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.startFlow({
                    steps: [
                        {type: "lc-step-task", queue_id: queueName, payload: {data: "s1"}},
                        {type: "lc-step-task", queue_id: queueName, payload: {data: "s2"}},
                    ],
                    config: {
                        join: {type: "lc-join-task", queue_id: queueName},
                        failure_policy: "continue",
                    }
                });
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "single-task", executor);

        const stepExecutor: ISingleTaskNonParallel<string, "lc-step-task"> = {
            multiple: false, parallel: false, store_on_failure: true, default_retries: 0,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "lc-step-task", stepExecutor);

        await taskRunner.run("worker-1", [makeTask("trigger-1", "single-task")]);

        expect(flowLp.calls.onFlowStarted.length).toBe(1);
        const ctx = flowLp.calls.onFlowStarted[0];
        expect(ctx.total_steps).toBe(2);
        expect(ctx.join.type).toBe("lc-join-task");
        expect(ctx.failure_policy).toBe("continue");
        expect(ctx.step_types).toEqual(["lc-step-task", "lc-step-task"]);
        expect(ctx.started_at).toBeInstanceOf(Date);
    });

    it("F2: onFlowCompleted emitted when barrier hits 0", async () => {
        const flowLp = createMockFlowLifecycleProvider();
        const {flowMiddleware, barrierProvider} = createStack({flowLifecycleProvider: flowLp});

        const flowId = "flow-complete-1";
        await barrierProvider.initBarrier(flowId, 2);

        const flowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 2,
            join: {type: "lc-join-task", queue_id: queueName},
            failure_policy: "continue",
        };

        const t1 = makeTask("s1", "lc-step-task", {
            metadata: {flow_meta: flowMeta as unknown as Record<string, unknown>},
        });
        const t2 = makeTask("s2", "lc-step-task", {
            metadata: {flow_meta: {...flowMeta, step_index: 1} as unknown as Record<string, unknown>},
        });

        const result = await flowMiddleware.onPostProcess({
            successTasks: [t1, t2],
            failedTasks: [],
        });

        expect(result.joinTasks.length).toBe(1);
        expect(flowLp.calls.onFlowCompleted.length).toBe(1);
        const ctx = flowLp.calls.onFlowCompleted[0];
        expect(ctx.flow_id).toBe(flowId);
        expect(ctx.steps_succeeded).toBe(2);
        expect(ctx.steps_failed).toBe(0);
        expect(ctx.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("F3: onFlowAborted emitted on step failure with failure_policy: abort", async () => {
        const flowLp = createMockFlowLifecycleProvider();
        const {flowMiddleware, barrierProvider} = createStack({flowLifecycleProvider: flowLp});

        const flowId = "flow-abort-1";
        await barrierProvider.initBarrier(flowId, 3);

        const flowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 3,
            join: {type: "lc-join-task", queue_id: queueName},
            failure_policy: "abort",
        };

        const t1 = makeTask("s1", "lc-step-task", {
            metadata: {flow_meta: flowMeta as unknown as Record<string, unknown>},
        });
        const tFail = makeTask("s2", "lc-step-task", {
            metadata: {flow_meta: {...flowMeta, step_index: 1} as unknown as Record<string, unknown>},
            execution_stats: {last_error: "step 2 failed"},
        });

        const result = await flowMiddleware.onPostProcess({
            successTasks: [t1],
            failedTasks: [tFail],
        });

        expect(result.joinTasks.length).toBe(1);
        expect(flowLp.calls.onFlowAborted.length).toBe(1);
        const ctx = flowLp.calls.onFlowAborted[0];
        expect(ctx.flow_id).toBe(flowId);
        expect(ctx.trigger_step_index).toBe(1);
        expect(ctx.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("F4: onFlowTimedOut emitted when timeout sentinel fires", async () => {
        const flowLp = createMockFlowLifecycleProvider();
        const {flowMiddleware, barrierProvider} = createStack({flowLifecycleProvider: flowLp});

        const flowId = "flow-timeout-1";
        // Do NOT init barrier yet — timeout can fire before any step completes

        const timeoutFlowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: -1,
            total_steps: 3,
            join: {type: "lc-join-task", queue_id: queueName},
            failure_policy: "continue",
            is_timeout: true,
        };

        const timeoutTask = makeTask("timeout-1", "_flow.timeout", {
            payload: {flow_id: flowId, is_timeout: true},
            metadata: {flow_meta: timeoutFlowMeta as unknown as Record<string, unknown>},
        });

        // Timeout task arrives as a "success" (it completed its own execution)
        const result = await flowMiddleware.onPostProcess({
            successTasks: [timeoutTask],
            failedTasks: [],
        });

        expect(result.joinTasks.length).toBe(1);
        expect(flowLp.calls.onFlowTimedOut.length).toBe(1);
        const ctx = flowLp.calls.onFlowTimedOut[0];
        expect(ctx.flow_id).toBe(flowId);
        expect(ctx.steps_completed).toBe(0);
    });

    it("F5: No events when flowLifecycleProvider not set", async () => {
        const {flowMiddleware, barrierProvider} = createStack(); // no flow lifecycle provider

        const flowId = "flow-no-lp";
        await barrierProvider.initBarrier(flowId, 1);

        const flowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 1,
            join: {type: "lc-join-task", queue_id: queueName},
            failure_policy: "continue",
        };

        const t1 = makeTask("s1", "lc-step-task", {
            metadata: {flow_meta: flowMeta as unknown as Record<string, unknown>},
        });

        // Should not throw
        const result = await flowMiddleware.onPostProcess({
            successTasks: [t1],
            failedTasks: [],
        });

        expect(result.joinTasks.length).toBe(1);
    });

    // TODO: F6 — Full TaskHandler integration test for flow lifecycle.
    //   Requires running trigger task through TaskHandler.startConsumingTasks (not just TaskRunner.run)
    //   to verify onFlowStarted fires via Actions and onFlowCompleted fires via FlowMiddleware
    //   in a single end-to-end flow through the consume loop.
    it.todo("F6: Flow lifecycle end-to-end through TaskHandler consume loop", () => {
    });
});

// ============ C1-C5: Consumer Lifecycle Events ============

const consumerQueueName = "test-consumer-queue" as QueueName;

function createMockWorkerProvider(): IWorkerLifecycleProvider & { calls: Record<string, any[]> } {
    const calls: Record<string, any[]> = {
        onWorkerStarted: [],
        onWorkerHeartbeat: [],
        onWorkerStopped: [],
        onBatchStarted: [],
        onBatchCompleted: [],
        onConsumerStarted: [],
        onConsumerStopped: [],
    };
    return {
        calls,
        onWorkerStarted: mock((info: any) => {
            calls.onWorkerStarted.push(info);
        }),
        onWorkerHeartbeat: mock((info: any) => {
            calls.onWorkerHeartbeat.push(info);
        }),
        onWorkerStopped: mock((info: any) => {
            calls.onWorkerStopped.push(info);
        }),
        onBatchStarted: mock((info: any) => {
            calls.onBatchStarted.push(info);
        }),
        onBatchCompleted: mock((info: any) => {
            calls.onBatchCompleted.push(info);
        }),
        onConsumerStarted: mock((info: any) => {
            calls.onConsumerStarted.push(info);
        }),
        onConsumerStopped: mock((info: any) => {
            calls.onConsumerStopped.push(info);
        }),
    };
}

function createConsumerStack(opts?: {
    workerProvider?: IWorkerLifecycleProvider;
    heartbeat_interval_ms?: number;
}) {
    const databaseAdapter = new InMemoryAdapter();
    const messageQueue = new InMemoryQueue();
    const cacheProvider = new MemoryCacheProvider();
    const taskQueue = new TaskQueuesManager<string>(messageQueue);

    // Register the queue with the MQ backend so addMessages/consumeMessagesStream work
    messageQueue.register(consumerQueueName);

    const taskHandler = new TaskHandler<string>(
        messageQueue,
        taskQueue,
        databaseAdapter,
        cacheProvider,
        undefined,
        undefined,
        {
            workerProvider: opts?.workerProvider,
            lifecycle: {
                heartbeat_interval_ms: opts?.heartbeat_interval_ms ?? 5000,
            },
        }
    );

    return {databaseAdapter, messageQueue, cacheProvider, taskQueue, taskHandler};
}

function makeConsumerTask(
    id: string,
    type: string = "consumer-task",
    overrides: Partial<CronTask<string>> = {}
): CronTask<string> {
    return {
        id,
        type,
        queue_id: consumerQueueName,
        payload: {data: "test"},
        execute_at: new Date(),
        status: "scheduled",
        retries: 0,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides,
    } as CronTask<string>;
}

describe("Consumer Lifecycle Events", () => {

    it("C1: onConsumerStarted fires on first batch per consumer_id", async () => {
        const workerProvider = createMockWorkerProvider();
        const {taskQueue, taskHandler, messageQueue} = createConsumerStack({workerProvider});

        const executor: ISingleTaskNonParallel<string, "consumer-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(consumerQueueName, "consumer-task", executor);

        const abortController = new AbortController();

        // Register the stream consumer — this sets up the interval callback
        taskHandler.startConsumingTasks(consumerQueueName, abortController.signal);

        // Add tasks to the queue so the next poll finds them
        await taskHandler.addTasks([makeConsumerTask("c1-t1"), makeConsumerTask("c1-t2")]);

        // Wait for the 1000ms polling interval to fire and process the batch
        await new Promise(resolve => setTimeout(resolve, 1200));

        abortController.abort();

        expect(workerProvider.calls.onConsumerStarted.length).toBe(1);
        const info = workerProvider.calls.onConsumerStarted[0];
        const expectedConsumerId = `memory:${getEnvironmentQueueName(consumerQueueName)}`;
        expect(info.consumer_id).toBe(expectedConsumerId);
        expect(info.queue_id).toBe(consumerQueueName);
        expect(typeof info.worker_id).toBe("string");
        expect(info.started_at).toBeInstanceOf(Date);
    }, 5000);

    it("C2: onConsumerStarted fires only ONCE per consumer_id across multiple batches", async () => {
        const workerProvider = createMockWorkerProvider();
        const {taskQueue, taskHandler, messageQueue} = createConsumerStack({workerProvider});

        const executor: ISingleTaskNonParallel<string, "consumer-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(consumerQueueName, "consumer-task", executor);

        const abortController = new AbortController();
        taskHandler.startConsumingTasks(consumerQueueName, abortController.signal);

        // First batch
        await taskHandler.addTasks([makeConsumerTask("c2-t1")]);
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Second batch — consumer already registered, should NOT fire again
        await taskHandler.addTasks([makeConsumerTask("c2-t2")]);
        await new Promise(resolve => setTimeout(resolve, 1200));

        abortController.abort();

        // onConsumerStarted must have fired exactly once despite two batches
        expect(workerProvider.calls.onConsumerStarted.length).toBe(1);
    }, 8000);

    it("C3: onConsumerStopped fires for each active consumer on shutdown", async () => {
        const workerProvider = createMockWorkerProvider();
        const {taskQueue, taskHandler} = createConsumerStack({workerProvider});

        const executor: ISingleTaskNonParallel<string, "consumer-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(consumerQueueName, "consumer-task", executor);

        const abortController = new AbortController();

        // Add tasks and start consuming to register the consumer
        await taskHandler.addTasks([makeConsumerTask("c3-t1")]);
        taskHandler.startConsumingTasks(consumerQueueName, abortController.signal);
        await new Promise(resolve => setTimeout(resolve, 1200));

        // emitAllConsumersStopped is called by taskProcessServer's abort listener.
        // In tests we call it directly via private method access to verify the behavior.
        (taskHandler as any).emitAllConsumersStopped("shutdown");

        expect(workerProvider.calls.onConsumerStopped.length).toBeGreaterThanOrEqual(1);
        const stoppedInfo = workerProvider.calls.onConsumerStopped[0];
        const expectedConsumerId = `memory:${getEnvironmentQueueName(consumerQueueName)}`;
        expect(stoppedInfo.consumer_id).toBe(expectedConsumerId);
        expect(stoppedInfo.reason).toBe("shutdown");
        expect(stoppedInfo.stats).toBeDefined();
        expect(typeof stoppedInfo.stats.tasks_processed).toBe("number");

        abortController.abort();
    }, 5000);

    it("C4: Heartbeat includes active_consumers with consumer stats", async () => {
        const workerProvider = createMockWorkerProvider();
        const {taskQueue, taskHandler} = createConsumerStack({
            workerProvider,
            heartbeat_interval_ms: 100,
        });

        const executor: ISingleTaskNonParallel<string, "consumer-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(consumerQueueName, "consumer-task", executor);

        const abortController = new AbortController();

        // Start consuming and process a batch so the consumer registers
        await taskHandler.addTasks([makeConsumerTask("c4-t1")]);
        taskHandler.startConsumingTasks(consumerQueueName, abortController.signal);
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Manually trigger heartbeat via private method access (test-only pattern)
        (taskHandler as any).emitWorkerHeartbeat();

        abortController.abort();

        expect(workerProvider.calls.onWorkerHeartbeat.length).toBeGreaterThanOrEqual(1);
        const heartbeat = workerProvider.calls.onWorkerHeartbeat[0];
        expect(Array.isArray(heartbeat.active_consumers)).toBe(true);
        expect(heartbeat.active_consumers.length).toBeGreaterThanOrEqual(1);
        const consumerStats = heartbeat.active_consumers[0];
        const expectedConsumerId = `memory:${getEnvironmentQueueName(consumerQueueName)}`;
        expect(consumerStats.consumer_id).toBe(expectedConsumerId);
        expect(typeof consumerStats.tasks_processed).toBe("number");
        expect(typeof consumerStats.tasks_succeeded).toBe("number");
    }, 5000);

    it("C5: No error when workerProvider is not set", async () => {
        const {taskQueue, taskHandler} = createConsumerStack(); // no workerProvider

        const executor: ISingleTaskNonParallel<string, "consumer-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: false,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.success(task);
            },
        };
        taskQueue.register(consumerQueueName, "consumer-task", executor);

        const abortController = new AbortController();

        await taskHandler.addTasks([makeConsumerTask("c5-t1")]);
        taskHandler.startConsumingTasks(consumerQueueName, abortController.signal);

        // Should not throw even without a workerProvider
        await new Promise(resolve => setTimeout(resolve, 1200));

        abortController.abort();
        // If we get here without an exception, the test passes
        expect(true).toBe(true);
    }, 5000);
});
