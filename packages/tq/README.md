# @supergrowthai/tq

A task queue management library with multiple executor types and async task handling. Built on top of @supergrowthai/mq
for flexible message queue backends.

## Features

- **Multiple Executor Types**: Single task (parallel/non-parallel) and multi-task executors
- **Async Task Management**: Handle long-running tasks with configurable timeouts
- **Type-Safe**: Full TypeScript support with generic task types
- **Queue Integration**: Works with any message queue backend via @supergrowthai/mq
- **Flexible Registration**: Register task executors for different queue types

## Installation

```bash
npm install @supergrowthai/tq @supergrowthai/mq
```

## Basic Usage

### Setting Up Task Executors

```typescript
import taskQueue from '@supergrowthai/tq';
import messageQueue from '@supergrowthai/mq';
import {ISingleTaskNonParallel} from '@supergrowthai/tq/core/base/interfaces';

// Define a simple task executor
const emailExecutor: ISingleTaskNonParallel<EmailTaskData> = {
    multiple: false,
    parallel: false,
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        try {
            await sendEmail(task.data.to, task.data.subject, task.data.body);
            actions.success(task);
        } catch (error) {
            console.error('Failed to send email:', error);
            actions.fail(task);
        }
    }
};

// Register the executor
taskQueue.register(
    messageQueue,     // Message queue instance
    'email-queue',    // Queue name
    'send-email',     // Task type
    emailExecutor     // Executor implementation
);
```

### Task Types and Interfaces

#### Single Task Non-Parallel Executor

For tasks that should be processed one at a time:

```typescript
import {ISingleTaskNonParallel} from '@supergrowthai/tq/core/base/interfaces';

const reportExecutor: ISingleTaskNonParallel<ReportData> = {
    multiple: false,
    parallel: false,
    default_retries: 2,
    store_on_failure: true,

    async onTask(task, actions) {
        console.log(`Generating report: ${task.data.reportId}`);

        try {
            const report = await generateReport(task.data);
            actions.success(task);
        } catch (error) {
            actions.fail(task);
        }
    }
};
```

#### Single Task Parallel Executor

For tasks that can be processed in parallel batches:

```typescript
import {ISingleTaskParallel} from '@supergrowthai/tq/core/base/interfaces';

const imageProcessorExecutor: ISingleTaskParallel<ImageData> = {
    multiple: false,
    parallel: true,
    chunkSize: 5,           // Process 5 images at a time
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        try {
            await processImage(task.data.imageUrl, task.data.filters);
            actions.success(task);
        } catch (error) {
            console.error('Image processing failed:', error);
            actions.fail(task);
        }
    }
};
```

#### Multi-Task Executor

For processing multiple tasks together as a batch:

```typescript
import {IMultiTaskExecutor} from '@supergrowthai/tq/core/base/interfaces';

const batchProcessorExecutor: IMultiTaskExecutor<BatchData> = {
    multiple: true,
    default_retries: 2,
    store_on_failure: true,

    async onTasks(tasks, actions) {
        console.log(`Processing batch of ${tasks.length} tasks`);

        for (const task of tasks) {
            try {
                await processBatchItem(task.data);
                actions.success(task);
            } catch (error) {
                console.error('Batch item failed:', error);
                actions.fail(task);

                // Optionally add retry tasks
                if (task.retries < 3) {
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
```

### Async Task Management

For long-running tasks that might exceed normal timeouts:

```typescript
const heavyProcessingExecutor: ISingleTaskNonParallel<ProcessingData> = {
    multiple: false,
    parallel: false,
    default_retries: 1,
    store_on_failure: true,

    // Configure async handoff for tasks taking longer than 30 seconds
    asyncConfig: {
        handoffTimeout: 30000,        // 30 seconds
        maxConcurrentAsync: 2         // Max 2 concurrent heavy tasks
    },

    async onTask(task, actions) {
        try {
            // This might take a very long time
            const result = await performHeavyComputation(task.data);
            actions.success(task);
        } catch (error) {
            actions.fail(task);
        }
    }
};
```

## Advanced Usage

### Task Queue Management

```typescript
import {TaskQueue} from '@supergrowthai/tq';

// Create a custom task queue instance
const customTaskQueue = new TaskQueue();

// Get information about registered queues
const queues = taskQueue.getQueues();
console.log('Registered queues:', queues);

// Get task types for a specific queue
const taskTypes = taskQueue.getTasksForQueue('email-queue');
console.log('Email queue task types:', taskTypes);

// Get a specific executor
const executor = taskQueue.getExecutor('email-queue', 'send-email');
if (executor) {
    console.log('Found email executor');
}
```

### Error Handling and Retries

```typescript
const resilientExecutor: ISingleTaskNonParallel<ApiCallData> = {
    multiple: false,
    parallel: false,
    default_retries: 5,
    store_on_failure: true,

    async onTask(task, actions) {
        const maxRetries = task.retries || this.default_retries;

        try {
            const response = await callExternalAPI(task.data.endpoint, task.data.payload);

            if (response.status === 200) {
                actions.success(task);
            } else {
                throw new Error(`API returned status: ${response.status}`);
            }
        } catch (error) {
            console.error(`API call failed (attempt ${task.retries || 0 + 1}/${maxRetries}):`, error);

            if ((task.retries || 0) < maxRetries) {
                // Create retry task with exponential backoff
                const retryDelay = Math.pow(2, task.retries || 0) * 1000; // 1s, 2s, 4s, 8s, 16s

                actions.addTasks([{
                    ...task,
                    retries: (task.retries || 0) + 1,
                    execute_at: new Date(Date.now() + retryDelay)
                }]);
            } else {
                actions.fail(task);
            }
        }
    }
};
```

### Working with Different Message Queue Providers

```typescript
import {QueueFactory} from '@supergrowthai/mq';
import {MemoryCacheAdapter} from '@supergrowthai/mq/adapters';

// Use with MongoDB queue
const mongoQueue = QueueFactory.create({
    provider: 'mongodb',
    cacheAdapter: new MemoryCacheAdapter()
});

taskQueue.register(mongoQueue, 'heavy-processing', 'compute', heavyProcessingExecutor);

// Use with Kinesis queue
const kinesisQueue = QueueFactory.create({
    provider: 'kinesis',
    kinesis: {instanceId: 'worker-1'}
});

taskQueue.register(kinesisQueue, 'real-time', 'notification', notificationExecutor);
```

## TypeScript Support

The library provides full TypeScript support with generic task types:

```typescript
import {TaskExecutor, ExecutorActions} from '@supergrowthai/tq/core/base/interfaces';
import {CronTask} from '@supergrowthai/database/types.server';
import {WithId} from 'mongodb';

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
        task: WithId<CronTask<EmailTaskData>>,
        actions: ExecutorActions<EmailTaskData>
    ) {
        // task.data is properly typed as EmailTaskData
        console.log(`Sending email to: ${task.data.to}`);

        try {
            await sendEmail(task.data);
            actions.success(task);
        } catch (error) {
            actions.fail(task);
        }
    }
};
```

## Environment Integration

Task queue automatically handles environment-specific queue naming:

```typescript
// Queue names are automatically prefixed based on environment
// Development: 'dev-email-queue'
// Production: 'prod-email-queue'
// Test: 'test-email-queue'

taskQueue.register(messageQueue, 'email-queue', 'send', emailExecutor);
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
            const user = await getUser(task.data.userId);
            if (user.lastUpdated >= task.data.timestamp) {
                console.log('Update already applied, skipping');
                actions.success(task);
                return;
            }

            await updateUser(task.data.userId, task.data.updates);
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
            const result = await callAPI(task.data);
            actions.success(task);
        } catch (error) {
            actions.fail(task);
        } finally {
            rateLimiter.release();
        }
    }
};
```

### 3. Monitoring and Observability

Add logging and metrics to your executors:

```typescript
const monitoredExecutor: ISingleTaskNonParallel<TaskData> = {
    multiple: false,
    parallel: false,
    default_retries: 3,
    store_on_failure: true,

    async onTask(task, actions) {
        const startTime = Date.now();
        const taskId = task._id.toString();

        console.log(`Starting task ${taskId} of type ${task.type}`);

        try {
            await processTask(task.data);

            const duration = Date.now() - startTime;
            console.log(`Task ${taskId} completed in ${duration}ms`);

            // Send metrics to your monitoring system
            metrics.histogram('task.duration', duration, {type: task.type, status: 'success'});

            actions.success(task);
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`Task ${taskId} failed after ${duration}ms:`, error);

            metrics.histogram('task.duration', duration, {type: task.type, status: 'failure'});
            metrics.increment('task.failures', {type: task.type});

            actions.fail(task);
        }
    }
};
```

## Integration with @supergrowthai/mq

This library requires @supergrowthai/mq for message queue functionality. See
the [@supergrowthai/mq documentation](../mq/README.md) for details on configuring different queue providers and cache
adapters.

## License

MIT