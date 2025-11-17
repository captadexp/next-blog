# @supergrowthai/mq

A lightweight, dependency-injection based message queue library with multiple provider backends for distributed task
processing.

## Features

- **Clean Architecture**: Constructor-based dependency injection with no global state
- **Multiple Queue Providers**: Kinesis, MongoDB, In-Memory, and Immediate queues
- **Pluggable Lock Providers**: Multiple shard lock providers for distributed coordination
- **TypeScript Support**: Full type definitions included
- **Named Exports**: Tree-shakable, explicit imports
- **Fail-Fast Design**: Required dependencies enforce proper configuration

## Installation

```bash
npm install @supergrowthai/mq
```

## Quick Start

```typescript
import {InMemoryQueue, BaseMessage} from '@supergrowthai/mq';

// 1. Create message queue instance
const messageQueue = new InMemoryQueue();

// 2. Register queues
messageQueue.register('email-queue');

// 3. Add messages
await messageQueue.addMessages('email-queue', [
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

// 4. Process messages
await messageQueue.consumeMessagesStream('email-queue', async (queueId, messages) => {
    console.log(`Processing ${messages.length} messages from ${queueId}`);

    // Process your messages here
    for (const message of messages) {
        try {
            // Your message processing logic
            console.log(`Processing message: ${message.type}`);
            // Do something with message.payload
        } catch (error) {
            console.error('Message processing failed:', error);
        }
    }
});

// Optional: Process with AbortSignal for graceful shutdown
const abortController = new AbortController();
await messageQueue.consumeMessagesStream('email-queue', processor, abortController.signal);
```

## Queue Implementations

### InMemoryQueue

Fast in-memory queue for development and testing:

```typescript
import {InMemoryQueue} from '@supergrowthai/mq';

const messageQueue = new InMemoryQueue();
```

### ImmediateQueue

Executes tasks immediately without queueing:

```typescript
import {ImmediateQueue} from '@supergrowthai/mq';

const messageQueue = new ImmediateQueue();
```

### MongoDBQueue

Persistent queue using MongoDB with distributed locking:

```typescript
import {MongoDBQueue} from '@supergrowthai/mq';
import {CacheProvider} from 'memoose-js';
import {Collection} from 'mongodb';

// Extend MongoDBQueue to provide your own collection
class MyMongoDBQueue extends MongoDBQueue {
    constructor(cacheAdapter: CacheProvider<string>) {
        super(cacheAdapter);
    }

    get collection() {
        // Return your MongoDB collection
        return Promise.resolve(/* your collection */);
    }
}

const cacheAdapter: CacheProvider<string> = /* your cache implementation */;
const messageQueue = new MyMongoDBQueue(cacheAdapter);
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

### MongoRedisShardLockProvider

Combined MongoDB and Redis-based locking for distributed deployments:

```typescript
import {MongoRedisShardLockProvider} from '@supergrowthai/mq';

const shardLockProvider = new MongoRedisShardLockProvider(
    mongoCollection,  // MongoDB collection for checkpoints
    redisClient      // Redis client for distributed locks
);
```

### RedisClusterShardLockProvider

Redis cluster-based locking for high-availability deployments:

```typescript
import {RedisClusterShardLockProvider} from '@supergrowthai/mq';

const shardLockProvider = new RedisClusterShardLockProvider(
    redisClusterClient  // Redis cluster client
);
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

## Message Processing

### Message Consumer Function

The message consumer function receives messages and processes them:

```typescript
import {MessageConsumer} from '@supergrowthai/mq';

const processor: MessageConsumer<any, any> = async (queueId: string, messages) => {
    for (const message of messages) {
        try {
            // Process your message
            await processMessage(message);
            console.log(`Processed message: ${message.type}`);
        } catch (error) {
            console.error('Message processing failed:', error);
        }
    }
};

// Use the processor
await messageQueue.consumeMessagesStream('my-queue', processor);

// With AbortSignal for cancellation
const abortController = new AbortController();
await messageQueue.consumeMessagesStream('my-queue', processor, abortController.signal);
```

### Batch Processing

Process a specific number of messages:

```typescript
await messageQueue.consumeMessagesBatch('my-queue', processor, 10);
console.log('Processed batch of messages successfully');
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
import {MongoDBQueue, BaseMessage} from '@supergrowthai/mq';
import {RedisCacheProvider} from 'memoose-js';
import {Collection, MongoClient} from 'mongodb';

// Extend MongoDBQueue for production use
class ProductionMongoDBQueue extends MongoDBQueue {
    private mongoClient: MongoClient;
    private dbName: string;

    constructor(cacheProvider: RedisCacheProvider, mongoClient: MongoClient, dbName: string) {
        super(cacheProvider);
        this.mongoClient = mongoClient;
        this.dbName = dbName;
    }

    get collection(): Promise<Collection<BaseMessage>> {
        return Promise.resolve(
            this.mongoClient.db(this.dbName).collection<BaseMessage>('messages')
        );
    }
}

// Cache provider for distributed locking
const cacheProvider = new RedisCacheProvider('redis', {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
});

// MongoDB client
const mongoClient = new MongoClient(process.env.MONGODB_URI!);
await mongoClient.connect();

// Create queue with all dependencies
const messageQueue = new ProductionMongoDBQueue(
    cacheProvider,
    mongoClient,
    'myapp'
);

// Register your queues
messageQueue.register('email-queue');
messageQueue.register('image-processing-queue');

// Start processing
await messageQueue.consumeMessagesStream('email-queue', emailProcessor);
await messageQueue.consumeMessagesStream('image-processing-queue', imageProcessor);
```

## Queue Notifications

Implement queue event notifications for monitoring and logging:

```typescript
import {QueueNotifier, QueueStats, ErrorContext} from '@supergrowthai/mq';

const notifier: QueueNotifier = {
    async onShutdown(instanceId: string, stats: QueueStats) {
        console.log(`Queue ${stats.queueName} shutting down`);
        console.log(`Processed: ${stats.messagesProcessed}, Produced: ${stats.messagesProduced}`);
    },

    async onError(error: Error, context: ErrorContext) {
        console.error(`Error in ${context.operation}:`, error);
        // Send to monitoring service
    }
};

// Pass notifier when creating queue instances
const messageQueue = new KinesisQueue({
    shardLockProvider,
    instanceId: 'worker-1',
    notifier
});
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import {
    IMessageQueue,
    BaseMessage,
    MessageConsumer,
    IShardLockProvider,
    QueueName,
    QueueNotifier
} from '@supergrowthai/mq';

// All interfaces are fully typed for excellent IDE support
```

## License

MIT