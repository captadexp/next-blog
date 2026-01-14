/**
 * Message Queue Lifecycle Types
 * Provides interfaces for queue and consumer lifecycle callbacks
 */

// ============ Queue Types ============

export interface QueueInfo {
    /** Queue identifier */
    queue_id: string;
    /** Queue implementation type */
    provider: 'kinesis' | 'mongodb' | 'memory' | 'file' | 'immediate' | 'prisma';
}

// ============ Consumer Types (Unified Model) ============

export interface ConsumerInfo {
    /** Unique consumer identifier */
    consumer_id: string;
    /** Consumer type: 'worker' for main consumer, 'shard' for Kinesis shards */
    consumer_type: 'worker' | 'shard';
    /** Queue being consumed */
    queue_id: string;
    /** Shard ID (present when consumer_type is 'shard') */
    shard_id?: string;
    /** Parent consumer ID (links shard to owning worker) */
    parent_consumer_id?: string;
}

export interface CheckpointInfo {
    /** Queue identifier */
    queue_id: string;
    /** Consumer that checkpointed */
    consumer_id: string;
    /** Shard ID (for sharded queues) */
    shard_id?: string;
    /** Checkpoint value (sequence number for Kinesis, offset for others) */
    checkpoint: string;
    /** Records processed since last checkpoint */
    records_since_last: number;
}

// ============ Lifecycle Provider ============

export interface IQueueLifecycleProvider {
    /** Called when a message is published to the queue */
    onMessagePublished?(info: QueueInfo & {
        message_type: string;
        message_id?: string;
        size_bytes?: number;
    }): void | Promise<void>;

    /** Called when a message is consumed from the queue */
    onMessageConsumed?(info: QueueInfo & {
        message_type: string;
        message_id?: string;
        /** How long message was in queue (ms) */
        age_ms: number;
    }): void | Promise<void>;

    /** Called when a consumer connects (worker or shard) */
    onConsumerConnected?(info: ConsumerInfo): void | Promise<void>;

    /** Called when a consumer disconnects (worker or shard) */
    onConsumerDisconnected?(info: ConsumerInfo & {
        reason: 'shutdown' | 'error' | 'rebalance' | 'idle_timeout';
    }): void | Promise<void>;

    /** Called after checkpointing (primarily for Kinesis, but generic) */
    onConsumerCheckpoint?(info: CheckpointInfo): void | Promise<void>;
}

// ============ Configuration Types ============

export interface QueueLifecycleConfig {
    /** Lifecycle event provider */
    lifecycleProvider?: IQueueLifecycleProvider;
    /** Callback execution mode */
    mode?: 'sync' | 'async';
}
