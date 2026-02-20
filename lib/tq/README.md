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
            actions.success(task);
        } catch (error) {
            console.error('Failed to send email:', error);
            actions.fail(task);
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

Handles task execution with locking and async support:

```typescript
import {TaskRunner} from '@supergrowthai/tq';

const taskRunner = new TaskRunner(
    messageQueue,
    taskQueue,
    taskStore,
    cacheProvider
);

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
            actions.fail(task);
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
            actions.success(task);
        } catch (error) {
            console.error('Image processing failed:', error);
            actions.fail(task);
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
                actions.fail(task);

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

// Set up async task manager
const asyncTaskManager = new AsyncTaskManager(5);  // maxTasks parameter

// Graceful shutdown with AbortSignal
const abortController = new AbortController();
await asyncTaskManager.shutdown(abortController.signal);

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
            actions.success(task);
        } catch (error) {
            actions.fail(task);
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

    onWorkerStopped(info: WorkerInfo & { reason: string; final_stats: WorkerStats }) {
        console.log(`Worker stopped: ${info.worker_id}, reason: ${info.reason}`);
    },

    onBatchStarted(info: WorkerInfo & { batch_size: number; task_types: string[] }) {
        console.log(`Batch started: ${info.batch_size} tasks`);
    },

    onBatchCompleted(info: WorkerInfo & { batch_size: number; succeeded: number; failed: number }) {
        console.log(`Batch completed: ${info.succeeded}/${info.batch_size} succeeded`);
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

### WorkerInfo Properties

| Property       | Type     | Description              |
|----------------|----------|--------------------------|
| worker_id      | string   | Unique worker identifier |
| hostname       | string   | Machine hostname         |
| pid            | number   | Process ID               |
| started_at     | Date     | When worker started      |
| enabled_queues | string[] | Queues being processed   |

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
                actions.success(task);
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
                actions.fail(task);
            }
        }
    }
};
```

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
import type {TaskExecutor, ExecutorActions, CronTask} from '@supergrowthai/tq';

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
            actions.fail(task);
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
const asyncTaskManager = new AsyncTaskManager(10); // maxTasks: 10 concurrent async tasks

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
            actions.fail(task);
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
            actions.fail(task);
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