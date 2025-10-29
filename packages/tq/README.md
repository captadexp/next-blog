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
import {TaskQueue, TaskHandler} from '@supergrowthai/tq';
import {InMemoryQueue, ITasksAdapter} from '@supergrowthai/mq';

// 1. Set up your adapters (see @supergrowthai/mq docs for details)
const tasksAdapter: ITasksAdapter = {
    // Your implementation
    findScheduledTasks: () => Promise.resolve([]),
    generateTaskId: () => `task-${Date.now()}`,
    insertTasks: () => Promise.resolve(),
    markTasksAsExecuted: () => Promise.resolve(),
    markTasksAsFailed: () => Promise.resolve(),
    markTasksAsProcessing: () => Promise.resolve()
};

const databaseAdapter = /* your database adapter */;
const cacheAdapter = /* your cache adapter */;

// 2. Create instances with dependency injection
const messageQueue = new InMemoryQueue(tasksAdapter);
const taskQueue = new TaskQueue(messageQueue);
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

### TaskQueue

Manages task executor registration and retrieval:

```typescript
import {TaskQueue} from '@supergrowthai/tq';
import {IMessageQueue} from '@supergrowthai/mq';

const taskQueue = new TaskQueue(messageQueue);

// Register executors
taskQueue.register('queue-name', 'task-type', executor);

// Get executor
const executor = taskQueue.getExecutor('queue-name', 'task-type');

// Get queue information
const queues = taskQueue.getQueues();
const taskTypes = taskQueue.getTasksForQueue('queue-name');
```

### TaskHandler

Manages task processing, retries, and queue consumption:

```typescript
import {TaskHandler} from '@supergrowthai/tq';

const taskHandler = new TaskHandler(
    messageQueue,      // IMessageQueue
    taskQueue,         // TaskQueue
    databaseAdapter,   // IDatabaseAdapter
    cacheAdapter,      // BaseCacheProvider<any>
    asyncTaskManager   // IAsyncTaskManager (optional)
);

// Start processing all registered queues
taskHandler.taskProcessServer();

// Or process specific queues
taskHandler.startConsumingTasks('email-queue');

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
const asyncTaskManager = new AsyncTaskManager(maxConcurrent
:
5
)
;

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
import {TaskQueue, TaskHandler} from '@supergrowthai/tq';

// MongoDB Queue Setup
const mongoQueue = new MongoDBQueue(cacheAdapter, tasksAdapter);
const mongoTaskQueue = new TaskQueue(mongoQueue);
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
const kinesisTaskQueue = new TaskQueue(kinesisQueue);
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
import {TaskExecutor, ExecutorActions, CronTask} from '@supergrowthai/tq';

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
    TaskQueue,
    TaskHandler,
    TaskStore,
    AsyncTaskManager
} from '@supergrowthai/tq';
import {MongoDBQueue, ITasksAdapter} from '@supergrowthai/mq';
import {RedisCacheProvider} from 'memoose-js';

// Production setup with all components
class ProductionTasksAdapter implements ITasksAdapter {
    // Your database implementation
}

const cacheProvider = new RedisCacheProvider('redis', {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
});

const messageQueue = new MongoDBQueue(cacheProvider, new ProductionTasksAdapter());
const taskQueue = new TaskQueue(messageQueue);
const asyncTaskManager = new AsyncTaskManager(10); // 10 concurrent async tasks

const taskHandler = new TaskHandler(
    messageQueue,
    taskQueue,
    new MongoDbAdapter(), // Your database adapter
    cacheProvider,
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

## Integration with @supergrowthai/mq

This library requires `@supergrowthai/mq` for message queue functionality. See
the [@supergrowthai/mq documentation](../mq/README.md) for details on configuring different queue providers and
adapters.

## License

MIT