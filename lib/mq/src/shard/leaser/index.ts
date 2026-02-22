import {IShardLockProvider} from "../lock-providers/IShardLockProvider.js";
import {QueueName} from "../../core/types.js";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('ShardLeaser', LogLevel.INFO);

export interface ShardLeaserConfig {
    onHeartbeatFailure?: (streamId: QueueName, instanceId: string, consecutiveFailures: number) => void;
}

export class ShardLeaser {
    private readonly client: IShardLockProvider;
    private readonly lockTTLMs: number;
    private readonly instanceId: string;
    private readonly streamId: QueueName;
    private heartbeatInterval: NodeJS.Timeout | null;
    private consecutiveHeartbeatFailures = 0;
    private static readonly HEARTBEAT_FAILURE_THRESHOLD = 3;
    private readonly leaserConfig?: ShardLeaserConfig;

    constructor(
        client: IShardLockProvider,
        streamId: QueueName,
        instanceId: string,
        lockTTLMs: number = 30000,
        config?: ShardLeaserConfig
    ) {
        this.client = client;
        this.streamId = streamId;
        this.instanceId = instanceId;
        this.lockTTLMs = lockTTLMs;
        this.heartbeatInterval = null;
        this.leaserConfig = config;
        this.startHeartbeat();
    }

    async getActiveInstances(): Promise<string[]> {
        return this.client.getActiveInstances(this.streamId);
    }

    async acquireLock(shardId: string): Promise<boolean> {
        return this.client.acquireLock(`${this.streamId}-${shardId}`, this.instanceId, this.lockTTLMs);
    }

    async renewLock(shardId: string): Promise<boolean> {
        return this.client.renewLock(`${this.streamId}-${shardId}`, this.instanceId, this.lockTTLMs);
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
            this.consecutiveHeartbeatFailures = 0;
        } catch (error) {
            this.consecutiveHeartbeatFailures++;
            logger.error(`Failed to send heartbeat (consecutive failures: ${this.consecutiveHeartbeatFailures}):`, error);

            if (this.consecutiveHeartbeatFailures >= ShardLeaser.HEARTBEAT_FAILURE_THRESHOLD) {
                logger.error(`[${this.instanceId}] [${this.streamId}] Heartbeat failure threshold exceeded (${this.consecutiveHeartbeatFailures} failures)`);
                this.leaserConfig?.onHeartbeatFailure?.(this.streamId, this.instanceId, this.consecutiveHeartbeatFailures);
            }
        }
    }
}

