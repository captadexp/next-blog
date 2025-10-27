# @supergrowthai/mq

A message queue library with multiple provider backends (Kinesis, MongoDB, Memory, Immediate) and cache adapters for
distributed task processing.

## Features

- **Multiple Queue Providers**: Kinesis, MongoDB, In-Memory, and Immediate queues
- **Cache Adapter Pattern**: Pluggable cache providers for locking and coordination
- **TypeScript Support**: Full type definitions included
- **Graceful Shutdown**: Automatic cleanup on process termination
- **Environment Configuration**: Easy configuration based on environment variables

## Installation

```bash
npm install @supergrowthai/mq
```

## Basic Usage

### Using the Default Queue Factory

```typescript
import messageQueue from '@supergrowthai/mq';
import {CronTask} from '@supergrowthai/database/types.server';

// Add tasks to a queue
const tasks: CronTask<any>[] = [
    {
        type: 'email-send',
        data: {to: 'user@example.com', subject: 'Hello'},
        execute_at: new Date(),
        status: 'scheduled'
    }
];

await messageQueue.addTasks('email-queue', tasks);

// Process tasks from a queue
await messageQueue.consumeTasks('email-queue', async (queueId, tasks) => {
    console.log(`Processing ${tasks.length} tasks from ${queueId}`);

    return {
        successTasks: tasks, // Successfully processed tasks
        failedTasks: [],     // Failed tasks
        newTasks: []         // New tasks to queue
    };
});
```

### Custom Queue Configuration

```typescript
import {QueueFactory} from '@supergrowthai/mq';
import {MemoryCacheAdapter} from '@supergrowthai/mq/adapters';

// Create a custom message queue
const customQueue = QueueFactory.create({
    provider: 'mongodb',
    cacheAdapter: new MemoryCacheAdapter()
});

// Or with Kinesis
const kinesisQueue = QueueFactory.create({
    provider: 'kinesis',
    kinesis: {
        instanceId: 'my-worker-instance'
    }
});
```

## Queue Providers

### Memory Queue

Fast in-memory queue for development and testing:

```typescript
const memoryQueue = QueueFactory.create({
    provider: 'memory'
});
```

### MongoDB Queue

Persistent queue using MongoDB with distributed locking:

```typescript
import {MemooseCacheAdapter} from '@supergrowthai/mq/adapters';
import {RedisCacheProvider} from 'memoose-js';

const redisCache = new RedisCacheProvider('redis', {
    host: 'localhost',
    port: 6379
});

const mongoQueue = QueueFactory.create({
    provider: 'mongodb',
    cacheAdapter: new MemooseCacheAdapter(redisCache)
});
```

### Kinesis Queue

Distributed queue using AWS Kinesis for high throughput:

```typescript
const kinesisQueue = QueueFactory.create({
    provider: 'kinesis',
    kinesis: {
        instanceId: process.env.INSTANCE_ID || 'worker-1'
    }
});
```

### Immediate Queue

Executes tasks immediately without queueing:

```typescript
const immediateQueue = QueueFactory.create({
    provider: 'immediate'
});
```

## Cache Adapters

The library includes several cache adapters for distributed coordination:

### Memory Cache Adapter

Simple in-memory cache for single-instance deployments:

```typescript
import {MemoryCacheAdapter} from '@supergrowthai/mq/adapters';

const cacheAdapter = new MemoryCacheAdapter();
```

### Memoose Cache Adapter

Wrapper for memoose-js cache providers:

```typescript
import {MemooseCacheAdapter} from '@supergrowthai/mq/adapters';
import {RedisCacheProvider} from 'memoose-js';

const redisProvider = new RedisCacheProvider('redis', {
    host: 'localhost',
    port: 6379
});

const cacheAdapter = new MemooseCacheAdapter(redisProvider);
```

### Custom Cache Adapter

Implement your own cache adapter:

```typescript
import {ICacheAdapter} from '@supergrowthai/mq/adapters';

class CustomCacheAdapter implements ICacheAdapter {
    async get(key: string): Promise<string | null> {
        // Your implementation
        return null;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        // Your implementation
    }

    async del(key: string): Promise<boolean> {
        // Your implementation
        return false;
    }

    async exists(key: string): Promise<boolean> {
        // Your implementation
        return false;
    }
}
```

## Environment Configuration

The library automatically configures based on environment variables:

```bash
# Environment type (affects default provider selection)
ENV_TYPE=standalone|serverless|development

# Worker instance ID (for Kinesis)
INSTANCE_ID=worker-1

# Test mode
NODE_ENV=test
```

Default configurations:

- `standalone[redis-cfg]`: Kinesis queue with Redis cache
- `standalone`: Kinesis queue
- `serverless`: Kinesis queue
- `development`: Redis-based providers
- `test`: Memory queue

## Task Processing

### Processor Function

The processor function receives tasks and returns results:

```typescript
import {ProcessedTaskResult, Processor} from '@supergrowthai/mq/queues/IMessageQueue';

const processor: Processor = async (queueId: string, tasks: CronTask<any>[]) => {
    const result: ProcessedTaskResult = {
        successTasks: [],
        failedTasks: [],
        newTasks: []
    };

    for (const task of tasks) {
        try {
            // Process your task
            await processTask(task);
            result.successTasks.push(task);
        } catch (error) {
            console.error('Task processing failed:', error);
            result.failedTasks.push(task);
        }
    }

    return result;
};

// Use the processor
await messageQueue.consumeTasks('my-queue', processor);
```

### Batch Processing

Process a specific number of tasks:

```typescript
const result = await messageQueue.processBatch('my-queue', processor, 10);
console.log(`Processed ${result.successTasks.length} tasks successfully`);
```

## Error Handling and Retries

Failed tasks are automatically marked with incremented retry counts. You can implement custom retry logic:

```typescript
const processor: Processor = async (queueId, tasks) => {
    const result: ProcessedTaskResult = {successTasks: [], failedTasks: [], newTasks: []};

    for (const task of tasks) {
        try {
            await processTask(task);
            result.successTasks.push(task);
        } catch (error) {
            // Retry logic
            if (task.retries && task.retries < 3) {
                // Schedule retry
                const retryTask = {
                    ...task,
                    execute_at: new Date(Date.now() + 60000), // Retry in 1 minute
                    retries: (task.retries || 0) + 1
                };
                result.newTasks.push(retryTask);
            } else {
                result.failedTasks.push(task);
            }
        }
    }

    return result;
};
```

## Graceful Shutdown

The library automatically handles graceful shutdown:

```typescript
// Shutdown is automatically handled on process signals (SIGINT, SIGTERM, SIGQUIT)
// Or manually shutdown:
await messageQueue.shutdown();
```

## Advanced Usage

### Custom Lock Manager

For advanced distributed coordination:

```typescript
import {LockManager} from '@supergrowthai/mq/adapters';

const lockManager = new LockManager(cacheAdapter, {
    prefix: 'my-locks:',
    defaultTimeout: 300 // 5 minutes
});

const acquired = await lockManager.acquire('resource-key', 60);
if (acquired) {
    try {
        // Do work with locked resource
    } finally {
        await lockManager.release('resource-key');
    }
}
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import {
    QueueFactory,
    QueueConfig,
    IMessageQueue,
    ICacheAdapter
} from '@supergrowthai/mq';

const config: QueueConfig = {
    provider: 'mongodb',
    cacheAdapter: new MemoryCacheAdapter()
};

const queue: IMessageQueue = QueueFactory.create(config);
```

## License

MIT