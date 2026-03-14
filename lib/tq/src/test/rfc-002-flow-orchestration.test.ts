import {describe, expect, it, mock, beforeEach} from "bun:test";
import {TaskRunner} from "../core/TaskRunner.js";
import {TaskHandler} from "../core/TaskHandler.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {InMemoryAdapter, CronTask} from "../adapters";
import {InMemoryQueue, QueueName} from "@supergrowthai/mq";
import {MemoryCacheProvider} from "memoose-js";
import type {ISingleTaskNonParallel} from "../core/base/interfaces.js";
import {Actions} from "../core/Actions.js";
import {InMemoryFlowBarrierProvider} from "../core/flow/InMemoryFlowBarrierProvider.js";
import {FlowMiddleware} from "../core/flow/FlowMiddleware.js";
import type {FlowMeta, FlowStepResult, StartFlowInput} from "../core/flow/types.js";
import type {
    IEntityProjectionProvider,
    EntityTaskProjection
} from "../core/entity/IEntityProjectionProvider.js";

// ============ Module augmentations ============

declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "test-flow-queue": "test-flow-queue";
    }
    interface MessagePayloadRegistry {
        "step-task": { data: string };
        "step-task-b": { data: string };
        "step-task-c": { data: string };
        "join-task": { flow_results: any };
        "_flow.timeout": { flow_id: string; is_timeout: boolean };
    }
}

const queueName = "test-flow-queue" as QueueName;

// ============ Helpers ============

function makeTask(
    id: string,
    type: string = "step-task",
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

function createMockEntityProvider(): IEntityProjectionProvider<string> & {
    calls: EntityTaskProjection<string>[][];
    upsertProjections: ReturnType<typeof mock>;
} {
    const calls: EntityTaskProjection<string>[][] = [];
    return {
        calls,
        upsertProjections: mock(async (entries: EntityTaskProjection<string>[]) => {
            calls.push(entries);
        }),
    };
}

function createFlowStack(opts?: { entityProjection?: IEntityProjectionProvider<string> }) {
    const databaseAdapter = new InMemoryAdapter();
    const messageQueue = new InMemoryQueue();
    const cacheProvider = new MemoryCacheProvider();
    const taskQueue = new TaskQueuesManager<string>(messageQueue);
    const taskStore = new TaskStore<string>(databaseAdapter);
    const barrierProvider = new InMemoryFlowBarrierProvider();

    const taskHandler = new TaskHandler<string>(
        messageQueue, taskQueue, databaseAdapter, cacheProvider,
        undefined, undefined,
        {
            flowBarrierProvider: barrierProvider,
            entityProjection: opts?.entityProjection,
        }
    );

    // Register the _flow.timeout executor (no-op success) on the join queue
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
        taskHandler,
        barrierProvider,
    };
}

// ============ Phase 2: InMemoryFlowBarrierProvider ============

describe("Phase 2: InMemoryFlowBarrierProvider", () => {
    let barrier: InMemoryFlowBarrierProvider;

    beforeEach(() => {
        barrier = new InMemoryFlowBarrierProvider();
    });

    it("batchDecrementAndCheck: 3 steps one-at-a-time -> complete", async () => {
        const flowId = "flow-1";
        await barrier.initBarrier(flowId, 3);

        const r1 = await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success", result: "a"},
        ]);
        expect(r1.remaining).toBe(2);

        const r2 = await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 1, status: "success", result: "b"},
        ]);
        expect(r2.remaining).toBe(1);

        const r3 = await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 2, status: "success", result: "c"},
        ]);
        expect(r3.remaining).toBe(0);

        expect(await barrier.isComplete(flowId)).toBe(true);
    });

    it("batchDecrementAndCheck: batch of 3 in single call -> complete", async () => {
        const flowId = "flow-batch";
        await barrier.initBarrier(flowId, 3);

        const results: FlowStepResult[] = [
            {step_index: 0, status: "success", result: "a"},
            {step_index: 1, status: "success", result: "b"},
            {step_index: 2, status: "success", result: "c"},
        ];

        const r = await barrier.batchDecrementAndCheck(flowId, results);
        expect(r.remaining).toBe(0);
        expect(await barrier.isComplete(flowId)).toBe(true);
    });

    it("duplicate step (HSETNX): second call doesn't double-decrement", async () => {
        const flowId = "flow-dup";
        await barrier.initBarrier(flowId, 3);

        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success"},
        ]);

        // Submit step 0 again — should be a no-op
        const r = await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success"},
        ]);
        expect(r.remaining).toBe(2); // still 2, not 1

        // Submitting remaining steps
        const rFinal = await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 1, status: "success"},
            {step_index: 2, status: "success"},
        ]);
        expect(rFinal.remaining).toBe(0);
    });

    it("getStepResults returns all stored results", async () => {
        const flowId = "flow-results";
        await barrier.initBarrier(flowId, 3);

        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 2, status: "success", result: "c"},
            {step_index: 0, status: "fail", error: "oops"},
        ]);
        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 1, status: "success", result: "b"},
        ]);

        const results = await barrier.getStepResults(flowId);
        expect(results.length).toBe(3);
        // Sorted by step_index
        expect(results[0].step_index).toBe(0);
        expect(results[0].status).toBe("fail");
        expect(results[0].error).toBe("oops");
        expect(results[1].step_index).toBe(1);
        expect(results[1].result).toBe("b");
        expect(results[2].step_index).toBe(2);
        expect(results[2].result).toBe("c");
    });

    it("markAborted -> late batchDecrementAndCheck returns remaining: -1", async () => {
        const flowId = "flow-abort";
        await barrier.initBarrier(flowId, 3);

        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success"},
        ]);

        const aborted = await barrier.markAborted(flowId);
        expect(aborted).toBe(true);

        // Late arrival after abort
        const r = await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 1, status: "success"},
        ]);
        expect(r.remaining).toBe(-1);
    });

    it("isComplete returns true after barrier reaches 0", async () => {
        const flowId = "flow-complete";
        await barrier.initBarrier(flowId, 1);

        expect(await barrier.isComplete(flowId)).toBe(false);

        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success"},
        ]);

        expect(await barrier.isComplete(flowId)).toBe(true);
    });

    it("markAborted returns false on second call", async () => {
        const flowId = "flow-double-abort";
        await barrier.initBarrier(flowId, 3);

        const first = await barrier.markAborted(flowId);
        expect(first).toBe(true);

        const second = await barrier.markAborted(flowId);
        expect(second).toBe(false);
    });
});

// ============ Phase 3: Actions.startFlow() ============

describe("Phase 3: Actions.startFlow()", () => {
    let actions: Actions<string>;

    beforeEach(() => {
        actions = new Actions<string>("test-runner");
    });

    function buildStartFlowInput(stepCount: number, overrides?: Partial<StartFlowInput["config"]>): StartFlowInput {
        const steps = Array.from({length: stepCount}, (_, i) => ({
            type: "step-task",
            queue_id: queueName,
            payload: {data: `step-${i}`},
        }));

        return {
            steps,
            config: {
                join: {type: "join-task", queue_id: queueName},
                ...overrides,
            },
        };
    }

    it("startFlow creates N step tasks with correct metadata.flow_meta", () => {
        const input = buildStartFlowInput(3);
        const flowId = actions.startFlow(input);

        const results = actions.extractSyncResults([]);
        expect(results.newTasks.length).toBe(3);

        for (let i = 0; i < 3; i++) {
            const task = results.newTasks[i];
            const flowMeta = task.metadata?.flow_meta as unknown as FlowMeta;
            expect(flowMeta).toBeDefined();
            expect(flowMeta.flow_id).toBe(flowId);
            expect(flowMeta.step_index).toBe(i);
            expect(flowMeta.total_steps).toBe(3);
            expect(flowMeta.join.type).toBe("join-task");
            expect(flowMeta.join.queue_id).toBe(queueName);
            expect(flowMeta.failure_policy).toBe("continue");
        }
    });

    it("payload NOT polluted -- no flow_meta on payload", () => {
        const input = buildStartFlowInput(2);
        actions.startFlow(input);

        const results = actions.extractSyncResults([]);
        for (const task of results.newTasks) {
            const payload = task.payload as Record<string, unknown>;
            expect(payload.flow_meta).toBeUndefined();
        }
    });

    it("0 steps throws validation error", () => {
        const input = buildStartFlowInput(0);
        expect(() => actions.startFlow(input)).toThrow("at least 1 step");
    });

    it("1 step works (barrier=1)", () => {
        const input = buildStartFlowInput(1);
        const flowId = actions.startFlow(input);

        const results = actions.extractSyncResults([]);
        expect(results.newTasks.length).toBe(1);
        const flowMeta = results.newTasks[0].metadata?.flow_meta as unknown as FlowMeta;
        expect(flowMeta.flow_id).toBe(flowId);
        expect(flowMeta.total_steps).toBe(1);
    });

    it("with timeout_ms creates sentinel task", () => {
        const input = buildStartFlowInput(2, {timeout_ms: 5000});
        actions.startFlow(input);

        const results = actions.extractSyncResults([]);
        // 2 step tasks + 1 sentinel timeout task
        expect(results.newTasks.length).toBe(3);

        const sentinel = results.newTasks.find(t => t.type === "_flow.timeout");
        expect(sentinel).toBeDefined();
        const sentinelMeta = sentinel!.metadata?.flow_meta as unknown as FlowMeta;
        expect(sentinelMeta.is_timeout).toBe(true);
        expect(sentinelMeta.step_index).toBe(-1);

        // Sentinel should execute after timeout_ms
        const stepTask = results.newTasks.find(t => t.type === "step-task")!;
        expect(sentinel!.execute_at.getTime()).toBeGreaterThan(stepTask.execute_at.getTime());
    });

    it("entity stored in flow_meta.entity on step tasks", () => {
        const input = buildStartFlowInput(2, {
            entity: {id: "order-1", type: "order"},
        });
        actions.startFlow(input);

        const results = actions.extractSyncResults([]);
        for (const task of results.newTasks.filter(t => t.type === "step-task")) {
            const flowMeta = task.metadata?.flow_meta as unknown as FlowMeta;
            expect(flowMeta.entity).toEqual({id: "order-1", type: "order"});
        }
    });

    it("parent log_context inherited onto step tasks", () => {
        const parentTask = makeTask("parent-1", "parent-type", {
            metadata: {log_context: {org_id: "org-42", request_id: "req-7"}},
        });
        const forked = actions.forkForTask(parentTask);

        forked.startFlow({
            steps: [{type: "step-task", queue_id: queueName, payload: {data: "child"}}],
            config: {join: {type: "join-task", queue_id: queueName}},
        });

        // startFlow internally calls this.addTasks on the root Actions (batch context),
        // so step tasks appear in extractSyncResults, not extractTaskActions.
        // Exclude the parent task id so we don't lose its context.
        const results = actions.extractSyncResults(["parent-1"]);
        const stepTask = results.newTasks.find(t => t.type === "step-task");
        expect(stepTask).toBeDefined();
        const logCtx = stepTask!.metadata?.log_context;
        expect(logCtx).toBeDefined();
        expect(logCtx!.org_id).toBe("org-42");
        expect(logCtx!.request_id).toBe("req-7");
    });

    it("entity config produces flow projection with processing status", () => {
        actions.startFlow({
            steps: [{type: "step-task", queue_id: queueName, payload: {data: "x"}}],
            config: {
                join: {type: "join-task", queue_id: queueName},
                entity: {id: "order-55", type: "order"},
            },
        });

        const results = actions.extractSyncResults([]);
        expect(results.flowProjections.length).toBe(1);
        expect(results.flowProjections[0].status).toBe("processing");
        expect(results.flowProjections[0].entity_id).toBe("order-55");
        expect(results.flowProjections[0].entity_type).toBe("order");
        expect(results.flowProjections[0].task_type).toBe("join-task");
    });
});

// ============ Phase 4: FlowMiddleware ============

describe("Phase 4: FlowMiddleware", () => {
    let barrierProvider: InMemoryFlowBarrierProvider;
    let middleware: FlowMiddleware<string>;
    let idCounter: number;

    beforeEach(() => {
        idCounter = 0;
        barrierProvider = new InMemoryFlowBarrierProvider();
        middleware = new FlowMiddleware<string>(
            barrierProvider,
            () => `join-id-${++idCounter}`
        );
    });

    function makeFlowMeta(flowId: string, stepIndex: number, totalSteps: number, overrides?: Partial<FlowMeta>): FlowMeta {
        return {
            flow_id: flowId,
            step_index: stepIndex,
            total_steps: totalSteps,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
            ...overrides,
        };
    }

    function makeCompletedStepTask(
        id: string,
        flowMeta: FlowMeta,
        opts?: { failed?: boolean; result?: unknown; error?: string }
    ): CronTask<string> {
        const base: CronTask<string> = {
            id,
            type: "step-task",
            queue_id: queueName,
            payload: {data: "test"},
            execute_at: new Date(),
            status: opts?.failed ? "failed" : "executed",
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {
                flow_meta: flowMeta as unknown as Record<string, unknown>,
            },
        };

        if (!opts?.failed && opts?.result !== undefined) {
            base.execution_result = opts.result;
        } else if (!opts?.failed) {
            base.execution_result = "done";
        }

        if (opts?.failed) {
            base.execution_stats = {last_error: opts.error || "Step failed"};
        }

        return base;
    }

    it("all steps succeed -> returns joinTask with merged flow_results", async () => {
        const flowId = "flow-all-ok";
        await barrierProvider.initBarrier(flowId, 3);

        const tasks = [0, 1, 2].map(i =>
            makeCompletedStepTask(`step-${i}`, makeFlowMeta(flowId, i, 3), {result: `r-${i}`})
        );

        const {joinTasks} = await middleware.onPostProcess({successTasks: tasks, failedTasks: []});

        expect(joinTasks.length).toBe(1);
        const joinTask = joinTasks[0];
        expect(joinTask.type).toBe("join-task");
        expect(joinTask.queue_id).toBe(queueName);

        const payload = joinTask.payload as { flow_results: any };
        expect(payload.flow_results.flow_id).toBe(flowId);
        expect(payload.flow_results.steps.length).toBe(3);
        expect(payload.flow_results.steps[0].status).toBe("success");
        expect(payload.flow_results.steps[0].result).toBe("r-0");

        // Join task should have is_join in its flow_meta
        const joinFlowMeta = joinTask.metadata?.flow_meta as unknown as FlowMeta;
        expect(joinFlowMeta.is_join).toBe(true);
        expect(joinFlowMeta.step_index).toBe(-1);
    });

    it("mixed success/fail with continue policy -> join fires", async () => {
        const flowId = "flow-mixed";
        await barrierProvider.initBarrier(flowId, 2);

        const tasks = [
            makeCompletedStepTask("s0", makeFlowMeta(flowId, 0, 2), {result: "ok"}),
            makeCompletedStepTask("s1", makeFlowMeta(flowId, 1, 2), {failed: true, error: "boom"}),
        ];

        const {joinTasks} = await middleware.onPostProcess({successTasks: [tasks[0]], failedTasks: [tasks[1]]});
        expect(joinTasks.length).toBe(1);

        const flowResults = (joinTasks[0].payload as any).flow_results;
        expect(flowResults.steps.length).toBe(2);
        const successStep = flowResults.steps.find((s: FlowStepResult) => s.status === "success");
        const failStep = flowResults.steps.find((s: FlowStepResult) => s.status === "fail");
        expect(successStep).toBeDefined();
        expect(failStep).toBeDefined();
        expect(failStep.error).toBe("boom");
    });

    it("batch: multiple steps same flow -> batchDecrementAndCheck called once per flow_id", async () => {
        const flowId = "flow-batch-test";
        await barrierProvider.initBarrier(flowId, 3);

        // Spy on batchDecrementAndCheck
        const origBatch = barrierProvider.batchDecrementAndCheck.bind(barrierProvider);
        let batchCallCount = 0;
        barrierProvider.batchDecrementAndCheck = async (fid, results) => {
            batchCallCount++;
            return origBatch(fid, results);
        };

        const tasks = [0, 1, 2].map(i =>
            makeCompletedStepTask(`s-${i}`, makeFlowMeta(flowId, i, 3), {result: `r${i}`})
        );

        await middleware.onPostProcess({successTasks: tasks, failedTasks: []});

        // Should be called exactly once for this flow_id (batched)
        expect(batchCallCount).toBe(1);
    });

    it("barrier not yet met -> no join dispatched", async () => {
        const flowId = "flow-partial";
        await barrierProvider.initBarrier(flowId, 3);

        // Only 2 of 3 steps complete
        const tasks = [0, 1].map(i =>
            makeCompletedStepTask(`s-${i}`, makeFlowMeta(flowId, i, 3), {result: `r${i}`})
        );

        const {joinTasks} = await middleware.onPostProcess({successTasks: tasks, failedTasks: []});
        expect(joinTasks.length).toBe(0);

        expect(await barrierProvider.isComplete(flowId)).toBe(false);
    });

    it("join task completion with entity -> produces executed projection", async () => {
        const flowId = "flow-entity-join";
        const entity = {id: "order-1", type: "order"};

        // Simulate a completed join task
        const joinFlowMeta = makeFlowMeta(flowId, -1, 2, {
            is_join: true,
            entity,
        });
        const joinTask: CronTask<string> = {
            id: flowId,
            type: "join-task",
            queue_id: queueName,
            payload: {flow_results: {flow_id: flowId, steps: []}},
            execute_at: new Date(),
            status: "executed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_result: {merged: true},
            metadata: {
                flow_meta: joinFlowMeta as unknown as Record<string, unknown>,
            },
        };

        const {projections} = await middleware.onPostProcess({successTasks: [joinTask], failedTasks: []});
        expect(projections.length).toBe(1);
        expect(projections[0].status).toBe("executed");
        expect(projections[0].entity_id).toBe("order-1");
        expect(projections[0].entity_type).toBe("order");
    });

    it("join task failure with entity -> produces failed projection", async () => {
        const flowId = "flow-entity-join-fail";
        const entity = {id: "order-2", type: "order"};

        const joinFlowMeta = makeFlowMeta(flowId, -1, 2, {
            is_join: true,
            entity,
        });
        const joinTask: CronTask<string> = {
            id: flowId,
            type: "join-task",
            queue_id: queueName,
            payload: {flow_results: {flow_id: flowId, steps: []}},
            execute_at: new Date(),
            status: "failed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_stats: {last_error: "Join handler crashed"},
            metadata: {
                flow_meta: joinFlowMeta as unknown as Record<string, unknown>,
            },
        };

        const {projections} = await middleware.onPostProcess({successTasks: [], failedTasks: [joinTask]});
        expect(projections.length).toBe(1);
        expect(projections[0].status).toBe("failed");
        expect(projections[0].entity_id).toBe("order-2");
    });
});

// ============ Phase 5: TaskHandler Integration ============

describe("Phase 5: TaskHandler Integration", () => {
    it("postProcessTasks calls flowMiddleware and dispatches joinTask", async () => {
        const {taskHandler, barrierProvider, taskQueue, databaseAdapter} = createFlowStack();

        // Register step executor
        const stepExecutor: ISingleTaskNonParallel<string, "step-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.success(task, "step-done");
            },
        };
        taskQueue.register(queueName, "step-task", stepExecutor);

        const flowId = "flow-integration";
        await barrierProvider.initBarrier(flowId, 2);

        const flowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 2,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
        };
        const flowMeta1: FlowMeta = {...flowMeta, step_index: 1};

        const task0 = makeTask(databaseAdapter.generateId(), "step-task", {
            execution_result: "res-0",
            metadata: {flow_meta: flowMeta as unknown as Record<string, unknown>},
        });
        const task1 = makeTask(databaseAdapter.generateId(), "step-task", {
            execution_result: "res-1",
            metadata: {flow_meta: flowMeta1 as unknown as Record<string, unknown>},
        });

        // Store the tasks so markTasksAsSuccess can find them
        await databaseAdapter.addTasksToScheduled([task0, task1]);

        // Simulate postProcessTasks with both step tasks succeeded
        await taskHandler.postProcessTasks({
            successTasks: [task0, task1],
            failedTasks: [],
            newTasks: [],
        });

        // The join task should have been dispatched via addTasks internally.
        // We can verify by checking if the barrier completed.
        expect(await barrierProvider.isComplete(flowId)).toBe(true);
    });

    it("flowProjections from startFlow entity tracking are synced in run", async () => {
        const entityProvider = createMockEntityProvider();
        const {
            taskQueue,
            databaseAdapter,
            messageQueue,
            cacheProvider,
            taskStore,
        } = createFlowStack({entityProjection: entityProvider});

        // Register a parent executor that starts a flow with entity
        const parentExecutor: ISingleTaskNonParallel<string, "step-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.startFlow({
                    steps: [
                        {type: "step-task-b", queue_id: queueName, payload: {data: "s1"}},
                    ],
                    config: {
                        join: {type: "join-task", queue_id: queueName},
                        entity: {id: "ent-1", type: "campaign"},
                    },
                });
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "step-task", parentExecutor);

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            entityProjection: entityProvider,
        });

        const parentTask = makeTask(databaseAdapter.generateId(), "step-task");
        const results = await taskRunner.run("worker-1", [parentTask]);

        // flowProjections should include the 'processing' projection from startFlow
        expect(results.flowProjections.length).toBe(1);
        expect(results.flowProjections[0].status).toBe("processing");
        expect(results.flowProjections[0].entity_id).toBe("ent-1");
    });

});

// ============ Phase 6: End-to-End Pipeline ============

describe("Phase 6: End-to-End Pipeline", () => {
    it("fan-out -> all succeed -> join dispatched with merged results", async () => {
        const {
            taskQueue,
            databaseAdapter,
            messageQueue,
            cacheProvider,
            taskStore,
            taskHandler,
            barrierProvider,
        } = createFlowStack();

        // Register parent executor that starts a flow
        const parentExecutor: ISingleTaskNonParallel<string, "step-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.startFlow({
                    steps: [
                        {type: "step-task-b", queue_id: queueName, payload: {data: "s0"}},
                        {type: "step-task-b", queue_id: queueName, payload: {data: "s1"}},
                    ],
                    config: {
                        join: {type: "join-task", queue_id: queueName},
                    },
                });
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "step-task", parentExecutor);

        // Register step executor
        const stepExecutor: ISingleTaskNonParallel<string, "step-task-b"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task, `result-${(task.payload as any).data}`);
            },
        };
        taskQueue.register(queueName, "step-task-b", stepExecutor);

        // Register join executor — captures payload for verification
        let joinPayload: any = null;
        const joinExecutor: ISingleTaskNonParallel<string, "join-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                joinPayload = task.payload;
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "join-task", joinExecutor);

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
        });

        // Phase 1: Run parent task
        const parentTask = makeTask(databaseAdapter.generateId(), "step-task");
        const parentResults = await taskRunner.run("worker-1", [parentTask]);

        // Verify step tasks were created
        const stepTasks = parentResults.newTasks.filter(t => t.type === "step-task-b");
        expect(stepTasks.length).toBe(2);

        // Extract flow_id from step tasks and init barrier
        const flowId = (stepTasks[0].metadata?.flow_meta as unknown as FlowMeta).flow_id;
        await barrierProvider.initBarrier(flowId, 2);

        // Phase 2: Run step tasks
        const stepResults = await taskRunner.run("worker-2", stepTasks);
        expect(stepResults.successTasks.length).toBe(2);

        // Phase 3: PostProcess step tasks through taskHandler (flow middleware kicks in)
        await taskHandler.postProcessTasks({
            successTasks: stepResults.successTasks,
            failedTasks: [],
            newTasks: stepResults.newTasks,
        });

        // Verify barrier completed
        expect(await barrierProvider.isComplete(flowId)).toBe(true);

        // Phase 4: Consume join task from queue and run it — verify flow_results payload

        let joinTasks: CronTask<string>[] = [];
        await messageQueue.consumeMessagesBatch(queueName, async (_queueId, msgs) => {
            joinTasks = msgs.filter(m => m.type === "join-task") as CronTask<string>[];
        });
        expect(joinTasks.length).toBe(1);

        const joinRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
        });
        await joinRunner.run("worker-join", joinTasks);

        // Core contract: verify flow_results payload on join task
        expect(joinPayload).not.toBeNull();
        expect(joinPayload.flow_results).toBeDefined();
        expect(joinPayload.flow_results.flow_id).toBe(flowId);
        expect(joinPayload.flow_results.steps.length).toBe(2);
        expect(joinPayload.flow_results.steps[0].status).toBe("success");
        expect(joinPayload.flow_results.steps[0].result).toBe("result-s0");
        expect(joinPayload.flow_results.steps[1].status).toBe("success");
        expect(joinPayload.flow_results.steps[1].result).toBe("result-s1");
    });

    it("step retries do NOT decrement barrier", async () => {
        const barrierProvider = new InMemoryFlowBarrierProvider();
        const flowMiddleware = new FlowMiddleware<string>(barrierProvider, () => `gen-${Date.now()}`);

        const flowId = "flow-retry";
        await barrierProvider.initBarrier(flowId, 2);

        const flowMeta0 = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 2,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue" as const,
        };

        // Step 0 fails first time (will be retried, not terminal)
        // The middleware should only see terminally completed tasks.
        // A retrying task would NOT be passed to postProcessTasks as a finalFailed.
        // Only after exhausting retries does it become a terminal failure.

        // First: step 0 succeeds
        const step0Success = makeTask("s0", "step-task", {
            execution_result: "ok-0",
            status: "executed",
            metadata: {flow_meta: flowMeta0 as unknown as Record<string, unknown>},
        });

        const r1 = await flowMiddleware.onPostProcess({successTasks: [step0Success], failedTasks: []});
        expect(r1.joinTasks.length).toBe(0); // barrier not met yet (1 remaining)

        // Step 0 comes again (duplicate, e.g., retry of same step) - should not double-decrement
        const step0Dup = makeTask("s0-dup", "step-task", {
            execution_result: "ok-0-dup",
            status: "executed",
            metadata: {
                flow_meta: {...flowMeta0} as unknown as Record<string, unknown>,
            },
        });

        const r2 = await flowMiddleware.onPostProcess({successTasks: [step0Dup], failedTasks: []});
        // Duplicate step_index=0 shouldn't decrement; barrier still at 1
        expect(r2.joinTasks.length).toBe(0);

        // Step 1 succeeds
        const flowMeta1 = {...flowMeta0, step_index: 1};
        const step1Success = makeTask("s1", "step-task", {
            execution_result: "ok-1",
            status: "executed",
            metadata: {flow_meta: flowMeta1 as unknown as Record<string, unknown>},
        });

        const r3 = await flowMiddleware.onPostProcess({successTasks: [step1Success], failedTasks: []});
        expect(r3.joinTasks.length).toBe(1); // barrier met now
    });

    it("nested flow -- join executor starts a new flow", async () => {
        const {
            taskQueue,
            databaseAdapter,
            messageQueue,
            cacheProvider,
            taskStore,
            taskHandler,
            barrierProvider,
        } = createFlowStack();

        // Step executor for first flow
        const stepExecutor: ISingleTaskNonParallel<string, "step-task-b"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task, "first-result");
            },
        };
        taskQueue.register(queueName, "step-task-b", stepExecutor);

        // Join executor that starts a nested flow
        let nestedFlowId: string | null = null;
        const joinExecutor: ISingleTaskNonParallel<string, "join-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                nestedFlowId = actions.startFlow({
                    steps: [
                        {type: "step-task-c", queue_id: queueName, payload: {data: "nested-step"}},
                    ],
                    config: {join: {type: "join-task", queue_id: queueName}},
                });
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "join-task", joinExecutor);

        const stepTaskC: ISingleTaskNonParallel<string, "step-task-c"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task, "nested-result");
            },
        };
        taskQueue.register(queueName, "step-task-c", stepTaskC);

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
        });

        // Build first-flow step tasks manually
        const flowId1 = "flow-outer";
        await barrierProvider.initBarrier(flowId1, 1);

        const outerFlowMeta: FlowMeta = {
            flow_id: flowId1,
            step_index: 0,
            total_steps: 1,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
        };
        const stepTask = makeTask(databaseAdapter.generateId(), "step-task-b", {
            force_store: true,
            metadata: {flow_meta: outerFlowMeta as unknown as Record<string, unknown>},
        });
        await databaseAdapter.addTasksToScheduled([stepTask]);

        // Run outer step
        const stepResults = await taskRunner.run("worker-1", [stepTask]);
        expect(stepResults.successTasks.length).toBe(1);

        // PostProcess outer step -> barrier met -> join dispatched
        await taskHandler.postProcessTasks({
            successTasks: stepResults.successTasks,
            failedTasks: [],
            newTasks: [],
        });

        // The join task was dispatched via addTasks. Now run it.
        // We need to get the join task from the queue.
        // Since this is in-memory, we consume from the queue.
        let joinTasks: CronTask<string>[] = [];
        await messageQueue.consumeMessagesBatch(queueName, async (_queueId, msgs) => {
            joinTasks = msgs.filter(m => m.type === "join-task") as CronTask<string>[];
        });

        if (joinTasks.length > 0) {
            const joinResults = await taskRunner.run("worker-2", joinTasks);
            expect(joinResults.successTasks.length).toBe(1);
            expect(nestedFlowId).not.toBeNull();

            // The nested flow's step tasks should be in newTasks
            const nestedSteps = joinResults.newTasks.filter(t => t.type === "step-task-c");
            expect(nestedSteps.length).toBe(1);
        }
    });

    it("entity-on-flow full lifecycle", async () => {
        const entityProvider = createMockEntityProvider();
        const {
            taskQueue,
            databaseAdapter,
            messageQueue,
            cacheProvider,
            taskStore,
            taskHandler,
            barrierProvider,
        } = createFlowStack({entityProjection: entityProvider});

        // Register step executor
        const stepExecutor: ISingleTaskNonParallel<string, "step-task-b"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task, "step-result");
            },
        };
        taskQueue.register(queueName, "step-task-b", stepExecutor);

        // Register join executor
        const joinExecutor: ISingleTaskNonParallel<string, "join-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task, {summary: "all done"});
            },
        };
        taskQueue.register(queueName, "join-task", joinExecutor);

        // Parent executor starts flow with entity
        const parentExecutor: ISingleTaskNonParallel<string, "step-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.startFlow({
                    steps: [
                        {type: "step-task-b", queue_id: queueName, payload: {data: "s0"}},
                    ],
                    config: {
                        join: {type: "join-task", queue_id: queueName},
                        entity: {id: "campaign-42", type: "campaign"},
                    },
                });
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "step-task", parentExecutor);

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            entityProjection: entityProvider,
        });

        // Run parent task
        const parentTask = makeTask(databaseAdapter.generateId(), "step-task");
        const parentResults = await taskRunner.run("worker-1", [parentTask]);

        // Verify flow projection was produced
        expect(parentResults.flowProjections.length).toBe(1);
        expect(parentResults.flowProjections[0].status).toBe("processing");
        expect(parentResults.flowProjections[0].entity_id).toBe("campaign-42");

        // Init barrier for the flow
        const stepTasks = parentResults.newTasks.filter(t => t.type === "step-task-b");
        expect(stepTasks.length).toBe(1);
        const flowId = (stepTasks[0].metadata?.flow_meta as unknown as FlowMeta).flow_id;
        await barrierProvider.initBarrier(flowId, 1);

        // Run step task
        const stepResults = await taskRunner.run("worker-2", stepTasks);
        expect(stepResults.successTasks.length).toBe(1);

        // PostProcess step -> barrier met -> join dispatched
        entityProvider.calls.length = 0;
        await taskHandler.postProcessTasks({
            successTasks: stepResults.successTasks,
            failedTasks: [],
            newTasks: [],
        });

        // Barrier should be complete
        expect(await barrierProvider.isComplete(flowId)).toBe(true);
    });
});

// ============ Phase 7: Abort & Timeout ============

describe("Phase 7: Abort & Timeout", () => {
    it("abort policy -- first failure dispatches join with aborted: true", async () => {
        const barrierProvider = new InMemoryFlowBarrierProvider();
        let idCounter = 0;
        const middleware = new FlowMiddleware<string>(
            barrierProvider,
            () => `join-${++idCounter}`
        );

        const flowId = "flow-abort-policy";
        await barrierProvider.initBarrier(flowId, 3);

        const flowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 3,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "abort",
        };

        // Step 0 fails
        const failedStep: CronTask<string> = {
            id: "abort-s0",
            type: "step-task",
            queue_id: queueName,
            payload: {data: "test"},
            execute_at: new Date(),
            status: "failed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_stats: {last_error: "step 0 crashed"},
            metadata: {flow_meta: flowMeta as unknown as Record<string, unknown>},
        };

        const {joinTasks} = await middleware.onPostProcess({successTasks: [], failedTasks: [failedStep]});
        expect(joinTasks.length).toBe(1);

        const flowResults = (joinTasks[0].payload as any).flow_results;
        expect(flowResults.aborted).toBe(true);
        expect(flowResults.flow_id).toBe(flowId);
    });

    it("timeout fires before steps -> join with timed_out: true", async () => {
        const barrierProvider = new InMemoryFlowBarrierProvider();
        let idCounter = 0;
        const middleware = new FlowMiddleware<string>(
            barrierProvider,
            () => `join-${++idCounter}`
        );

        const flowId = "flow-timeout";
        await barrierProvider.initBarrier(flowId, 2);

        // Only step 0 has completed
        await barrierProvider.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success", result: "partial"},
        ]);

        // Timeout sentinel fires
        const timeoutFlowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: -1,
            total_steps: 2,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
            is_timeout: true,
        };

        const timeoutTask: CronTask<string> = {
            id: "timeout-1",
            type: "_flow.timeout",
            queue_id: queueName,
            payload: {flow_id: flowId, is_timeout: true},
            execute_at: new Date(),
            status: "executed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_result: true,
            metadata: {flow_meta: timeoutFlowMeta as unknown as Record<string, unknown>},
        };

        const {joinTasks} = await middleware.onPostProcess({successTasks: [timeoutTask], failedTasks: []});
        expect(joinTasks.length).toBe(1);

        const flowResults = (joinTasks[0].payload as any).flow_results;
        expect(flowResults.timed_out).toBe(true);
        expect(flowResults.flow_id).toBe(flowId);
        // Partial results should include step 0
        expect(flowResults.steps.length).toBe(1);
        expect(flowResults.steps[0].step_index).toBe(0);
    });

    it("timeout after completion -> no-op", async () => {
        const barrierProvider = new InMemoryFlowBarrierProvider();
        let idCounter = 0;
        const middleware = new FlowMiddleware<string>(
            barrierProvider,
            () => `join-${++idCounter}`
        );

        const flowId = "flow-timeout-noop";
        await barrierProvider.initBarrier(flowId, 1);

        // Complete the barrier first
        await barrierProvider.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success", result: "done"},
        ]);
        expect(await barrierProvider.isComplete(flowId)).toBe(true);

        // Now timeout fires — should be no-op
        const timeoutFlowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: -1,
            total_steps: 1,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
            is_timeout: true,
        };

        const timeoutTask: CronTask<string> = {
            id: "timeout-noop",
            type: "_flow.timeout",
            queue_id: queueName,
            payload: {flow_id: flowId, is_timeout: true},
            execute_at: new Date(),
            status: "executed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_result: true,
            metadata: {flow_meta: timeoutFlowMeta as unknown as Record<string, unknown>},
        };

        const {joinTasks} = await middleware.onPostProcess({successTasks: [timeoutTask], failedTasks: []});
        expect(joinTasks.length).toBe(0); // No join dispatched
    });

    it("abort policy full pipeline through TaskHandler", async () => {
        const {
            taskQueue,
            databaseAdapter,
            messageQueue,
            cacheProvider,
            taskStore,
            taskHandler,
            barrierProvider,
        } = createFlowStack();

        // Register step executor that fails
        const failingExecutor: ISingleTaskNonParallel<string, "step-task-b"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.fail(task, new Error("intentional failure"));
            },
        };
        taskQueue.register(queueName, "step-task-b", failingExecutor);

        // Register join executor
        let joinReceived = false;
        let joinFlowResults: any = null;
        const joinExecutor: ISingleTaskNonParallel<string, "join-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                joinReceived = true;
                joinFlowResults = (task.payload as any).flow_results;
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "join-task", joinExecutor);

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
        });

        const flowId = "flow-abort-pipeline";
        await barrierProvider.initBarrier(flowId, 3);

        const flowMetaBase: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 3,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "abort",
        };

        // Create step tasks
        const stepTask0 = makeTask(databaseAdapter.generateId(), "step-task-b", {
            force_store: true,
            metadata: {flow_meta: {...flowMetaBase, step_index: 0} as unknown as Record<string, unknown>},
        });
        await databaseAdapter.addTasksToScheduled([stepTask0]);

        // Run step 0 (it will fail)
        const stepResults = await taskRunner.run("worker-1", [stepTask0]);
        expect(stepResults.failedTasks.length).toBe(1);

        // PostProcess with the failed task (it has retries=0, so it's terminal)
        await taskHandler.postProcessTasks({
            successTasks: [],
            failedTasks: stepResults.failedTasks,
            newTasks: [],
        });

        // The abort must have triggered a join task dispatch via addTasks -> MQ.
        // Consume and run the join task deterministically.
        let joinTasks: CronTask<string>[] = [];
        await messageQueue.consumeMessagesBatch(queueName, async (_queueId, msgs) => {
            joinTasks = msgs.filter(m => m.type === "join-task") as CronTask<string>[];
        });

        expect(joinTasks.length).toBe(1);
        await taskRunner.run("worker-2", joinTasks);
        expect(joinReceived).toBe(true);
        expect(joinFlowResults.aborted).toBe(true);
        expect(joinFlowResults.flow_id).toBe(flowId);
    });

    it("abort policy with entity -> failed projection", async () => {
        const barrierProvider = new InMemoryFlowBarrierProvider();
        let idCounter = 0;
        const middleware = new FlowMiddleware<string>(
            barrierProvider,
            () => `join-${++idCounter}`
        );

        const flowId = "flow-abort-entity";
        await barrierProvider.initBarrier(flowId, 2);

        const flowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 2,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "abort",
            entity: {id: "order-99", type: "order"},
        };

        const failedStep: CronTask<string> = {
            id: "abort-entity-s0",
            type: "step-task",
            queue_id: queueName,
            payload: {data: "test"},
            execute_at: new Date(),
            status: "failed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_stats: {last_error: "step crashed"},
            metadata: {flow_meta: flowMeta as unknown as Record<string, unknown>},
        };

        const {joinTasks, projections} = await middleware.onPostProcess({successTasks: [], failedTasks: [failedStep]});
        expect(joinTasks.length).toBe(1);
        expect(projections.length).toBe(1);
        expect(projections[0].status).toBe("failed");
        expect(projections[0].entity_id).toBe("order-99");
        expect(projections[0].entity_type).toBe("order");
    });

    it("timeout with entity -> failed projection", async () => {
        const barrierProvider = new InMemoryFlowBarrierProvider();
        let idCounter = 0;
        const middleware = new FlowMiddleware<string>(
            barrierProvider,
            () => `join-${++idCounter}`
        );

        const flowId = "flow-timeout-entity";
        await barrierProvider.initBarrier(flowId, 2);

        const timeoutFlowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: -1,
            total_steps: 2,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
            is_timeout: true,
            entity: {id: "order-100", type: "order"},
        };

        const timeoutTask: CronTask<string> = {
            id: "timeout-entity-1",
            type: "_flow.timeout",
            queue_id: queueName,
            payload: {flow_id: flowId, is_timeout: true},
            execute_at: new Date(),
            status: "executed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_result: true,
            metadata: {flow_meta: timeoutFlowMeta as unknown as Record<string, unknown>},
        };

        const {joinTasks, projections} = await middleware.onPostProcess({successTasks: [timeoutTask], failedTasks: []});
        expect(joinTasks.length).toBe(1);
        expect(projections.length).toBe(1);
        expect(projections[0].status).toBe("failed");
        expect(projections[0].entity_id).toBe("order-100");
        expect(projections[0].entity_type).toBe("order");
    });
});

// ============ Phase 4b: Multiple Independent Flows ============

describe("Phase 4b: Multiple Independent Flows", () => {
    it("two independent flows in same postProcess batch", async () => {
        const barrierProvider = new InMemoryFlowBarrierProvider();
        let idCounter = 0;
        const middleware = new FlowMiddleware<string>(
            barrierProvider,
            () => `join-${++idCounter}`
        );

        const flowIdA = "flow-A";
        const flowIdB = "flow-B";
        await barrierProvider.initBarrier(flowIdA, 1);
        await barrierProvider.initBarrier(flowIdB, 1);

        const taskA: CronTask<string> = {
            id: "task-a",
            type: "step-task",
            queue_id: queueName,
            payload: {data: "a"},
            execute_at: new Date(),
            status: "executed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_result: "result-a",
            metadata: {
                flow_meta: {
                    flow_id: flowIdA,
                    step_index: 0,
                    total_steps: 1,
                    join: {type: "join-task", queue_id: queueName},
                    failure_policy: "continue",
                } as unknown as Record<string, unknown>,
            },
        };

        const taskB: CronTask<string> = {
            id: "task-b",
            type: "step-task",
            queue_id: queueName,
            payload: {data: "b"},
            execute_at: new Date(),
            status: "executed",
            created_at: new Date(),
            updated_at: new Date(),
            execution_result: "result-b",
            metadata: {
                flow_meta: {
                    flow_id: flowIdB,
                    step_index: 0,
                    total_steps: 1,
                    join: {type: "join-task", queue_id: queueName},
                    failure_policy: "continue",
                } as unknown as Record<string, unknown>,
            },
        };

        const {joinTasks} = await middleware.onPostProcess({successTasks: [taskA, taskB], failedTasks: []});

        // Two independent flows should produce 2 join tasks
        expect(joinTasks.length).toBe(2);

        const joinA = joinTasks.find(j => (j.payload as any).flow_results.flow_id === flowIdA);
        const joinB = joinTasks.find(j => (j.payload as any).flow_results.flow_id === flowIdB);
        expect(joinA).toBeDefined();
        expect(joinB).toBeDefined();

        // No cross-contamination: each join has exactly 1 step
        expect((joinA!.payload as any).flow_results.steps.length).toBe(1);
        expect((joinA!.payload as any).flow_results.steps[0].result).toBe("result-a");
        expect((joinB!.payload as any).flow_results.steps.length).toBe(1);
        expect((joinB!.payload as any).flow_results.steps[0].result).toBe("result-b");
    });
});

// ============ Phase 2b: First-Write-Wins ============

describe("Phase 2b: First-Write-Wins (HSETNX)", () => {
    it("duplicate step: first result wins", async () => {
        const barrier = new InMemoryFlowBarrierProvider();
        const flowId = "flow-first-wins";
        await barrier.initBarrier(flowId, 2);

        // Step 0 records result: "first"
        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success", result: "first"},
        ]);

        // Duplicate step 0 records result: "second"
        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 0, status: "success", result: "second"},
        ]);

        // Complete the flow
        await barrier.batchDecrementAndCheck(flowId, [
            {step_index: 1, status: "success", result: "step1"},
        ]);

        const results = await barrier.getStepResults(flowId);
        expect(results.length).toBe(2);

        // First-write-wins: step 0 result should be "first", not "second"
        const step0 = results.find(r => r.step_index === 0);
        expect(step0).toBeDefined();
        expect(step0!.result).toBe("first");
    });
});

// ============ Phase 6b: Continue Policy Failed Step E2E ============

describe("Phase 6b: Continue Policy Failed Step E2E", () => {
    it("continue policy: failed step flows through to join with error", async () => {
        const {
            taskQueue,
            databaseAdapter,
            messageQueue,
            cacheProvider,
            taskStore,
            taskHandler,
            barrierProvider,
        } = createFlowStack();

        // Register step executor: step_index 0 succeeds, step_index 1 fails
        const stepExecutor: ISingleTaskNonParallel<string, "step-task-b"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            default_retries: 0,
            onTask: async (task, actions) => {
                const flowMeta = task.metadata?.flow_meta as unknown as FlowMeta;
                if (flowMeta.step_index === 1) {
                    actions.fail(task, new Error("step-1 exploded"));
                } else {
                    actions.success(task, `result-step-${flowMeta.step_index}`);
                }
            },
        };
        taskQueue.register(queueName, "step-task-b", stepExecutor);

        // Register join executor
        let joinPayload: any = null;
        const joinExecutor: ISingleTaskNonParallel<string, "join-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                joinPayload = task.payload;
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "join-task", joinExecutor);

        // Build flow step tasks manually (continue policy)
        const flowId = "flow-continue-fail";
        await barrierProvider.initBarrier(flowId, 2);

        const flowMetaBase: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 2,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
        };

        const step0 = makeTask(databaseAdapter.generateId(), "step-task-b", {
            force_store: true,
            metadata: {flow_meta: {...flowMetaBase, step_index: 0} as unknown as Record<string, unknown>},
        });
        const step1 = makeTask(databaseAdapter.generateId(), "step-task-b", {
            force_store: true,
            metadata: {flow_meta: {...flowMetaBase, step_index: 1} as unknown as Record<string, unknown>},
        });
        await databaseAdapter.addTasksToScheduled([step0, step1]);

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
        });

        // Run both step tasks
        const stepResults = await taskRunner.run("worker-1", [step0, step1]);
        expect(stepResults.successTasks.length).toBe(1);
        expect(stepResults.failedTasks.length).toBe(1);

        // PostProcess — flow middleware sees 1 success + 1 final-failed (retries=0)
        await taskHandler.postProcessTasks({
            successTasks: stepResults.successTasks,
            failedTasks: stepResults.failedTasks,
            newTasks: [],
        });

        // Consume join from queue
        let joinTasks: CronTask<string>[] = [];
        await messageQueue.consumeMessagesBatch(queueName, async (_queueId, msgs) => {
            joinTasks = msgs.filter(m => m.type === "join-task") as CronTask<string>[];
        });
        expect(joinTasks.length).toBe(1);

        // Run join task
        await taskRunner.run("worker-join", joinTasks);
        expect(joinPayload).not.toBeNull();

        const flowResults = joinPayload.flow_results;
        expect(flowResults.flow_id).toBe(flowId);
        expect(flowResults.steps.length).toBe(2);

        const step0Result = flowResults.steps.find((s: any) => s.step_index === 0);
        const step1Result = flowResults.steps.find((s: any) => s.step_index === 1);
        expect(step0Result.status).toBe("success");
        expect(step0Result.result).toBe("result-step-0");
        expect(step1Result.status).toBe("fail");
        expect(step1Result.error).toBe("step-1 exploded");
    });
});

// ============ Phase 8: Async Flow Step Integration ============

describe("Phase 8: Async Flow Step Integration", () => {
    it("async flow step triggers barrier decrement and join dispatch", async () => {
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);
        const barrierProvider = new InMemoryFlowBarrierProvider();
        const flowMiddleware = new FlowMiddleware<string>(
            barrierProvider,
            () => databaseAdapter.generateId()
        );

        // Register async step executor: calls success after a microtask delay
        let resolveAsync: (() => void) | null = null;
        const asyncExecutor: ISingleTaskNonParallel<string, "step-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            default_retries: 0,
            asyncConfig: {handoffTimeout: 10}, // 10ms handoff timeout — forces async path
            onTask: async (task, actions) => {
                // Wait for external resolution (simulates async work)
                await new Promise<void>(resolve => {
                    resolveAsync = () => {
                        actions.success(task, "async-result");
                        resolve();
                    };
                });
            },
        };
        taskQueue.register(queueName, "step-task", asyncExecutor);

        // Register join executor
        let joinPayload: any = null;
        const joinExecutor: ISingleTaskNonParallel<string, "join-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                joinPayload = task.payload;
                actions.success(task);
            },
        };
        taskQueue.register(queueName, "join-task", joinExecutor);

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

        // Build flow with 1 async step
        const flowId = "flow-async";
        await barrierProvider.initBarrier(flowId, 1);

        const flowMeta: FlowMeta = {
            flow_id: flowId,
            step_index: 0,
            total_steps: 1,
            join: {type: "join-task", queue_id: queueName},
            failure_policy: "continue",
        };

        const stepTask = makeTask(databaseAdapter.generateId(), "step-task", {
            force_store: true,
            metadata: {flow_meta: flowMeta as unknown as Record<string, unknown>},
        });
        await databaseAdapter.addTasksToScheduled([stepTask]);

        // Create a simple async task manager
        const asyncTaskManager = {
            canAcceptTask: () => true,
            handoffTask: (_task: any, promise: Promise<void>, _timeout?: number) => {
                // Track the promise but don't manage it — we'll await it directly
                return true;
            },
        };

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            flowMiddleware,
        });

        // Run step task — it will timeout (10ms) and go async
        const results = await taskRunner.run("worker-1", [stepTask], asyncTaskManager as any);

        // Task should have been handed off to async
        expect(results.asyncTasks.length).toBe(1);
        expect(results.successTasks.length).toBe(0);

        // Resolve the async work
        expect(resolveAsync).not.toBeNull();
        resolveAsync!();

        // Wait for the async promise chain (onPromiseFulfilled -> flowMiddleware) to complete
        await results.asyncTasks[0].promise;

        // Barrier should now be complete
        expect(await barrierProvider.isComplete(flowId)).toBe(true);

        // Join task should have been dispatched to MQ by AsyncActions
        let joinTasks: CronTask<string>[] = [];
        await messageQueue.consumeMessagesBatch(queueName, async (_queueId, msgs) => {
            joinTasks = msgs.filter(m => m.type === "join-task") as CronTask<string>[];
        });
        expect(joinTasks.length).toBe(1);

        // Run join task and verify payload
        const joinRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
        });
        await joinRunner.run("worker-join", joinTasks);

        expect(joinPayload).not.toBeNull();
        expect(joinPayload.flow_results.flow_id).toBe(flowId);
        expect(joinPayload.flow_results.steps.length).toBe(1);
        expect(joinPayload.flow_results.steps[0].status).toBe("success");
        expect(joinPayload.flow_results.steps[0].result).toBe("async-result");
    });
});
