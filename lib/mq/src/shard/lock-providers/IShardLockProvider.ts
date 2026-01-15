import {QueueName} from "../../core/types.js";

/**
 * Interface for distributed shard lock providers.
 *
 * @description Provides distributed locking for Kinesis shard consumption.
 * Ensures only one consumer processes a shard at a time across multiple instances.
 *
 * @use-case Required for multi-server Kinesis deployments
 *
 * @implementations
 * - {@link RedisClusterShardLockProvider} - Production (recommended)
 * - {@link FileShardLockProvider} - Development/testing only
 *
 * @features
 * - Lock acquisition with TTL
 * - Lock renewal with ownership verification
 * - Checkpoint storage for recovery
 * - Instance heartbeat tracking
 */
export interface IShardLockProvider {
    acquireLock(key: string, value: string, lock: number): Promise<boolean>;

    setCheckpoint(shardId: string, sequenceNumber: string): Promise<void>;

    getCheckpoint(shardId: string): Promise<string | null>;

    /**
     * Renew lock for a shard, verifying ownership before extending TTL.
     * @param shardId - The shard ID to renew lock for
     * @param instanceId - The instance ID that must own the lock
     * @param lockTTLMs - The new TTL in milliseconds
     * @returns true if lock was renewed (owned by instanceId), false if lock lost
     */
    renewLock(shardId: string, instanceId: string, lockTTLMs: number): Promise<boolean>;

    releaseLock(key: string, instanceId: string): Promise<void>;

    // Pod heartbeat methods
    sendHeartbeat(streamId: QueueName, instanceId: string, ttlMs: number): Promise<void>;

    getActiveInstances(streamId: QueueName): Promise<string[]>;
}
