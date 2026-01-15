import path from 'path';
import fs from 'fs/promises';
import {IShardLockProvider} from './IShardLockProvider.js';

interface HeartbeatData {
    [instanceId: string]: number;
}

/**
 * File-based shard lock provider for development and testing.
 *
 * @description Uses the local filesystem for locking. NOT suitable for
 * distributed environments as locks are not shared across machines.
 *
 * @use-case Development and single-machine testing only
 * @multi-instance NOT SAFE - locks stored on local filesystem
 * @persistence File-based - survives process restart but not machine restart
 * @requires Write access to baseDir (default: /tmp/kinesis-locks)
 *
 * @warning Do NOT use in production multi-server deployments.
 * Use {@link RedisClusterShardLockProvider} instead.
 *
 * @example
 * ```typescript
 * const lockProvider = new FileShardLockProvider('/tmp/my-locks');
 * ```
 */
export class FileShardLockProvider implements IShardLockProvider {
    private readonly baseDir: string;
    private readonly lockDir: string;
    private readonly checkpointDir: string;
    private readonly heartbeatDir: string;

    constructor(baseDir: string = '/tmp/kinesis-locks') {
        this.baseDir = baseDir;
        this.lockDir = path.join(baseDir, 'locks');
        this.checkpointDir = path.join(baseDir, 'checkpoints');
        this.heartbeatDir = path.join(baseDir, 'heartbeats');
        this.initializeDirs().catch(console.error.bind(null, "FileShardLockProvider:"));
    }

    async acquireLock(shardId: string, instanceId: string, lockTTLMs: number): Promise<boolean> {
        const lockPath = this.getLockPath(shardId);
        try {
            // Try to create the lock file
            const lockData = JSON.stringify({
                instanceId,
                timestamp: Date.now(),
                expiresAt: Date.now() + lockTTLMs,
            });

            // Using 'wx' flag ensures file is created only if it doesn't exist
            await fs.writeFile(lockPath, lockData, {flag: 'wx'});
            return true;
        } catch (error: any) {
            if (error.code === 'EEXIST') {
                // Check if the existing lock is expired
                try {
                    const existingLockData = JSON.parse(await fs.readFile(lockPath, 'utf8'));
                    if (existingLockData.expiresAt < Date.now()) {
                        // Lock is expired, overwrite it
                        await fs.writeFile(
                            lockPath,
                            JSON.stringify({
                                instanceId,
                                timestamp: Date.now(),
                                expiresAt: Date.now() + lockTTLMs,
                            })
                        );
                        return true;
                    }
                } catch (readError) {
                    // If we can't read the lock file, assume it's invalid and try to acquire
                    await fs.writeFile(
                        lockPath,
                        JSON.stringify({
                            instanceId,
                            timestamp: Date.now(),
                            expiresAt: Date.now() + lockTTLMs,
                        })
                    );
                    return true;
                }
                return false;
            }
            throw error;
        }
    }

    async setCheckpoint(shardId: string, sequenceNumber: string): Promise<void> {
        const checkpointPath = this.getCheckpointPath(shardId);
        await fs.writeFile(checkpointPath, sequenceNumber);
    }

    async getCheckpoint(shardId: string): Promise<string | null> {
        const checkpointPath = this.getCheckpointPath(shardId);
        try {
            return await fs.readFile(checkpointPath, 'utf8');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async renewLock(shardId: string, instanceId: string, lockTTLMs: number): Promise<boolean> {
        const lockPath = this.getLockPath(shardId);
        try {
            const lockData = JSON.parse(await fs.readFile(lockPath, 'utf8'));
            // Verify ownership before renewing
            if (lockData.instanceId !== instanceId) {
                return false; // Lock owned by another instance
            }
            lockData.expiresAt = Date.now() + lockTTLMs;
            await fs.writeFile(lockPath, JSON.stringify(lockData));
            return true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return false; // Lock doesn't exist
            }
            throw error;
        }
    }

    async releaseLock(key: string, instanceId: string): Promise<void> {
        const lockPath = this.getLockPath(key);
        try {
            const lockData = JSON.parse(await fs.readFile(lockPath, 'utf8'));
            if (lockData.instanceId === instanceId) {
                await fs.unlink(lockPath);
            }
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    async sendHeartbeat(streamId: string, instanceId: string, ttlMs: number): Promise<void> {
        const heartbeatPath = this.getHeartbeatPath(streamId);
        try {
            // Read existing heartbeats
            let heartbeats: HeartbeatData;
            try {
                const data = await fs.readFile(heartbeatPath, 'utf8');
                heartbeats = JSON.parse(data);
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    heartbeats = {};
                } else {
                    throw error;
                }
            }

            // Update heartbeat
            heartbeats[instanceId] = Date.now();

            // Clean up old heartbeats
            const cutoffTime = Date.now() - ttlMs;
            for (const [id, timestamp] of Object.entries(heartbeats)) {
                if (timestamp < cutoffTime) {
                    delete heartbeats[id];
                }
            }

            // Write back to file
            await fs.writeFile(heartbeatPath, JSON.stringify(heartbeats));
        } catch (error) {
            console.error(`Error sending heartbeat for ${instanceId}:`, error);
        }
    }

    async getActiveInstances(streamId: string): Promise<string[]> {
        const heartbeatPath = this.getHeartbeatPath(streamId);
        try {
            const data = await fs.readFile(heartbeatPath, 'utf8');
            const heartbeats: HeartbeatData = JSON.parse(data);
            const cutoffTime = Date.now() - 30000; // Consider instances dead after 30 seconds

            return Object.entries(heartbeats)
                .filter(([_, timestamp]) => timestamp > cutoffTime)
                .map(([instanceId]) => instanceId)
                .sort(); // Sort for consistent ordering
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    private async initializeDirs() {
        await fs.mkdir(this.baseDir, {recursive: true});
        await fs.mkdir(this.lockDir, {recursive: true});
        await fs.mkdir(this.checkpointDir, {recursive: true});
        await fs.mkdir(this.heartbeatDir, {recursive: true});
    }

    private getLockPath(shardId: string): string {
        return path.join(this.lockDir, `${shardId}.lock`);
    }

    private getCheckpointPath(shardId: string): string {
        return path.join(this.checkpointDir, `${shardId}.checkpoint`);
    }

    private getHeartbeatPath(streamId: string): string {
        return path.join(this.heartbeatDir, `${streamId}.heartbeats`);
    }
}

