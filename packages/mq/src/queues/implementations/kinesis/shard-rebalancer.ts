import {ShardLeaser} from '../../../shard';
import {ShardManager} from './shard-manager.js';
import {ShardConsumer} from './shard-consumer.js';
import {KinesisClient} from '@aws-sdk/client-kinesis';
import {Logger, LogLevel} from "@supergrowthai/utils";
import {MessageConsumer, QueueName} from '../../../core';
import {REBALANCE_INTERVAL} from "./constants.js";
import * as NodeUtils from 'node:util';

const logger = new Logger('ShardRebalancer', LogLevel.INFO);

interface RebalancerConfig {
    instanceId: string;
    kinesis: KinesisClient;
    textDecoder: NodeUtils.TextDecoder;
    isRunningCheck: () => boolean;
    isShardHeldCheck: (streamId: QueueName, shardId: string) => boolean;
    onShardLost: (streamId: QueueName, shardId: string) => void;
}

/**
 * Orchestrates shard rebalancing across instances
 */
export class ShardRebalancer {
    private shardManager: ShardManager;
    private activeConsumers: Map<string, ShardConsumer> = new Map();

    constructor(private config: RebalancerConfig) {
        this.shardManager = new ShardManager(config.kinesis, config.instanceId);
    }

    /**
     * Start the rebalancing loop for a stream
     */
    async startRebalancing(
        streamId: QueueName,
        shardLeaser: ShardLeaser,
        processor: MessageConsumer<any, any, any>,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): Promise<void> {
        const {instanceId, isRunningCheck} = this.config;
        const currentShardIdsInLoop = new Set<string>(heldShardsByStream.get(streamId) || []);

        while (isRunningCheck()) {
            try {
                logger.debug(`[${instanceId}] [${streamId}] Starting rebalance cycle`);

                await this.performRebalanceCycle(
                    streamId,
                    shardLeaser,
                    processor,
                    currentShardIdsInLoop,
                    heldShardsByStream
                );

                logger.debug(`[${instanceId}] [${streamId}] Rebalance cycle ended. Actively tracked shards: ${Array.from(heldShardsByStream.get(streamId) || []).join(', ')}`);

                // Wait for next rebalance cycle
                await new Promise(resolve => setTimeout(resolve, REBALANCE_INTERVAL));

            } catch (error) {
                logger.error(`[${instanceId}] [${streamId}] Error during rebalancing loop:`, error);
                await new Promise(resolve => setTimeout(resolve, REBALANCE_INTERVAL));
            }
        }

        logger.info(`[${instanceId}] [${streamId}] Rebalancing loop terminated`);
    }

    /**
     * Stop all active consumers
     */
    stopAllConsumers(): void {
        const {instanceId} = this.config;
        const consumerCount = this.activeConsumers.size;

        if (consumerCount > 0) {
            logger.info(`[${instanceId}] Stopping ${consumerCount} active consumers`);

            // Log all consumers being stopped for debugging
            for (const [consumerKey] of this.activeConsumers) {
                logger.debug(`[${instanceId}] Stopping consumer: ${consumerKey}`);
            }
        }

        this.activeConsumers.clear();
        logger.info(`[${instanceId}] All consumers stopped and cleaned up`);
    }

    /**
     * Perform a single rebalance cycle
     */
    private async performRebalanceCycle(
        streamId: QueueName,
        shardLeaser: ShardLeaser,
        processor: MessageConsumer<any, any, any>,
        currentShardIdsInLoop: Set<string>,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): Promise<void> {
        const {instanceId} = this.config;

        // List available shards
        const availableShards = await this.shardManager.listShards(streamId);
        if (!availableShards.length) {
            logger.info(`[${instanceId}] [${streamId}] No shards found, waiting...`);
            return;
        }

        logger.debug(`[${instanceId}] [${streamId}] Available shards: ${availableShards.join(', ')}`);

        // Get active instances
        const activeInstances = await shardLeaser.getActiveInstances();
        logger.debug(`[${instanceId}] [${streamId}] Active instances: ${activeInstances.join(', ')}`);

        if (!activeInstances.includes(instanceId)) {
            logger.warn(`[${instanceId}] [${streamId}] Instance not found in active list`);
            await this.releaseAllShards(streamId, shardLeaser, currentShardIdsInLoop, heldShardsByStream);
            return;
        }

        // Calculate shard assignments
        const {targetShards, shardsToRelease} = this.shardManager.calculateShardAssignment(
            availableShards,
            activeInstances,
            currentShardIdsInLoop
        );

        logger.debug(`[${instanceId}] [${streamId}] Target shards: ${Array.from(targetShards).join(', ')}`);

        // Release shards that should no longer be owned
        await this.releaseShards(streamId, shardLeaser, shardsToRelease, currentShardIdsInLoop, heldShardsByStream);

        // Try to acquire new target shards
        await this.acquireShards(streamId, shardLeaser, processor, targetShards, currentShardIdsInLoop, heldShardsByStream);
    }

    /**
     * Release shards that should no longer be owned by this instance
     */
    private async releaseShards(
        streamId: QueueName,
        shardLeaser: ShardLeaser,
        shardsToRelease: string[],
        currentShardIdsInLoop: Set<string>,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): Promise<void> {
        const {instanceId} = this.config;

        for (const shardId of shardsToRelease) {
            logger.info(`[${instanceId}] [${streamId}] [${shardId}] Releasing shard due to rebalance`);

            // CRITICAL FIX: Properly stop and cleanup consumer
            await this.stopAndCleanupConsumer(streamId, shardId);

            await this.releaseShardLock(streamId, shardLeaser, shardId, heldShardsByStream);
            currentShardIdsInLoop.delete(shardId);
        }
    }

    /**
     * Try to acquire new target shards
     */
    private async acquireShards(
        streamId: QueueName,
        shardLeaser: ShardLeaser,
        processor: MessageConsumer<any, any, any>,
        targetShards: Set<string>,
        currentShardIdsInLoop: Set<string>,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): Promise<void> {
        const {instanceId, kinesis, textDecoder, isRunningCheck, isShardHeldCheck, onShardLost} = this.config;

        for (const shardId of targetShards) {
            if (!currentShardIdsInLoop.has(shardId)) {
                logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Attempting to acquire lock`);

                try {
                    const hasLock = await shardLeaser.acquireLock(shardId);

                    if (hasLock) {
                        logger.info(`[${instanceId}] [${streamId}] [${shardId}] Lock acquired successfully`);

                        // Update tracking
                        if (!heldShardsByStream.has(streamId)) {
                            heldShardsByStream.set(streamId, new Set());
                        }
                        heldShardsByStream.get(streamId)!.add(shardId);
                        currentShardIdsInLoop.add(shardId);

                        logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Starting consumption task`);

                        // Start consuming
                        this.startShardConsumer(
                            streamId,
                            shardId,
                            shardLeaser,
                            processor,
                            currentShardIdsInLoop,
                            heldShardsByStream
                        );

                    } else {
                        logger.info(`[${instanceId}] [${streamId}] [${shardId}] Failed to acquire lock`);
                    }
                } catch (error) {
                    logger.error(`[${instanceId}] [${streamId}] [${shardId}] Error during lock acquisition:`, error);
                }
            }
        }
    }

    /**
     * Start a shard consumer
     */
    private startShardConsumer(
        streamId: QueueName,
        shardId: string,
        shardLeaser: ShardLeaser,
        processor: MessageConsumer<any, any, any>,
        currentShardIdsInLoop: Set<string>,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): void {
        const {instanceId, kinesis, textDecoder, isRunningCheck, isShardHeldCheck} = this.config;
        const consumerKey = `${streamId}-${shardId}`;

        // CRITICAL FIX: Clean up any existing consumer for this shard first
        if (this.activeConsumers.has(consumerKey)) {
            logger.warn(`[${instanceId}] [${streamId}] [${shardId}] Replacing existing consumer`);
            this.activeConsumers.delete(consumerKey);
        }

        const consumer = new ShardConsumer({
            instanceId,
            streamId,
            shardId,
            kinesis,
            shardLeaser,
            processor,
            textDecoder,
            onShardLost: () => {
                logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Shard lost callback triggered`);
                currentShardIdsInLoop.delete(shardId);
                this.removeFromHeldShards(streamId, shardId, heldShardsByStream);
                // CRITICAL FIX: Remove from active consumers map
                this.activeConsumers.delete(consumerKey);
            },
            isRunningCheck,
            isShardHeldCheck
        });

        this.activeConsumers.set(consumerKey, consumer);
        logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Consumer added to active map (total: ${this.activeConsumers.size})`);

        // Start consumption in background with comprehensive error handling
        consumer.consume()
            .then(() => {
                logger.info(`[${instanceId}] [${streamId}] [${shardId}] Consumer completed successfully`);
            })
            .catch((error) => {
                logger.error(`[${instanceId}] [${streamId}] [${shardId}] Unhandled error in consumption:`, error);
            })
            .finally(() => {
                // CRITICAL FIX: Always cleanup consumer from map
                logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Cleaning up consumer`);
                currentShardIdsInLoop.delete(shardId);
                this.activeConsumers.delete(consumerKey);
                this.removeFromHeldShards(streamId, shardId, heldShardsByStream);
                logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Consumer cleanup completed (remaining: ${this.activeConsumers.size})`);
            });
    }

    /**
     * Release all shards when instance is not active
     */
    private async releaseAllShards(
        streamId: QueueName,
        shardLeaser: ShardLeaser,
        currentShardIdsInLoop: Set<string>,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): Promise<void> {
        const {instanceId} = this.config;

        // CRITICAL FIX: Stop all consumers for this stream first
        const consumersToStop = Array.from(this.activeConsumers.keys())
            .filter(key => key.startsWith(`${streamId}-`));

        for (const consumerKey of consumersToStop) {
            const [, shardId] = consumerKey.split('-', 2);
            await this.stopAndCleanupConsumer(streamId, shardId);
        }

        // Then release all shard locks
        for (const shardId of Array.from(currentShardIdsInLoop)) {
            logger.warn(`[${instanceId}] [${streamId}] [${shardId}] Releasing potentially orphaned lock`);
            await this.releaseShardLock(streamId, shardLeaser, shardId, heldShardsByStream);
            currentShardIdsInLoop.delete(shardId);
        }
    }

    /**
     * Release a shard lock and update state
     */
    private async releaseShardLock(
        streamId: QueueName,
        shardLeaser: ShardLeaser,
        shardId: string,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): Promise<void> {
        const {instanceId} = this.config;

        try {
            await shardLeaser.releaseLock(shardId);
            logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Successfully released lock`);
        } catch (error) {
            logger.error(`[${instanceId}] [${streamId}] [${shardId}] Error releasing lock:`, error);
        } finally {
            this.removeFromHeldShards(streamId, shardId, heldShardsByStream);
        }
    }

    /**
     * Remove shard from held shards tracking
     */
    private removeFromHeldShards(
        streamId: QueueName,
        shardId: string,
        heldShardsByStream: Map<QueueName, Set<string>>
    ): void {
        const {instanceId} = this.config;

        const streamShards = heldShardsByStream.get(streamId);
        if (streamShards?.has(shardId)) {
            streamShards.delete(shardId);
            logger.info(`[${instanceId}] [${streamId}] [${shardId}] Untracked shard`);

            if (streamShards.size === 0) {
                heldShardsByStream.delete(streamId);
                logger.info(`[${instanceId}] [${streamId}] Removed stream entry from tracking map`);
            }
        }
    }

    /**
     * Stop and cleanup a specific consumer
     */
    private async stopAndCleanupConsumer(streamId: QueueName, shardId: string): Promise<void> {
        const {instanceId} = this.config;
        const consumerKey = `${streamId}-${shardId}`;
        const consumer = this.activeConsumers.get(consumerKey);

        if (consumer) {
            logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Stopping consumer`);
            this.activeConsumers.delete(consumerKey);
            logger.debug(`[${instanceId}] [${streamId}] [${shardId}] Consumer removed from map (remaining: ${this.activeConsumers.size})`);
        } else {
            logger.debug(`[${instanceId}] [${streamId}] [${shardId}] No active consumer found to stop`);
        }
    }
}