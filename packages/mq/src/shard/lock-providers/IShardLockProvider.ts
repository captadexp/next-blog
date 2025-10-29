import {QueueName} from "../../core/types.js";

export interface IShardLockProvider {
    acquireLock(key: string, value: any, lock: number): Promise<boolean>;

    setCheckpoint(shardId: string, sequenceNumber: string): Promise<void>;

    getCheckpoint(shardId: string): Promise<string | null>;

    renewLock(shardId: string, lockTTLMs: number): Promise<void>;

    releaseLock(key: string, instanceId: string): Promise<void>;

    // Pod heartbeat methods
    sendHeartbeat(streamId: QueueName, instanceId: string, ttlMs: number): Promise<void>;

    getActiveInstances(streamId: QueueName): Promise<string[]>;
}
