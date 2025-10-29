import {Cluster, Redis} from 'ioredis';
import {IShardLockProvider} from './IShardLockProvider.js';

export abstract class MongoRedisShardLockProvider implements IShardLockProvider {
    private readonly redisClient: Cluster | Redis;

    constructor(redisClient: Cluster | Redis) {
        this.redisClient = redisClient;
    }

    async acquireLock(shardId: string, instanceId: any, lockTTLMs: number) {
        const result = await this.redisClient.set(
            `kinesis:lock:${shardId}`,
            instanceId,
            'PX',
            lockTTLMs,
            'NX' // Only set if not exists
        );

        return result === 'OK';
    }

    abstract setCheckpoint(shardId: string, sequenceNumber: string): Promise<void>;

    abstract getCheckpoint(shardId: string): Promise<string | null>;

    async renewLock(shardId: string, lockTTLMs: number) {
        await this.redisClient.expire(`kinesis:lock:${shardId}`, lockTTLMs / 1000);
    }

    async releaseLock(key: string, instanceId: string): Promise<void> {
        const lua = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
        await this.redisClient.eval(lua, 1, `kinesis:lock:${key}`, instanceId);
    }

    async sendHeartbeat(streamId: string, instanceId: string, ttlMs: number): Promise<void> {
        const timestamp = Date.now().toString();

        // Use multi to ensure atomic operation
        await this.redisClient
            .multi()
            .hset(`kinesis:heartbeats:${streamId}`, instanceId, timestamp)
            .expire(`kinesis:heartbeats:${streamId}`, ttlMs / 1000)
            .exec();
    }

    async getActiveInstances(streamId: string): Promise<string[]> {
        const heartbeatsKey = `kinesis:heartbeats:${streamId}`;
        const cutoffTime = Date.now() - 30000; // Consider instances dead after 30 seconds of no heartbeat

        // Get all heartbeats
        const heartbeats = await this.redisClient.hgetall(heartbeatsKey);
        if (!heartbeats) return [];

        // Filter active instances
        return Object.entries(heartbeats)
            .filter(([_, timestamp]) => parseInt(timestamp) > cutoffTime)
            .map(([instanceId]) => instanceId)
            .sort(); // Sort for consistent ordering
    }
}

