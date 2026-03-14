# @supergrowthai/tq

A clean, dependency-injection based task queue management library with multiple executor types and async task handling.
Built on top of `@supergrowthai/mq` for flexible message queue backends.

## Features

- **Clean Architecture**: Constructor-based dependency injection with no global state
- **Multiple Executor Types**: Single task (parallel/non-parallel) and multi-task executors
- **Async Task Management**: Handle long-running tasks with configurable timeouts
- **Type-Safe**: Full TypeScript support with generic task types
- **Queue Integration**: Works with any message queue backend via `@supergrowthai/mq`
- **Named Exports**: Tree-shakable, explicit imports
- **Fail-Fast Design**: Required dependencies enforce proper configuration
- **Entity Projection**: Automatic entity-task status tracking for dashboards and orchestration
- **Flow Orchestration**: Built-in fan-out/fan-in with barrier tracking, failure policies, and timeouts

## Installation

```bash
npm install @supergrowthai/tq @supergrowthai/mq
```

## Quick Start

```typescript
import {TaskQueuesManager, TaskHandler} from '@supergrowthai/tq';
import {InMemoryQueue} from '@supergrowthai/mq';

// 1. Set up your message queue (see @supergrowthai/mq docs for details)

const databaseAdapter = /* your ITaskStorageAdapter implementation */;
const cacheAdapter = /* your CacheProvider implementation */;

// 2. Create instances with dependency injection
const messageQueue = new InMemoryQueue();
const taskQueue = new TaskQueuesManager(messageQueue);
const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    databaseAdapter,
    cacheAdapter
    // asyncTaskManager optional
);

// 3. Register task executors
taskQueue.register('email-queue', 'send-email', {
    multiple: false,
    parallel: false,
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        try {
            await sendEmail(task.payload.to, task.payload.subject);
            actions.success(task, { messageId: 'abc-123' });
        } catch (error) {
            console.error('Failed to send email:', error);
            actions.fail(task, error instanceof Error ? error : String(error));
        }
    }
});

// 4. Start processing
taskHandler.taskProcessServer();
```

## Core Components

### TaskQueuesManager

Manages task executor registration and retrieval:

```typescript
import {TaskQueuesManager} from '@supergrowthai/tq';
import {IMessageQueue} from '@supergrowthai/mq';

const taskQueue = new TaskQueuesManager(messageQueue);

// Register executors
taskQueue.register('queue-name', 'task-type', executor);

// Get executor
const executor = taskQueue.getExecutor('queue-name', 'task-type');

// Get queue information
const queues = taskQueue.getQueues();
const taskTypes = taskQueue.getTaskTypesForQueue('queue-name');
```

### TaskHandler

Manages task processing, retries, and queue consumption:

```typescript
import {TaskHandler} from '@supergrowthai/tq';

const taskHandler = new TaskHandler(
    messageQueue,      // IMessageQueue
    taskQueue,         // TaskQueuesManager
    databaseAdapter,   // ITaskStorageAdapter
    cacheAdapter,      // CacheProvider<any>
    asyncTaskManager   // IAsyncTaskManager (optional)
);

// Start processing all registered queues
taskHandler.taskProcessServer();

// Or process specific queues
taskHandler.startConsumingTasks('email-queue');

// With AbortSignal for graceful shutdown
const abortController = new AbortController();
taskHandler.startConsumingTasks('email-queue', abortController.signal);

// Process mature tasks (scheduled for future execution)
taskHandler.processMatureTasks();
```

### TaskRunner

Handles task execution with locking and async support. Internal to TaskHandler — not typically instantiated directly.

```typescript
import {TaskRunner} from '@supergrowthai/tq';

const taskRunner = new TaskRunner({
    messageQueue,
    taskQueue,
    taskStore,
    cacheProvider,
    generateId: databaseAdapter.generateId.bind(databaseAdapter),
    lifecycleProvider,       // optional
    lifecycleConfig,         // optional
    entityProjection,        // optional
    entityProjectionConfig,  // optional
    flowMiddleware,          // optional — typically created by TaskHandler
    flowLifecycleProvider,   // optional
    workerId: 'my-worker',   // optional
});

// Run tasks
const result = await taskRunner.run(
    'runner-id',
    tasks,
    asyncTaskManager  // optional
);
```

## Task Executor Types

### Single Task Non-Parallel Executor

For tasks that should be processed one at a time:

```typescript
import {ISingleTaskNonParallel} from '@supergrowthai/tq';

interface EmailData {
    to: string;
    subject: string;
    body: string;
}

const emailExecutor: ISingleTaskNonParallel<EmailData> = {
    multiple: false,
    parallel: false,
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        try {
            await sendEmail(task.payload);
            actions.success(task);
        } catch (error) {
            console.error('Email sending failed:', error);
            actions.fail(task, error instanceof Error ? error : String(error));
        }
    }
};

taskQueue.register('email-queue', 'send-email', emailExecutor);
```

### Single Task Parallel Executor

For tasks that can be processed in parallel batches:

```typescript
import {ISingleTaskParallel} from '@supergrowthai/tq';

const imageProcessorExecutor: ISingleTaskParallel<ImageData> = {
    multiple: false,
    parallel: true,
    chunkSize: 5,           // Process 5 images at a time
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        try {
            await processImage(task.payload.imageUrl, task.payload.filters);
            actions.success(task, { processedUrl: task.payload.imageUrl });
        } catch (error) {
            console.error('Image processing failed:', error);
            actions.fail(task, error instanceof Error ? error : String(error));
        }
    }
};

taskQueue.register('image-queue', 'process-image', imageProcessorExecutor);
```

### Multi-Task Executor

For processing multiple tasks together as a batch:

```typescript
import {IMultiTaskExecutor} from '@supergrowthai/tq';

const batchProcessorExecutor: IMultiTaskExecutor<BatchData> = {
    multiple: true,
    default_retries: 2,
    store_on_failure: true,

    async onTasks(tasks, actions) {
        console.log(`Processing batch of ${tasks.length} tasks`);

        for (const task of tasks) {
            try {
                await processBatchItem(task.payload);
                actions.success(task);
            } catch (error) {
                console.error('Batch item failed:', error);
                actions.fail(task, error instanceof Error ? error : String(error));

                // Optionally add retry tasks
                if ((task.retries || 0) < 3) {
                    actions.addTasks([{
                        ...task,
                        retries: (task.retries || 0) + 1,
                        execute_at: new Date(Date.now() + 60000) // Retry in 1 minute
                    }]);
                }
            }
        }
    }
};

taskQueue.register('batch-queue', 'process-batch', batchProcessorExecutor);
```

## Async Task Management

For long-running tasks that might exceed normal timeouts:

```typescript
import {AsyncTaskManager} from '@supergrowthai/tq';
import type {AsyncTaskManagerOptions} from '@supergrowthai/tq';

// Simple usage (backward-compatible)
const asyncTaskManager = new AsyncTaskManager(10); // maxTasks shorthand

// Full options
const asyncTaskManager = new AsyncTaskManager({
    maxTasks: 10,
    sweepIntervalMs: 5000,          // How often to check for hung tasks (default: 5s)
    defaultMaxDurationMs: 600000,   // Max task duration before eviction (default: 10 min)
    shutdownGracePeriodMs: 15000,   // Grace period on shutdown (default: 10s)
    onTaskTimeout: (taskId, task, durationMs) => {
        console.error(`Task ${taskId} (${task.type}) timed out after ${durationMs}ms`);
    }
});

// Observability
const metrics = asyncTaskManager.getMetrics();
// { activeTaskCount, totalHandedOff, totalCompleted, totalRejected,
//   totalTimedOut, oldestTaskMs, maxTasks, utilizationPercent }

// Graceful shutdown — returns ShutdownResult
const result = await asyncTaskManager.shutdown(abortController.signal);
console.log(`Completed: ${result.completedDuringGrace}, Abandoned: ${result.abandonedTaskIds}`);

const heavyProcessingExecutor: ISingleTaskNonParallel<ProcessingData> = {
    multiple: false,
    parallel: false,
    default_retries: 1,
    store_on_failure: true,

    // Configure async handoff for tasks taking longer than 30 seconds
    asyncConfig: {
        handoffTimeout: 30000        // 30 seconds
    },

    async onTask(task, actions) {
        try {
            // This might take a very long time
            const result = await performHeavyComputation(task.payload);
            actions.success(task, result);
        } catch (error) {
            actions.fail(task, error instanceof Error ? error : String(error));
        }
    }
};

// Pass async task manager to TaskHandler
const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    databaseAdapter,
    cacheAdapter,
    asyncTaskManager  // Now tasks can be handed off to async processing
);
```

Key features:
- **Stale task sweep**: Periodically evicts tasks exceeding `defaultMaxDurationMs`
- **Duplicate rejection**: Rejects handoff if the same task ID is already tracked
- **Shutdown-aware gate**: Stops accepting new tasks once `shutdown()` is called
- **Observability**: `getMetrics()` exposes utilization, counters, and oldest task age

## Lifecycle Callbacks

Monitor task and worker lifecycle events for health checks, metrics collection, and observability:

### Task Lifecycle Provider

Track individual task events:

```typescript
import {ITaskLifecycleProvider, TaskContext, TaskTiming} from '@supergrowthai/tq';

const taskLifecycleProvider: ITaskLifecycleProvider = {
    onTaskScheduled(ctx: TaskContext) {
        console.log(`Task scheduled: ${ctx.task_type} (${ctx.task_id})`);
    },

    onTaskStarted(ctx: TaskContext & { started_at: Date; queued_duration_ms: number }) {
        console.log(`Task started: ${ctx.task_id}, queued for ${ctx.queued_duration_ms}ms`);
    },

    onTaskCompleted(ctx: TaskContext & { timing: TaskTiming; result?: unknown }) {
        console.log(`Task completed: ${ctx.task_id} in ${ctx.timing.processing_duration_ms}ms`);
    },

    onTaskFailed(ctx: TaskContext & { timing: TaskTiming; error: Error; will_retry: boolean }) {
        console.error(`Task failed: ${ctx.task_id}, will_retry: ${ctx.will_retry}`);
    },

    onTaskExhausted(ctx: TaskContext & { timing: TaskTiming; error: Error; total_attempts: number }) {
        console.error(`Task exhausted: ${ctx.task_id} after ${ctx.total_attempts} attempts`);
    },

    onTaskCancelled(ctx: TaskContext & { reason: string }) {
        console.log(`Task cancelled: ${ctx.task_id}, reason: ${ctx.reason}`);
    }
};
```

### Worker Lifecycle Provider

Track worker and batch events:

```typescript
import {IWorkerLifecycleProvider, WorkerInfo, WorkerStats} from '@supergrowthai/tq';

const workerLifecycleProvider: IWorkerLifecycleProvider = {
    onWorkerStarted(info: WorkerInfo) {
        console.log(`Worker started: ${info.worker_id} on ${info.hostname}`);
    },

    onWorkerHeartbeat(info: WorkerInfo & { stats: WorkerStats; memory_usage_mb: number }) {
        console.log(`Heartbeat: ${info.worker_id}, processed: ${info.stats.tasks_processed}`);
    },

    onWorkerStopped(info: WorkerInfo & { reason: 'shutdown' | 'error' | 'idle_timeout'; final_stats: WorkerStats }) {
        console.log(`Worker stopped: ${info.worker_id}, reason: ${info.reason}`);
    },

    onBatchStarted(info: WorkerInfo & { batch_size: number; task_types: string[] }) {
        console.log(`Batch started: ${info.batch_size} tasks`);
    },

    onBatchCompleted(info: WorkerInfo & { batch_size: number; succeeded: number; failed: number }) {
        console.log(`Batch completed: ${info.succeeded}/${info.batch_size} succeeded`);
    },

    onConsumerStarted(info: ConsumerInfo) {
        console.log(`Consumer started: ${info.consumer_id} on queue ${info.queue_id}`);
    },

    onConsumerStopped(info: ConsumerInfo & { reason: 'shutdown' | 'error' | 'idle_timeout'; stats: ConsumerStats }) {
        console.log(`Consumer stopped: ${info.consumer_id}, processed: ${info.stats.tasks_processed}`);
    }
};
```

The heartbeat callback also includes `active_consumers: ConsumerStats[]` for per-consumer-per-worker visibility in SRE dashboards.

### Flow Lifecycle Provider

Track flow orchestration events (fan-out/fan-in):

```typescript
import {IFlowLifecycleProvider, FlowContext} from '@supergrowthai/tq';

const flowLifecycleProvider: IFlowLifecycleProvider = {
    onFlowStarted(ctx: FlowContext & { started_at: Date; step_types: string[] }) {
        console.log(`Flow started: ${ctx.flow_id}, ${ctx.total_steps} steps`);
    },

    onFlowCompleted(ctx: FlowContext & { duration_ms: number; steps_succeeded: number; steps_failed: number }) {
        console.log(`Flow completed: ${ctx.flow_id} in ${ctx.duration_ms}ms`);
    },

    onFlowAborted(ctx: FlowContext & { duration_ms: number; steps_completed: number; trigger_step_index: number }) {
        console.log(`Flow aborted: ${ctx.flow_id}, trigger step: ${ctx.trigger_step_index}`);
    },

    onFlowTimedOut(ctx: FlowContext & { duration_ms: number; steps_completed: number }) {
        console.log(`Flow timed out: ${ctx.flow_id}, ${ctx.steps_completed} steps completed`);
    }
};
```

Flow events are split across two pipeline stages:
- `onFlowStarted` fires during task execution (when `actions.startFlow()` is called)
- `onFlowCompleted/Aborted/TimedOut` fire during post-processing (when barriers resolve)

### Batch Executor Lifecycle

Track multi-task (batch) executor events for task-level accounting:

```typescript
const taskLifecycleProvider: ITaskLifecycleProvider = {
    onTaskBatchStarted(ctx) {
        console.log(`Batch started: ${ctx.task_type}, ${ctx.tasks.length} tasks`);
    },

    onTaskBatchCompleted(ctx) {
        console.log(`Batch done: ${ctx.succeeded.length} ok, ${ctx.failed.length} failed in ${ctx.duration_ms}ms`);
    }
};
```

### Using Lifecycle Providers

Pass lifecycle providers when creating TaskHandler:

```typescript
import {TaskHandler, ConsoleHealthProvider} from '@supergrowthai/tq';

// Option 1: Use built-in ConsoleHealthProvider
const healthProvider = new ConsoleHealthProvider();

const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    databaseAdapter,
    cacheAdapter,
    asyncTaskManager,
    notificationProvider,
    {
        lifecycleProvider: healthProvider,
        workerProvider: healthProvider,
        lifecycle: {
            mode: 'async',           // 'sync' or 'async' (default: async)
            heartbeat_interval_ms: 5000,  // Worker heartbeat interval
            include_payload: false   // Include task payload in callbacks
        }
    }
);

// Option 2: Custom providers
const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    databaseAdapter,
    cacheAdapter,
    asyncTaskManager,
    notificationProvider,
    {
        lifecycleProvider: myTaskLifecycleProvider,
        workerProvider: myWorkerLifecycleProvider,
        lifecycle: {
            mode: 'sync'  // Callbacks block task processing
        }
    }
);
```

### TaskContext Properties

| Property     | Type                    | Description                      |
|--------------|-------------------------|----------------------------------|
| task_id      | string                  | Unique task identifier           |
| task_hash    | string?                 | Optional deduplication hash      |
| task_type    | string                  | Type of the task                 |
| queue_id     | string                  | Queue the task belongs to        |
| payload      | Record<string, unknown> | Task payload                     |
| attempt      | number                  | Current attempt number           |
| max_retries  | number                  | Maximum retry attempts           |
| scheduled_at | Date                    | When task was scheduled          |
| worker_id    | string?                 | ID of worker processing the task |
| consumer_id  | string?                 | Consumer stream identity (distinguishes multiple consumers on same worker) |
| log_context  | Record<string, string>? | User-provided log correlation context (RFC-005) |

### WorkerInfo Properties

| Property       | Type     | Description              |
|----------------|----------|--------------------------|
| worker_id      | string   | Unique worker identifier |
| hostname       | string   | Machine hostname         |
| pid            | number   | Process ID               |
| started_at     | Date     | When worker started      |
| enabled_queues | string[] | Queues being processed   |

## Entity Task Projection

Track task lifecycle at the entity level without querying internal task tables. Useful for dashboards, customer-facing status pages, and flow orchestration.

### How It Works

Tasks can carry an `entity` binding — an external domain object (e.g., a user, order, or campaign) that the task operates on. When configured, tq automatically projects status transitions to your provider:

```
scheduled → processing → executed
                       → failed
```

Projections are **non-fatal** — provider errors are logged but never disrupt task processing.

### Binding an Entity to a Task

```typescript
await taskHandler.addTasks([{
    type: 'generate-report',
    queue_id: 'reports',
    execute_at: new Date(),
    payload: { reportType: 'monthly', userId: 'u_123' },

    // Entity binding — ties this task to a domain object
    entity: { id: 'u_123', type: 'user' },

    // Entity tasks MUST have a persistent ID for projection keying.
    // Use store_on_failure: true on the executor, or force_store: true here.
}]);
```

**Fail-fast guarantee**: If a task has `entity` but no `id`, `buildProjection()` throws at runtime with an actionable error message pointing to `store_on_failure`, `force_store`, or manual ID assignment. This catches misconfiguration during development, not in production at 3 AM.

### Implementing a Projection Provider

```typescript
import type {IEntityProjectionProvider, EntityTaskProjection} from '@supergrowthai/tq';

class PostgresProjectionProvider implements IEntityProjectionProvider<string> {
    async upsertProjections(entries: EntityTaskProjection<string>[]): Promise<void> {
        // Batch upsert to your projection table
        await db.query(`
            INSERT INTO entity_task_projections
                (task_id, entity_id, entity_type, task_type, queue_id, status,
                 payload, error, result, created_at, updated_at)
            VALUES ${entries.map((_, i) => `($${i * 11 + 1}, ...)`).join(', ')}
            ON CONFLICT (task_id) DO UPDATE SET
                status = EXCLUDED.status,
                error = EXCLUDED.error,
                result = EXCLUDED.result,
                updated_at = EXCLUDED.updated_at
        `, entries.flatMap(e => [
            e.task_id, e.entity_id, e.entity_type, e.task_type, e.queue_id,
            e.status, e.payload, e.error, e.result, e.created_at, e.updated_at
        ]));
    }
}
```

### Wiring It Up

```typescript
const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    databaseAdapter,
    cacheAdapter,
    asyncTaskManager,
    notificationProvider,
    {
        lifecycleProvider: myLifecycleProvider,
        workerProvider: myWorkerProvider,

        // RFC-003: Entity projection
        entityProjection: new PostgresProjectionProvider(),
        entityProjectionConfig: {
            includePayload: false  // default; set true to persist payload in projections
        }
    }
);
```

### Projection Lifecycle

| Event | Status | When | Where |
|-------|--------|------|-------|
| Task added | `scheduled` | After `addTasks()` completes (all 3 routing paths) | `TaskHandler.addTasks` |
| Worker picks up task | `processing` | Before executor runs (first attempt only, not retries) | `TaskRunner.run` |
| Task succeeds | `executed` | After `markTasksAsSuccess` | `TaskHandler.postProcessTasks` / `AsyncActions` |
| Task exhausts retries | `failed` | After `markTasksAsFailed` or discard | `TaskHandler.postProcessTasks` / `AsyncActions` |

### EntityTaskProjection Shape

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | `ID` | Task identifier (required — fail-fast if missing) |
| `entity_id` | `string` | External entity identifier |
| `entity_type` | `string` | Entity type (e.g., `'user'`, `'order'`) |
| `task_type` | `string` | Task type identifier |
| `queue_id` | `string` | Queue the task belongs to |
| `status` | `'scheduled' \| 'processing' \| 'executed' \| 'failed'` | Current lifecycle status |
| `payload` | `unknown?` | Task payload (only if `includePayload: true`) |
| `error` | `string?` | Error message (only on `failed` status) |
| `result` | `unknown?` | Execution result (only on `executed` status) |
| `created_at` | `Date` | Task creation time |
| `updated_at` | `Date` | Projection update time |

### Design Decisions

- **Non-fatal**: Provider errors are caught and logged. Task processing is never interrupted by projection failures.
- **Batch-efficient**: All projections within a processing batch are collected and sent in a single `upsertProjections()` call.
- **No retry-spam**: `processing` projection is only emitted on the first attempt, not on retries.
- **Async-aware**: Async tasks (via `handoffTimeout`) emit terminal projections from `AsyncActions` when the promise resolves.
- **Fail-fast on misconfiguration**: Entity tasks without an ID throw immediately with an actionable fix, rather than silently producing broken projections.

## Flow Orchestration

Fan-out/fan-in flow orchestration built into the task pipeline. Dispatch N parallel steps, track completion via a barrier, and automatically dispatch a join task when all steps complete.

### How It Works

```
actions.startFlow()
  -> fan-out: [images.resize, video.transcode, metadata.validate]
  -> barrier: tracks completion of all 3 steps
  -> fan-in:  item.process.completed (receives merged results)
```

Steps execute as normal tasks with no awareness of the flow. The framework handles barrier tracking and join dispatch via `FlowMiddleware` in the post-processing pipeline.

### Starting a Flow

```typescript
const flowId = actions.startFlow({
    steps: [
        { type: 'images.resize', queue_id: 'media', payload: { imageId: 'img_1' } },
        { type: 'video.transcode', queue_id: 'media', payload: { videoId: 'vid_1' } },
        { type: 'metadata.validate', queue_id: 'default', payload: { itemId: 'item_1' } },
    ],
    config: {
        join: { type: 'item.process.completed', queue_id: 'default' },
        failure_policy: 'continue',  // or 'abort'
        timeout_ms: 300000,          // optional — 5 minute deadline
        entity: { id: 'item-123', type: 'Item' },  // optional — flow-level entity tracking
    }
});
// flowId is a UUID identifying this flow instance
```

### Join Task

When the barrier is met, a join task is dispatched with aggregated results in `payload.flow_results`:

```typescript
taskQueue.register('default', 'item.process.completed', {
    multiple: false,
    parallel: false,
    default_retries: 2,
    store_on_failure: true,

    async onTask(task, actions) {
        const results: FlowResults = task.payload.flow_results;
        // results.steps = [
        //   { step_index: 0, status: 'success', result: { thumbnails: [...] } },
        //   { step_index: 1, status: 'success', result: { video_url: '...' } },
        //   { step_index: 2, status: 'fail', error: 'Validation timeout' }
        // ]

        if (results.steps.every(s => s.status === 'success')) {
            actions.success(task, { merged: true });
        } else {
            actions.fail(task, 'Some steps failed');
        }
    }
});
```

### Failure Policies

| Policy | Behavior |
|--------|----------|
| `continue` (default) | Failed steps still decrement the barrier. Join receives mixed results. Join executor decides what to do. |
| `abort` | On first final failure, join is dispatched immediately with partial results and `aborted: true`. Remaining step completions become no-ops. |

### Timeout

When `timeout_ms` is set, a sentinel task is created that fires after the deadline. If the barrier hasn't been met by then, the join is dispatched with partial results and `timed_out: true`. If the barrier was already met, the timeout is a no-op.

### Barrier Provider

Flow barrier tracking requires an `IFlowBarrierProvider`. An `InMemoryFlowBarrierProvider` is included for testing. For production, implement a Redis-backed provider with atomic Lua scripts for deduplication (HSETNX) and batch decrement.

```typescript
import { IFlowBarrierProvider, BarrierDecrementResult, FlowStepResult } from '@supergrowthai/tq';

class RedisFlowBarrierProvider implements IFlowBarrierProvider {
    async initBarrier(flowId: string, totalSteps: number): Promise<void> { /* ... */ }
    async batchDecrementAndCheck(flowId: string, results: FlowStepResult[]): Promise<BarrierDecrementResult> { /* ... */ }
    async getStepResults(flowId: string): Promise<FlowStepResult[]> { /* ... */ }
    async markAborted(flowId: string): Promise<boolean> { /* ... */ }
    async isComplete(flowId: string): Promise<boolean> { /* ... */ }
}
```

`BarrierDecrementResult.remaining`: `0` = barrier met (dispatch join), `>0` = steps pending, `-1` = already complete/aborted (no-op).

### Wiring It Up

```typescript
import { InMemoryFlowBarrierProvider } from '@supergrowthai/tq';

const barrierProvider = new InMemoryFlowBarrierProvider(); // or your Redis impl

const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    databaseAdapter,
    cacheAdapter,
    asyncTaskManager,
    notificationProvider,
    {
        lifecycleProvider: myLifecycleProvider,
        workerProvider: myWorkerProvider,
        entityProjection: myProjectionProvider,
        flowBarrierProvider: barrierProvider,        // RFC-002: TaskHandler creates FlowMiddleware internally
        flowLifecycleProvider: myFlowLifecycleProvider,  // optional: flow lifecycle events
    }
);
```

TaskHandler assembles `FlowMiddleware` internally from the barrier provider — no need to construct it yourself. If `flowLifecycleProvider` is set without `flowBarrierProvider`, TaskHandler throws immediately (fail-fast).

### Entity Tracking on Flows

When `config.entity` is provided, the flow lifecycle is projected through the same entity projection system (RFC-003):

| Event | Projection Status |
|-------|-------------------|
| `startFlow()` called | `processing` (keyed on `flow_id`) |
| Join task succeeds | `executed` |
| Join task fails / abort / timeout | `failed` |

Individual step tasks do **not** carry `CronTask.entity` — entity tracking is at the flow level, avoiding N separate projection rows per step.

### Design Decisions

- **Flow metadata in `metadata.flow_meta`**: User payload is never polluted. Framework data lives in the `metadata` namespace alongside `log_context` (RFC-005).
- **Batch barrier operations**: Multiple steps from the same flow completing in one processing cycle are batched into a single barrier call.
- **HSETNX deduplication**: At-least-once MQ delivery means duplicate step completions are safely ignored via set-if-not-exists semantics.
- **FlowMiddleware returns data, doesn't write**: Returns `{ joinTasks, projections }` to `TaskHandler`, which owns all writes. Clean separation of concerns.
- **Nested flows**: A join executor can call `actions.startFlow()` to start another flow. Flow IDs are independent UUIDs — no special handling needed.
- **IMultiTaskExecutor optimization**: Flow steps of the same type in the same processing cycle batch into a single executor call automatically via `TaskRunner`'s existing grouping logic.

## API Reference — Lifecycle Interfaces

### ITaskLifecycleProvider

| Method | Context | Description |
|--------|---------|-------------|
| `onTaskScheduled?(ctx)` | `TaskContext` | Task added to queue |
| `onTaskStarted?(ctx)` | `TaskContext & { started_at, queued_duration_ms }` | Worker picks up task |
| `onTaskCompleted?(ctx)` | `TaskContext & { timing: TaskTiming, result? }` | Task succeeds |
| `onTaskFailed?(ctx)` | `TaskContext & { timing: TaskTiming, error, will_retry, next_attempt_at? }` | Task fails (before retry decision) |
| `onTaskExhausted?(ctx)` | `TaskContext & { timing: TaskTiming, error, total_attempts }` | All retries exhausted |
| `onTaskCancelled?(ctx)` | `TaskContext & { reason }` | Task manually cancelled |
| `onTaskBatchStarted?(ctx)` | `{ task_type, queue_id, tasks: TaskContext[], worker_id, consumer_id?, started_at }` | Batch executor starts |
| `onTaskBatchCompleted?(ctx)` | `{ task_type, queue_id, tasks, worker_id, consumer_id?, succeeded: string[], failed: string[], duration_ms }` | Batch executor finishes |

### IWorkerLifecycleProvider

| Method | Context | Description |
|--------|---------|-------------|
| `onWorkerStarted?(info)` | `WorkerInfo` | Worker process starts consuming |
| `onWorkerHeartbeat?(info)` | `WorkerInfo & { stats: WorkerStats, memory_usage_mb, active_consumers: ConsumerStats[] }` | Periodic health check |
| `onWorkerStopped?(info)` | `WorkerInfo & { reason, final_stats: WorkerStats }` | Worker shuts down |
| `onBatchStarted?(info)` | `WorkerInfo & { batch_size, task_types: string[] }` | Processing batch begins |
| `onBatchCompleted?(info)` | `WorkerInfo & { batch_size, succeeded, failed, duration_ms }` | Processing batch ends |
| `onConsumerStarted?(info)` | `ConsumerInfo` | First batch arrives on a consumer (lazy registration) |
| `onConsumerStopped?(info)` | `ConsumerInfo & { reason, stats: ConsumerStats }` | Consumer stops (shutdown) |

### IFlowLifecycleProvider

| Method | Context | Description |
|--------|---------|-------------|
| `onFlowStarted?(ctx)` | `FlowContext & { started_at, step_types: string[] }` | `actions.startFlow()` called |
| `onFlowCompleted?(ctx)` | `FlowContext & { duration_ms, steps_succeeded, steps_failed }` | All steps done, barrier met |
| `onFlowAborted?(ctx)` | `FlowContext & { duration_ms, steps_completed, trigger_step_index }` | Step failed with `abort` policy |
| `onFlowTimedOut?(ctx)` | `FlowContext & { duration_ms, steps_completed }` | Timeout sentinel fired before barrier met |

### IFlowBarrierProvider

| Method | Signature | Description |
|--------|-----------|-------------|
| `initBarrier` | `(flowId: string, totalSteps: number) => Promise<void>` | Initialize barrier for a new flow |
| `batchDecrementAndCheck` | `(flowId: string, results: FlowStepResult[]) => Promise<BarrierDecrementResult>` | Record step results, decrement barrier (HSETNX dedup) |
| `getStepResults` | `(flowId: string) => Promise<FlowStepResult[]>` | Get all recorded step results |
| `markAborted` | `(flowId: string) => Promise<boolean>` | Mark flow aborted (returns true on first call) |
| `isComplete` | `(flowId: string) => Promise<boolean>` | Check if barrier fully met |
| `getStartedAt` | `(flowId: string) => Promise<Date \| null>` | Get barrier init timestamp (for duration tracking) |

### TaskHandlerConfig

| Field | Type | Description |
|-------|------|-------------|
| `lifecycleProvider?` | `ITaskLifecycleProvider` | Task lifecycle event callbacks |
| `workerProvider?` | `IWorkerLifecycleProvider` | Worker/consumer lifecycle event callbacks |
| `lifecycle?` | `TaskHandlerLifecycleConfig` | Callback mode (`sync`/`async`), heartbeat interval, payload inclusion |
| `entityProjection?` | `IEntityProjectionProvider` | Entity-task projection provider (RFC-003) |
| `entityProjectionConfig?` | `EntityProjectionConfig` | Projection options (`includePayload`) |
| `flowBarrierProvider?` | `IFlowBarrierProvider` | Flow barrier provider — enables flow orchestration (RFC-002) |
| `flowLifecycleProvider?` | `IFlowLifecycleProvider` | Flow lifecycle events (requires `flowBarrierProvider`) |

### Supporting Types

| Type | Fields | Description |
|------|--------|-------------|
| `TaskContext` | `task_id, task_hash?, task_type, queue_id, payload, attempt, max_retries, scheduled_at, worker_id?, consumer_id?, log_context?` | Core task identity passed to all lifecycle callbacks |
| `TaskTiming` | `queued_duration_ms, processing_duration_ms, total_duration_ms` | Timing breakdown for completed/failed tasks |
| `WorkerInfo` | `worker_id, hostname, pid, started_at, enabled_queues` | Worker process identity |
| `WorkerStats` | `tasks_processed, tasks_succeeded, tasks_failed, avg_processing_ms, current_task?` | Aggregate worker metrics |
| `ConsumerInfo` | `consumer_id, queue_id, worker_id, started_at` | Consumer stream identity |
| `ConsumerStats` | `consumer_id, queue_id, tasks_processed, tasks_succeeded, tasks_failed, last_task_at?` | Per-consumer metrics |
| `FlowContext` | `flow_id, total_steps, join, failure_policy, entity?, worker_id, consumer_id?` | Flow identity for lifecycle events |
| `FlowStepResult` | `step_index, status, result?, error?` | Individual step outcome in barrier |
| `BarrierDecrementResult` | `remaining` | `0` = barrier met, `>0` = pending, `-1` = already complete/aborted |

## Error Handling and Retries

```typescript
const resilientExecutor: ISingleTaskNonParallel<ApiCallData> = {
    multiple: false,
    parallel: false,
    default_retries: 5,
    store_on_failure: true,

    async onTask(task, actions) {
        try {
            const response = await callExternalAPI(task.payload.endpoint, task.payload.data);

            if (response.status === 200) {
                actions.success(task, { status: response.status });
            } else {
                throw new Error(`API returned status: ${response.status}`);
            }
        } catch (error) {
            const currentRetries = task.retries || 0;
            console.error(`API call failed (attempt ${currentRetries + 1}/${this.default_retries}):`, error);

            if (currentRetries < this.default_retries) {
                // Create retry task with exponential backoff
                const retryDelay = Math.pow(2, currentRetries) * 1000; // 1s, 2s, 4s, 8s, 16s

                actions.addTasks([{
                    ...task,
                    retries: currentRetries + 1,
                    execute_at: new Date(Date.now() + retryDelay)
                }]);
            } else {
                actions.fail(task, error instanceof Error ? error : String(error), { attempt: currentRetries + 1 });
            }
        }
    }
};
```

## Task Result Persistence

Executors can persist structured results on task completion or failure via `ExecutorActions`:

```typescript
// Store result on success — saved to task.execution_result (256 KB limit)
actions.success(task, { outputUrl: 'https://cdn.example.com/result.pdf', pages: 42 });

// Store error details on failure — saved to task.execution_stats
actions.fail(task, new Error('Upstream timeout'), { endpoint: '/api/render', latencyMs: 30000 });
```

Results are stored by the `TaskRunner` and persisted via your `ITaskStorageAdapter`. Oversized results (>256 KB serialized) are silently dropped to protect storage.

### Executor-Level Partition Key

Executors can declare a `getPartitionKey` function to control Kinesis partition routing for ordering guarantees:

```typescript
taskQueue.register('order-queue', 'process-order', {
    multiple: false,
    parallel: false,
    default_retries: 3,
    store_on_failure: true,

    // All tasks for the same user land on the same Kinesis shard
    getPartitionKey: (task) => task.payload.user_id,

    async onTask(task, actions) {
        await processOrder(task.payload);
        actions.success(task, { orderId: task.payload.order_id });
    }
});
```

The returned value is set as `partition_key` on the message, overriding the default Kinesis partition routing.

## Working with Different Queue Providers

```typescript
import {MongoDBQueue, KinesisQueue, FileShardLockProvider} from '@supergrowthai/mq';
import {TaskQueuesManager, TaskHandler} from '@supergrowthai/tq';

// MongoDB Queue Setup
const mongoQueue = new MongoDBQueue(cacheAdapter, tasksAdapter);
const mongoTaskQueue = new TaskQueuesManager(mongoQueue);
const mongoTaskHandler = new TaskHandler(
    mongoQueue,
    mongoTaskQueue,
    databaseAdapter,
    cacheAdapter
);

// Kinesis Queue Setup
const shardLockProvider = new FileShardLockProvider();
const kinesisQueue = new KinesisQueue({
    shardLockProvider,
    instanceId: 'worker-1'
});
const kinesisTaskQueue = new TaskQueuesManager(kinesisQueue);
const kinesisTaskHandler = new TaskHandler(
    kinesisQueue,
    kinesisTaskQueue,
    databaseAdapter,
    cacheAdapter
);

// Register different executors on different queues
mongoTaskQueue.register('heavy-processing', 'compute', heavyProcessingExecutor);
kinesisTaskQueue.register('real-time', 'notification', notificationExecutor);
```

## Architecture Benefits

### No Global State

- All dependencies are injected via constructors
- No singletons or global variables
- Easy to test and mock

### Fail-Fast Design

- Required dependencies are enforced at compile time
- No optional parameters with defaults
- Clear error messages when dependencies are missing

### Clean Separation

- Queue management separate from task execution
- Pluggable storage and cache adapters
- Each component has a single responsibility

## TypeScript Support

Full TypeScript definitions with generic task types:

```typescript
import type {
    TaskExecutor, ExecutorActions, CronTask, AsyncTaskManagerOptions, ShutdownResult,
    IEntityProjectionProvider, EntityTaskProjection, EntityProjectionConfig,
    StartFlowInput, FlowResults, FlowMeta, IFlowBarrierProvider
} from '@supergrowthai/tq';

// Define your task data type
interface EmailTaskData {
    to: string;
    subject: string;
    body: string;
    attachments?: string[];
}

// Type-safe executor
const typedExecutor: ISingleTaskNonParallel<EmailTaskData> = {
    multiple: false,
    parallel: false,
    default_retries: 3,
    store_on_failure: true,

    async onTask(
        task: CronTask<EmailTaskData>,
        actions: ExecutorActions<EmailTaskData>
    ) {
        // task.payload is properly typed as EmailTaskData
        console.log(`Sending email to: ${task.payload.to}`);

        try {
            await sendEmail(task.payload);
            actions.success(task);
        } catch (error) {
            actions.fail(task, error instanceof Error ? error : String(error));
        }
    }
};
```

## Production Example

```typescript
import {
    TaskQueuesManager,
    TaskHandler,
    TaskStore,
    AsyncTaskManager,
    MongoDbAdapter,
    type TaskExecutor
} from '@supergrowthai/tq';
import {MongoDBQueue, BaseMessage} from '@supergrowthai/mq';
import {RedisCacheProvider} from 'memoose-js';
import {Collection, MongoClient} from 'mongodb';

// Production setup with all components
class ProductionMongoDBQueue extends MongoDBQueue {
    private mongoClient: MongoClient;

    constructor(cacheProvider: RedisCacheProvider, mongoClient: MongoClient) {
        super(cacheProvider);
        this.mongoClient = mongoClient;
    }

    get collection(): Promise<Collection<BaseMessage>> {
        return Promise.resolve(
            this.mongoClient.db('myapp').collection<BaseMessage>('messages')
        );
    }
}

const cacheProvider = new RedisCacheProvider('redis', {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
});

const mongoClient = new MongoClient(process.env.MONGODB_URI!);
await mongoClient.connect();

const messageQueue = new ProductionMongoDBQueue(cacheProvider, mongoClient);
const taskQueue = new TaskQueuesManager(messageQueue);
const asyncTaskManager = new AsyncTaskManager({ maxTasks: 10 }); // See AsyncTaskManagerOptions

const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    new MongoDbAdapter(mongoCollection), // ITaskStorageAdapter implementation
    cacheProvider,
    asyncTaskManager
);

// Register all your executors
taskQueue.register('email', 'send', emailExecutor);
taskQueue.register('notifications', 'push', pushNotificationExecutor);
taskQueue.register('reports', 'generate', reportGeneratorExecutor);

// Start processing
taskHandler.taskProcessServer();
```

## Best Practices

### 1. Task Idempotency

Ensure your tasks can be safely retried:

```typescript
const idempotentExecutor: ISingleTaskNonParallel<UserUpdateData> = {
    multiple: false,
    parallel: false,
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        try {
            // Check if already processed
            const user = await getUser(task.payload.userId);
            if (user.lastUpdated >= task.payload.timestamp) {
                console.log('Update already applied, skipping');
                actions.success(task);
                return;
            }

            await updateUser(task.payload.userId, task.payload.updates);
            actions.success(task);
        } catch (error) {
            actions.fail(task, error instanceof Error ? error : String(error));
        }
    }
};
```

### 2. Resource Management

Use parallel executors wisely to avoid overwhelming external services:

```typescript
const apiExecutor: ISingleTaskParallel<ApiTaskData> = {
    multiple: false,
    parallel: true,
    chunkSize: 3,  // Limit concurrent API calls
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        // Rate limiting logic here
        await rateLimiter.acquire();

        try {
            const result = await callAPI(task.payload);
            actions.success(task);
        } catch (error) {
            actions.fail(task, error instanceof Error ? error : String(error));
        } finally {
            rateLimiter.release();
        }
    }
};
```

## Database Adapters

### Built-in Adapters

The library provides two built-in storage adapters:

```typescript
import {MongoDbAdapter, InMemoryAdapter} from '@supergrowthai/tq';
import type {ITaskStorageAdapter} from '@supergrowthai/tq';

// MongoDB adapter for production use
const mongoAdapter = new MongoDbAdapter(mongoCollection);

// In-memory adapter for testing
const memoryAdapter = new InMemoryAdapter();
```

### PrismaAdapter Performance Optimization

The default `PrismaAdapter.addTasksToScheduled()` uses sequential creates for maximum database compatibility
(SQLite, CockroachDB, etc.). For high-throughput Postgres/MySQL deployments, override with batch operations:

```typescript
import {PrismaAdapter} from '@supergrowthai/tq';

class OptimizedPrismaAdapter extends PrismaAdapter {
    async addTasksToScheduled(tasks) {
        if (!tasks.length) return [];

        // Batch insert with duplicate handling (Postgres/MySQL only)
        await this.delegate.createMany({
            data: tasks.map(task => ({
                ...task,
                id: task.id || this.generateId(),
                status: task.status || 'scheduled',
                retries: task.retries || 0,
                created_at: task.created_at || new Date(),
                updated_at: new Date(),
                processing_started_at: task.processing_started_at || new Date()
            })),
            skipDuplicates: true
        });
        return tasks;
    }
}
```

**Note:** `createMany` with `skipDuplicates` is not supported on all databases (e.g., SQLite).
The default implementation ensures compatibility at the cost of O(n) database round-trips.

### Custom Storage Adapter

Implement the `ITaskStorageAdapter` interface for custom storage backends:

```typescript
import type {ITaskStorageAdapter, CronTask} from '@supergrowthai/tq';

class CustomStorageAdapter implements ITaskStorageAdapter {
    async addTasksToScheduled(tasks: CronTask[]): Promise<CronTask[]> {
        // Your implementation
    }

    async getMatureTasks(timestamp: number): Promise<CronTask[]> {
        // Your implementation
    }

    // ... other required methods
}
```

## Integration with @supergrowthai/mq

This library requires `@supergrowthai/mq` for message queue functionality. See
the [@supergrowthai/mq documentation](../mq/README.md) for details on configuring different queue providers and
adapters.

## License

MIT