# @supergrowthai/mq

A lightweight, dependency-injection based message queue library with multiple provider backends for distributed task
processing.

## Features

- **Clean Architecture**: Constructor-based dependency injection with no global state
- **Multiple Queue Providers**: Kinesis, MongoDB, In-Memory, and Immediate queues
- **Pluggable Adapters**: Tasks adapters for different storage backends
- **TypeScript Support**: Full type definitions included
- **Named Exports**: Tree-shakable, explicit imports
- **Fail-Fast Design**: Required dependencies enforce proper configuration

## Installation

```bash
npm install @supergrowthai/mq
```

## Quick Start

```typescript
import {InMemoryQueue, ITasksAdapter, BaseTask} from '@supergrowthai/mq';

// 1. Create a tasks adapter
const tasksAdapter: ITasksAdapter = {
    findScheduledTasks(queueId: string, limit: number): Promise<BaseTask[]> {
        return Promise.resolve([]);
    },
    generateTaskId(): string {
        return `task-${Date.now()}`;
    },
    insertTasks(tasks: BaseTask[]): Promise<void> {
        return Promise.resolve();
    },
    markTasksAsExecuted(taskIds: string[]): Promise<void> {
        return Promise.resolve();
    },
    markTasksAsFailed(taskIds: string[]): Promise<void> {
        return Promise.resolve();
    },
    markTasksAsProcessing(taskIds: string[]): Promise<void> {
        return Promise.resolve();
    }
};

// 2. Create message queue instance
const messageQueue = new InMemoryQueue(tasksAdapter);

// 3. Register queues
messageQueue.register('email-queue');

// 4. Add tasks
await messageQueue.addTasks('email-queue', [
    {
        _id: 'task-1',
        type: 'send-email',
        payload: {to: 'user@example.com', subject: 'Hello'},
        execute_at: new Date(),
        status: 'scheduled',
        retries: 0,
        created_at: new Date(),
        updated_at: new Date(),
        queue_id: 'email-queue',
        processing_started_at: new Date()
    }
]);

// 5. Process tasks
await messageQueue.consumeTasks('email-queue', async (queueId, tasks) => {
    console.log(`Processing ${tasks.length} tasks from ${queueId}`);

    // Process your tasks here
    const processedTasks = await Promise.all(
        tasks.map(async task => {
            try {
                // Your task processing logic
                console.log(`Processing task: ${task.type}`);
                return task;
            } catch (error) {
                throw error; // Will be handled as failed task
            }
        })
    );

    return {
        successTasks: processedTasks,
        failedTasks: [],
        newTasks: []
    };
});
```

## Queue Implementations

### InMemoryQueue

Fast in-memory queue for development and testing:

```typescript
import {InMemoryQueue, ITasksAdapter} from '@supergrowthai/mq';

const messageQueue = new InMemoryQueue(tasksAdapter);
```

### ImmediateQueue

Executes tasks immediately without queueing:

```typescript
import {ImmediateQueue, ITasksAdapter} from '@supergrowthai/mq';

const messageQueue = new ImmediateQueue(tasksAdapter);
```

### MongoDBQueue

Persistent queue using MongoDB with distributed locking:

```typescript
import {MongoDBQueue, ITasksAdapter} from '@supergrowthai/mq';
import {BaseCacheProvider} from 'memoose-js';

// You need to provide a cache adapter for locking
const cacheAdapter: BaseCacheProvider<any> = /* your cache implementation */;

const messageQueue = new MongoDBQueue(cacheAdapter, tasksAdapter);
```

### KinesisQueue

Distributed queue using AWS Kinesis for high throughput:

```typescript
import {KinesisQueue, IShardLockProvider, FileShardLockProvider} from '@supergrowthai/mq';

// Create shard lock provider
const shardLockProvider: IShardLockProvider = new FileShardLockProvider();

// Create Kinesis queue
const messageQueue = new KinesisQueue({
    shardLockProvider,
    instanceId: process.env.INSTANCE_ID || 'worker-1'
});
```

## Shard Lock Providers

For Kinesis queues, you need to provide a shard lock provider:

### FileShardLockProvider

File-based locking for single-machine deployments:

```typescript
import {FileShardLockProvider} from '@supergrowthai/mq';

const shardLockProvider = new FileShardLockProvider('/tmp/kinesis-locks');
```

### Custom Shard Lock Provider

Implement your own shard lock provider:

```typescript
import {IShardLockProvider} from '@supergrowthai/mq';

class CustomShardLockProvider implements IShardLockProvider {
    async acquireLock(key: string, value: any, lockTTLMs: number): Promise<boolean> {
        // Your implementation
        return true;
    }

    async setCheckpoint(shardId: string, sequenceNumber: string): Promise<void> {
        // Your implementation
    }

    async getCheckpoint(shardId: string): Promise<string | null> {
        // Your implementation
        return null;
    }

    async renewLock(shardId: string, lockTTLMs: number): Promise<void> {
        // Your implementation
    }

    async releaseLock(key: string, instanceId: string): Promise<void> {
        // Your implementation
    }

    async sendHeartbeat(streamId: string, instanceId: string, ttlMs: number): Promise<void> {
        // Your implementation
    }

    async getActiveInstances(streamId: string): Promise<string[]> {
        // Your implementation
        return [];
    }
}
```

## Tasks Adapter

The `ITasksAdapter` interface defines how tasks are stored and retrieved:

```typescript
import {ITasksAdapter, BaseTask} from '@supergrowthai/mq';

class DatabaseTasksAdapter implements ITasksAdapter {
    async findScheduledTasks(queueId: string, limit: number): Promise<BaseTask[]> {
        // Query your database for scheduled tasks
        return [];
    }

    generateTaskId(): string {
        // Generate unique task IDs
        return `task-${Date.now()}-${Math.random()}`;
    }

    async insertTasks(tasks: BaseTask[]): Promise<void> {
        // Insert tasks into your database
    }

    async markTasksAsExecuted(taskIds: string[]): Promise<void> {
        // Mark tasks as completed in your database
    }

    async markTasksAsFailed(taskIds: string[]): Promise<void> {
        // Mark tasks as failed in your database
    }

    async markTasksAsProcessing(taskIds: string[]): Promise<void> {
        // Mark tasks as currently being processed
    }
}
```

## Task Processing

### Processor Function

The processor function receives tasks and returns results:

```typescript
import {Processor, ProcessedTaskResult} from '@supergrowthai/mq';

const processor: Processor = async (queueId: string, tasks) => {
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

- Queue implementations are separate from storage adapters
- Lock providers are pluggable
- Each component has a single responsibility

## Example: Production Setup

```typescript
import {
    MongoDBQueue,
    ITasksAdapter,
    BaseTask
} from '@supergrowthai/mq';
import {RedisCacheProvider} from 'memoose-js';

// Your database tasks adapter
class MongoTasksAdapter implements ITasksAdapter {
    // Implementation for your MongoDB collections
}

// Cache provider for distributed locking
const cacheProvider = new RedisCacheProvider('redis', {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
});

// Create queue with all dependencies
const messageQueue = new MongoDBQueue(
    cacheProvider,
    new MongoTasksAdapter()
);

// Register your queues
messageQueue.register('email-queue');
messageQueue.register('image-processing-queue');

// Start processing
await messageQueue.consumeTasks('email-queue', emailProcessor);
await messageQueue.consumeTasks('image-processing-queue', imageProcessor);
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import {
    IMessageQueue,
    ITasksAdapter,
    BaseTask,
    ProcessedTaskResult,
    Processor
} from '@supergrowthai/mq';

// All interfaces are fully typed for excellent IDE support
```

## License

MIT