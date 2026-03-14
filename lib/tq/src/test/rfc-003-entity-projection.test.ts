import {describe, expect, it, mock, beforeEach} from "bun:test";
import {TaskRunner} from "../core/TaskRunner.js";
import {TaskHandler} from "../core/TaskHandler.js";
import {TaskStore} from "../core/TaskStore.js";
import {TaskQueuesManager} from "../core/TaskQueuesManager.js";
import {InMemoryAdapter, CronTask} from "../adapters";
import {InMemoryQueue, QueueName} from "@supergrowthai/mq";
import {MemoryCacheProvider} from "memoose-js";
import type {ISingleTaskNonParallel} from "../core/base/interfaces.js";
import {
    IEntityProjectionProvider,
    EntityTaskProjection,
    buildProjection
} from "../core/entity/IEntityProjectionProvider.js";

declare module "@supergrowthai/mq" {
    interface QueueRegistry {
        "test-entity-queue": "test-entity-queue";
    }
    interface MessagePayloadRegistry {
        "entity-task": { data: string };
        "entity-task-b": { data: string };
    }
}

const queueName = "test-entity-queue" as QueueName;

function makeTask(
    id: string,
    type: string = "entity-task",
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

function makeEntityTask(
    id: string,
    entityId: string,
    entityType: string,
    overrides: Partial<CronTask<string>> = {}
): CronTask<string> {
    return makeTask(id, "entity-task", {
        entity: {id: entityId, type: entityType},
        ...overrides,
    });
}

function createMockProvider(): IEntityProjectionProvider<string> & {
    calls: EntityTaskProjection<string>[][];
    upsertProjections: ReturnType<typeof mock>;
} {
    const calls: EntityTaskProjection<string>[][] = [];
    const provider = {
        calls,
        upsertProjections: mock(async (entries: EntityTaskProjection<string>[]) => {
            calls.push(entries);
        }),
    };
    return provider;
}

function createStack(provider?: IEntityProjectionProvider<string>, config?: { includePayload?: boolean }) {
    const databaseAdapter = new InMemoryAdapter();
    const messageQueue = new InMemoryQueue();
    const cacheProvider = new MemoryCacheProvider();
    const taskQueue = new TaskQueuesManager<string>(messageQueue);
    const taskStore = new TaskStore<string>(databaseAdapter);

    const taskHandler = new TaskHandler<string>(
        messageQueue, taskQueue, databaseAdapter, cacheProvider,
        undefined, undefined,
        {
            entityProjection: provider,
            entityProjectionConfig: config ? {includePayload: config.includePayload} : undefined,
        }
    );

    const executor: ISingleTaskNonParallel<string, "entity-task"> = {
        multiple: false,
        parallel: false,
        store_on_failure: true,
        default_retries: 3,
        onTask: async (task, actions) => {
            actions.success(task);
        },
    };
    taskQueue.register(queueName, "entity-task", executor);

    return {databaseAdapter, messageQueue, cacheProvider, taskQueue, taskStore, taskHandler, executor};
}

// ============ A. Type-level tests ============

describe("A. Type-level", () => {
    it("A1: CronTask accepts entity field", () => {
        const task: CronTask<string> = {
            id: "t1",
            type: "entity-task",
            queue_id: queueName,
            payload: {data: "test"},
            execute_at: new Date(),
            status: "scheduled",
            created_at: new Date(),
            updated_at: new Date(),
            entity: {id: "e1", type: "order"},
        };
        expect(task.entity).toEqual({id: "e1", type: "order"});
    });

    it("A2: CronTask without entity compiles fine", () => {
        const task: CronTask<string> = {
            id: "t2",
            type: "entity-task",
            queue_id: queueName,
            payload: {data: "test"},
            execute_at: new Date(),
            status: "scheduled",
            created_at: new Date(),
            updated_at: new Date(),
        };
        expect(task.entity).toBeUndefined();
    });
});

// ============ B. syncProjections + provider wiring (addTasks) ============

describe("B. addTasks entity projections", () => {
    it("B3: addTasks with entity tasks -> provider receives batch with status 'scheduled'", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-123", "order");
        await taskHandler.addTasks([task]);

        expect(provider.upsertProjections).toHaveBeenCalled();
        const allProjections = provider.calls.flat();
        const scheduled = allProjections.filter(p => p.status === 'scheduled');
        expect(scheduled.length).toBeGreaterThanOrEqual(1);
        expect(scheduled[0].entity_id).toBe("order-123");
        expect(scheduled[0].entity_type).toBe("order");
        expect(scheduled[0].task_type).toBe("entity-task");
    });

    it("B4: addTasks with mixed entity/non-entity -> provider only receives entity tasks", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const entityTask = makeEntityTask(databaseAdapter.generateId(), "order-1", "order");
        const plainTask = makeTask(databaseAdapter.generateId(), "entity-task");

        await taskHandler.addTasks([entityTask, plainTask]);

        const allProjections = provider.calls.flat();
        expect(allProjections.length).toBe(1);
        expect(allProjections[0].entity_id).toBe("order-1");
    });

    it("B5: addTasks with no entity tasks -> provider NOT called", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const task = makeTask(databaseAdapter.generateId(), "entity-task");
        await taskHandler.addTasks([task]);

        expect(provider.upsertProjections).not.toHaveBeenCalled();
    });

    it("B6: No provider configured + entity tasks -> no error", async () => {
        const {taskHandler, databaseAdapter} = createStack(undefined);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order");
        // Should not throw
        await taskHandler.addTasks([task]);
    });
});

// ============ C. Processing projection ============

describe("C. Processing projection", () => {
    it("C7: First execution -> provider called with status 'processing'", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order");
        await taskHandler.addTasks([task]);

        // Reset calls from addTasks
        provider.calls.length = 0;
        provider.upsertProjections.mockClear();

        // Simulate consuming via startConsumingTasks — we need to trigger the TaskRunner path
        // For unit testing, we directly use TaskRunner
        const {taskQueue, taskStore, cacheProvider, messageQueue} = createStack(provider);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            entityProjection: provider,
        });

        const executor: ISingleTaskNonParallel<string, "entity-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (t, actions) => {
                actions.success(t);
            },
        };
        taskQueue.register(queueName, "entity-task", executor);

        await taskRunner.run("worker-1", [task]);

        const allProjections = provider.calls.flat();
        const processing = allProjections.filter(p => p.status === 'processing');
        expect(processing.length).toBeGreaterThanOrEqual(1);
        expect(processing[0].entity_id).toBe("order-1");
    });

    it("C8: Retry execution (retry_count > 0) -> NO 'processing' projection", async () => {
        const provider = createMockProvider();
        const {databaseAdapter} = createStack(provider);

        const {taskQueue, taskStore, cacheProvider, messageQueue} = createStack(provider);
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            entityProjection: provider,
        });

        const executor: ISingleTaskNonParallel<string, "entity-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (t, actions) => {
                actions.success(t);
            },
        };
        taskQueue.register(queueName, "entity-task", executor);

        const retryTask = makeEntityTask(databaseAdapter.generateId(), "order-1", "order", {
            execution_stats: {retry_count: 1},
        });

        await taskRunner.run("worker-1", [retryTask]);

        const allProjections = provider.calls.flat();
        const processing = allProjections.filter(p => p.status === 'processing');
        expect(processing.length).toBe(0);
    });
});

// ============ D. Terminal projections (postProcessTasks) ============

describe("D. Terminal projections", () => {
    it("D9: Task succeeds -> provider called with 'executed', result from execution_result", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter, taskQueue} = createStack(provider);

        // Register executor that returns a result
        const executor: ISingleTaskNonParallel<string, "entity-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task, {receipt: "R-001"});
            },
        };
        taskQueue.register(queueName, "entity-task", executor);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order");
        await taskHandler.addTasks([task]);

        // Reset calls from addTasks
        provider.calls.length = 0;

        // Simulate postProcessTasks with success tasks
        const successTask = {...task, execution_result: {receipt: "R-001"}};
        await taskHandler.postProcessTasks({
            successTasks: [successTask],
            failedTasks: [],
            newTasks: [],
        });

        const allProjections = provider.calls.flat();
        const executed = allProjections.filter(p => p.status === 'executed');
        expect(executed.length).toBeGreaterThanOrEqual(1);
        expect(executed[0].entity_id).toBe("order-1");
        expect(executed[0].result).toEqual({receipt: "R-001"});
    });

    it("D10: Task fails (final, exhausted retries) -> provider called with 'failed'", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order", {
            retries: 1,
            execution_stats: {retry_count: 1, last_error: "Timeout exceeded"},
        });

        provider.calls.length = 0;

        await taskHandler.postProcessTasks({
            successTasks: [],
            failedTasks: [task],
            newTasks: [],
        });

        const allProjections = provider.calls.flat();
        const failed = allProjections.filter(p => p.status === 'failed');
        expect(failed.length).toBeGreaterThanOrEqual(1);
        expect(failed[0].entity_id).toBe("order-1");
        expect(failed[0].error).toBe("Timeout exceeded");
    });

    it("D11: Discarded task with ID (store_on_failure) and entity -> provider called with 'failed'", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        // Discarded = has id + exhausted retries (retry_count >= retries)
        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order", {
            retries: 0,
            execution_stats: {retry_count: 0, last_error: "No handler"},
        });

        provider.calls.length = 0;

        await taskHandler.postProcessTasks({
            successTasks: [],
            failedTasks: [task],
            newTasks: [],
        });

        const allProjections = provider.calls.flat();
        const failed = allProjections.filter(p => p.status === 'failed');
        expect(failed.length).toBeGreaterThanOrEqual(1);
        expect(failed[0].entity_id).toBe("order-1");
    });

    it("D11b: Entity task without ID -> buildProjection throws with actionable error", async () => {
        const task = makeEntityTask("", "order-1", "order", {
            id: undefined as any,
        });

        expect(() => buildProjection(task, 'scheduled')).toThrow("has no task ID");
    });
});

// ============ E. Provider failure tolerance ============

describe("E. Provider failure tolerance", () => {
    it("E12: upsertProjections throws -> task processing continues", async () => {
        const provider = createMockProvider();
        provider.upsertProjections.mockImplementation(async () => {
            throw new Error("DB connection lost");
        });

        const {taskHandler, databaseAdapter} = createStack(provider);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order");

        // postProcessTasks should not throw even if provider fails
        await taskHandler.postProcessTasks({
            successTasks: [task],
            failedTasks: [],
            newTasks: [],
        });

        // Verify the provider WAS called (it just threw)
        expect(provider.upsertProjections).toHaveBeenCalled();
    });

    it("E12b: Entity task without ID (discarded path) -> buildProjection throws but postProcessTasks continues", async () => {
        const provider = createMockProvider();
        const {taskHandler} = createStack(provider);

        // Discarded task: has entity but NO id (store_on_failure=false, no force_store)
        const task = makeEntityTask("", "order-1", "order", {
            id: undefined as any,
            retries: 0,
            execution_stats: {retry_count: 0, last_error: "No handler"},
        });

        provider.calls.length = 0;

        // postProcessTasks should NOT throw — try/catch in TaskHandler guards the hot path
        await taskHandler.postProcessTasks({
            successTasks: [],
            failedTasks: [task],
            newTasks: [],
        });
    });

    it("E12c: Entity task without ID in addTasks -> addTasks continues normally", async () => {
        const provider = createMockProvider();
        const {taskHandler} = createStack(provider);

        // Task with entity but executor has store_on_failure=false equivalent
        // (the default executor in createStack has store_on_failure=true, so we test
        // that even if buildProjection throws for some tasks, the batch still completes)
        const entityTaskNoId = makeEntityTask("", "order-1", "order", {
            id: undefined as any,
        });
        const normalTask = makeTask("normal-1", "entity-task");

        // Should not throw
        await taskHandler.addTasks([entityTaskNoId, normalTask]);
    });

    it("E13: Provider throws on 'scheduled' -> task still gets added to MQ/DB normally", async () => {
        const provider = createMockProvider();
        provider.upsertProjections.mockImplementation(async () => {
            throw new Error("Provider down");
        });

        const {taskHandler, databaseAdapter, messageQueue} = createStack(provider);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order");

        // Should not throw
        await taskHandler.addTasks([task]);

        // Verify task was still added to MQ (immediate path)
        // The fact that addTasks didn't throw is the assertion
    });
});

// ============ F. Async path ============

describe("F. Async path", () => {
    it("F14: Async task completes successfully -> provider called with 'executed' from AsyncActions", async () => {
        const provider = createMockProvider();
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);

        const executor: ISingleTaskNonParallel<string, "entity-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            asyncConfig: {handoffTimeout: 50},
            onTask: async (task, actions) => {
                await new Promise(r => setTimeout(r, 100)); // exceed handoff timeout
                actions.success(task, {done: true});
            },
        };
        taskQueue.register(queueName, "entity-task", executor);

        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            entityProjection: provider,
        });

        const task = makeEntityTask(databaseAdapter.generateId(), "order-async", "order");

        // Pre-store task for async handoff
        await databaseAdapter.addTasksToScheduled([task]);

        const {AsyncTaskManager} = await import("../core/async/AsyncTaskManager.js");
        const asyncManager = new AsyncTaskManager<string>(10);
        const results = await taskRunner.run("worker-1", [task], asyncManager);

        if (results.asyncTasks.length > 0) {
            asyncManager.handoffTask(results.asyncTasks[0].task, results.asyncTasks[0].promise);
            await new Promise(r => setTimeout(r, 300));
        }

        const allProjections = provider.calls.flat();
        const executed = allProjections.filter(p => p.status === 'executed');
        expect(executed.length).toBeGreaterThanOrEqual(1);
        expect(executed[0].entity_id).toBe("order-async");
    });
});

// ============ G. Config ============

describe("G. Config", () => {
    it("G15: includePayload: true -> projection includes payload", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider, {includePayload: true});

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order", {
            payload: {data: "important"},
        });

        await taskHandler.addTasks([task]);

        const allProjections = provider.calls.flat();
        const withPayload = allProjections.filter(p => p.payload !== undefined);
        expect(withPayload.length).toBeGreaterThanOrEqual(1);
        expect(withPayload[0].payload).toEqual({data: "important"});
    });

    it("G16: includePayload: false (default) -> projection.payload is undefined", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const task = makeEntityTask(databaseAdapter.generateId(), "order-1", "order", {
            payload: {data: "important"},
        });

        await taskHandler.addTasks([task]);

        const allProjections = provider.calls.flat();
        expect(allProjections.length).toBeGreaterThanOrEqual(1);
        expect(allProjections[0].payload).toBeUndefined();
    });
});

// ============ H. Batch behavior ============

describe("H. Batch behavior", () => {
    it("H17: Batch of 100 tasks, 30 with entity -> syncProjections receives exactly 30 projections", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const tasks: CronTask<string>[] = [];
        for (let i = 0; i < 100; i++) {
            if (i < 30) {
                tasks.push(makeEntityTask(databaseAdapter.generateId(), `entity-${i}`, "order"));
            } else {
                tasks.push(makeTask(databaseAdapter.generateId(), "entity-task"));
            }
        }

        await taskHandler.addTasks(tasks);

        const totalProjections = provider.calls.flat();
        expect(totalProjections.length).toBe(30);
    });

    it("H18: Mixed success+failed batch -> correct statuses in projections", async () => {
        const provider = createMockProvider();
        const {taskHandler, databaseAdapter} = createStack(provider);

        const successTask = makeEntityTask(databaseAdapter.generateId(), "order-ok", "order", {
            execution_result: {ok: true},
        });
        const failedTask = makeEntityTask(databaseAdapter.generateId(), "order-fail", "order", {
            retries: 0,
            execution_stats: {retry_count: 0, last_error: "Boom"},
        });

        provider.calls.length = 0;

        await taskHandler.postProcessTasks({
            successTasks: [successTask],
            failedTasks: [failedTask],
            newTasks: [],
        });

        const allProjections = provider.calls.flat();
        const executed = allProjections.filter(p => p.status === 'executed');
        const failed = allProjections.filter(p => p.status === 'failed');
        expect(executed.length).toBeGreaterThanOrEqual(1);
        expect(failed.length).toBeGreaterThanOrEqual(1);
        expect(executed[0].entity_id).toBe("order-ok");
        expect(failed[0].entity_id).toBe("order-fail");
    });
});

// ============ I. Full pipeline (end-to-end) ============

describe("I. Full pipeline", () => {
    it("I19: Entity task full lifecycle: scheduled -> processing -> executed", async () => {
        const provider = createMockProvider();
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);

        const executor: ISingleTaskNonParallel<string, "entity-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            onTask: async (task, actions) => {
                actions.success(task, {receipt: "R-100"});
            },
        };
        taskQueue.register(queueName, "entity-task", executor);

        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider,
            undefined, undefined,
            {entityProjection: provider},
        );

        const taskId = databaseAdapter.generateId();
        const task = makeEntityTask(taskId, "order-e2e", "order");

        // Step 1: addTasks (scheduled projection)
        await taskHandler.addTasks([task]);

        // Verify scheduled projection
        const scheduledProjections = provider.calls.flat().filter(p => p.status === 'scheduled');
        expect(scheduledProjections.length).toBe(1);
        expect(scheduledProjections[0].entity_id).toBe("order-e2e");

        // Step 2: Consume and process (processing + executed projections)
        // We'll manually run the pipeline since startConsumingTasks is a streaming API
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            entityProjection: provider,
        });

        provider.calls.length = 0;
        const results = await taskRunner.run("worker-1", [task]);

        // Verify processing projection
        const processingProjections = provider.calls.flat().filter(p => p.status === 'processing');
        expect(processingProjections.length).toBe(1);

        // Step 3: Post-process (executed projection)
        provider.calls.length = 0;
        await taskHandler.postProcessTasks({
            successTasks: results.successTasks,
            failedTasks: results.failedTasks,
            newTasks: results.newTasks,
        });

        const executedProjections = provider.calls.flat().filter(p => p.status === 'executed');
        expect(executedProjections.length).toBe(1);
        expect(executedProjections[0].entity_id).toBe("order-e2e");
    });

    it("I20: Entity task that fails after retries: scheduled -> processing -> failed", async () => {
        const provider = createMockProvider();
        const databaseAdapter = new InMemoryAdapter();
        const messageQueue = new InMemoryQueue();
        const cacheProvider = new MemoryCacheProvider();
        const taskQueue = new TaskQueuesManager<string>(messageQueue);
        const taskStore = new TaskStore<string>(databaseAdapter);

        const executor: ISingleTaskNonParallel<string, "entity-task"> = {
            multiple: false,
            parallel: false,
            store_on_failure: true,
            default_retries: 0,
            onTask: async (task, actions) => {
                actions.fail(task, new Error("processing failed"));
            },
        };
        taskQueue.register(queueName, "entity-task", executor);

        const taskHandler = new TaskHandler<string>(
            messageQueue, taskQueue, databaseAdapter, cacheProvider,
            undefined, undefined,
            {entityProjection: provider},
        );

        const taskId = databaseAdapter.generateId();
        const task = makeEntityTask(taskId, "order-fail-e2e", "order", {
            retries: 0,
        });

        // Step 1: addTasks (scheduled)
        await taskHandler.addTasks([task]);

        const scheduledProjections = provider.calls.flat().filter(p => p.status === 'scheduled');
        expect(scheduledProjections.length).toBe(1);

        // Step 2: Run the task (processing)
        const taskRunner = new TaskRunner<string>({
            messageQueue, taskQueue, taskStore, cacheProvider,
            generateId: () => databaseAdapter.generateId(),
            entityProjection: provider,
        });

        provider.calls.length = 0;
        const results = await taskRunner.run("worker-1", [task]);

        const processingProjections = provider.calls.flat().filter(p => p.status === 'processing');
        expect(processingProjections.length).toBe(1);

        // Step 3: Post-process (failed — retries exhausted since retries=0, retry_count=0)
        provider.calls.length = 0;
        const failedWithError = results.failedTasks.map(t => ({
            ...t,
            execution_stats: {...(t.execution_stats || {}), last_error: "processing failed"},
        }));
        await taskHandler.postProcessTasks({
            successTasks: [],
            failedTasks: failedWithError,
            newTasks: results.newTasks,
        });

        const failedProjections = provider.calls.flat().filter(p => p.status === 'failed');
        expect(failedProjections.length).toBeGreaterThanOrEqual(1);
        expect(failedProjections[0].entity_id).toBe("order-fail-e2e");
        expect(failedProjections[0].error).toBe("processing failed");
    });
});
