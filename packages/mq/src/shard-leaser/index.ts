import IShardLockProvider from "../shard-lock-provider/IShardLockProvider.js";
import {QueueName} from "../types.js";

class ShardLeaser {
    private readonly client: IShardLockProvider;
    private readonly lockTTLMs: number;
    private readonly instanceId: string;
    private readonly streamId: QueueName;
    private heartbeatInterval: NodeJS.Timeout | null;

    constructor(
        client: IShardLockProvider,
        streamId: QueueName,
        instanceId: string,
        lockTTLMs: number = 30000
    ) {
        this.client = client;
        this.streamId = streamId;
        this.instanceId = instanceId;
        this.lockTTLMs = lockTTLMs;
        this.heartbeatInterval = null;
        this.startHeartbeat();
    }

    async getActiveInstances(): Promise<string[]> {
        return this.client.getActiveInstances(this.streamId);
    }

    async acquireLock(shardId: string): Promise<boolean> {
        return this.client.acquireLock(`${this.streamId}-${shardId}`, this.instanceId, this.lockTTLMs);
    }

    async renewLock(shardId: string): Promise<void> {
        await this.client.renewLock(`${this.streamId}-${shardId}`, this.lockTTLMs);
    }

    async getCheckpoint(shardId: string): Promise<string | null> {
        return this.client.getCheckpoint(`${this.streamId}-${shardId}`);
    }

    async setCheckpoint(shardId: string, sequenceNumber: string): Promise<void> {
        await this.client.setCheckpoint(`${this.streamId}-${shardId}`, sequenceNumber);
    }

    async releaseLock(shardId: string): Promise<void> {
        await this.client.releaseLock(`${this.streamId}-${shardId}`, this.instanceId);
    }

    // Cleanup method to stop heartbeat
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private startHeartbeat() {
        // Send initial heartbeat
        this.sendHeartbeat();

        // Then send heartbeat periodically
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.lockTTLMs / 2); // Send heartbeat twice as often as TTL
    }

    private async sendHeartbeat() {
        try {
            await this.client.sendHeartbeat(this.streamId, this.instanceId, this.lockTTLMs);
        } catch (error) {
            console.error('Failed to send heartbeat:', error);
        }
    }
}

export default ShardLeaser;
export {ShardLeaser};
