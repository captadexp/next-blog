import {KinesisClient, ListShardsCommand} from '@aws-sdk/client-kinesis';
import {Logger, LogLevel} from "@supergrowthai/utils";
import {QueueName} from '../../../core';

const logger = new Logger('ShardManager', LogLevel.INFO);

interface ShardAssignment {
    targetShards: Set<string>;
    shardsToRelease: string[];
}

/**
 * Manages shard discovery and assignment for Kinesis streams
 */
export class KinesisShardManager {
    constructor(
        private kinesis: KinesisClient,
        private instanceId: string
    ) {
    }

    /**
     * Lists all available shards for a stream
     *
     * TODO(P5): No handling of shard splits/merges (resharding). Returns current
     *   shards but doesn't detect parent/child relationships after a split.
     *   Add when resharding is needed in production.
     */
    async listShards(streamId: QueueName): Promise<string[]> {
        try {
            const shards = await this.kinesis.send(new ListShardsCommand({
                StreamName: streamId as unknown as string
            }));

            if (!shards.Shards?.length) {
                logger.info(`[${this.instanceId}] [${streamId}] No shards found`);
                return [];
            }

            return shards.Shards
                .filter((s) => s.ShardId)
                .map((s) => s.ShardId!);
        } catch (error) {
            logger.error(`[${this.instanceId}] [${streamId}] Error listing shards:`, error);
            throw error;
        }
    }

    /**
     * Calculates shard assignments for this instance based on active instances
     * Uses the same round-robin logic from the original implementation
     */
    calculateShardAssignment(
        availableShards: string[],
        activeInstances: string[],
        currentHeldShards: Set<string>
    ): ShardAssignment {
        const instanceCount = activeInstances.length > 0 ? activeInstances.length : 1;
        const currentInstanceIndex = activeInstances.indexOf(this.instanceId);

        if (currentInstanceIndex === -1) {
            logger.warn(`[${this.instanceId}] Instance not found in active list`);
            // Return empty assignment and release all held shards
            return {
                targetShards: new Set<string>(),
                shardsToRelease: Array.from(currentHeldShards)
            };
        }

        // Calculate target shards using the same logic from original
        const targetShards = new Set<string>();
        const shardsPerInstance = Math.ceil(availableShards.length / instanceCount);
        const startIndex = currentInstanceIndex * shardsPerInstance;
        const endIndex = Math.min(startIndex + shardsPerInstance, availableShards.length);

        for (let i = startIndex; i < endIndex; i++) {
            targetShards.add(availableShards[i]);
        }

        // Determine which shards to release
        const shardsToRelease = Array.from(currentHeldShards).filter(
            (shardId) => !targetShards.has(shardId)
        );

        logger.debug(`[${this.instanceId}] Shard assignment calculated:`, {
            targetShards: Array.from(targetShards),
            shardsToRelease,
            totalAvailable: availableShards.length,
            instanceCount,
            instanceIndex: currentInstanceIndex
        });

        return {targetShards, shardsToRelease};
    }
}