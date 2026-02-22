import type {AdaptiveSnapshot, BatchResult, IAdaptiveStrategy} from '../../../core/interfaces/adaptive-strategy.js';
import {BATCH_RECORD_LIMIT, PROCESSING_DELAY} from './constants.js';

export interface AIMDConfig {
    /** Consecutive successes before increasing batch size (default: 3) */
    successesBeforeIncrease?: number;
    /** Additive increase step (default: 10) */
    addStep?: number;
    /** Multiplicative decrease factor (default: 0.5) */
    decreaseFactor?: number;
    /** Minimum batch size (default: 10) */
    minBatch?: number;
    /** Maximum batch size (default: 500) */
    maxBatch?: number;
    /** Base delay when idle in ms (default: PROCESSING_DELAY) */
    baseDelay?: number;
    /** Delay multiplier on error (default: 1.5) */
    delayMultiplier?: number;
    /** Maximum delay in ms (default: 30000) */
    maxDelay?: number;
    /** Consecutive errors before backoff (default: 10) */
    backoffThreshold?: number;
    /** Maximum backoff time in ms (default: 60000) */
    maxBackoff?: number;
    /** Rolling window size for per-type failure tracking (default: 100) */
    rollingWindowSize?: number;
}

interface ShardState {
    batchSize: number;
    delay: number;
    consecutiveSuccesses: number;
    consecutiveFailures: number;
    backoffUntil: number | null;
}

interface TypeStats {
    success: number;
    fail: number;
}

export class AIMDStrategy implements IAdaptiveStrategy {
    private readonly shardStates = new Map<string, ShardState>();
    private readonly typeStats = new Map<string, TypeStats>();
    // TODO(D4): Replace with circular buffer — shift() is O(n) at large rollingWindowSize.
    private readonly typeHistory: Array<{ type: string; success: boolean }> = [];

    private readonly successesBeforeIncrease: number;
    private readonly addStep: number;
    private readonly decreaseFactor: number;
    private readonly minBatch: number;
    private readonly maxBatch: number;
    private readonly baseDelay: number;
    private readonly delayMultiplier: number;
    private readonly maxDelay: number;
    private readonly backoffThreshold: number;
    private readonly maxBackoff: number;
    private readonly rollingWindowSize: number;

    constructor(config: AIMDConfig = {}) {
        this.successesBeforeIncrease = config.successesBeforeIncrease ?? 3;
        this.addStep = config.addStep ?? 10;
        this.decreaseFactor = config.decreaseFactor ?? 0.5;
        this.minBatch = config.minBatch ?? 10;
        this.maxBatch = config.maxBatch ?? 500;
        this.baseDelay = config.baseDelay ?? PROCESSING_DELAY;
        this.delayMultiplier = config.delayMultiplier ?? 1.5;
        this.maxDelay = config.maxDelay ?? 30000;
        this.backoffThreshold = config.backoffThreshold ?? 10;
        this.maxBackoff = config.maxBackoff ?? 60000;
        this.rollingWindowSize = config.rollingWindowSize ?? 100;
    }

    private getOrCreateState(shardId: string): ShardState {
        let state = this.shardStates.get(shardId);
        if (!state) {
            state = {
                batchSize: BATCH_RECORD_LIMIT,
                delay: this.baseDelay,
                consecutiveSuccesses: 0,
                consecutiveFailures: 0,
                backoffUntil: null,
            };
            this.shardStates.set(shardId, state);
        }
        return state;
    }

    getBatchSize(shardId: string): number {
        return this.getOrCreateState(shardId).batchSize;
    }

    getProcessingDelay(shardId: string): number {
        return this.getOrCreateState(shardId).delay;
    }

    shouldBackoff(shardId: string): boolean {
        const state = this.getOrCreateState(shardId);
        if (state.backoffUntil === null) return false;
        if (Date.now() >= state.backoffUntil) {
            state.backoffUntil = null;
            return false;
        }
        return true;
    }

    recordBatchResult(result: BatchResult): void {
        const state = this.getOrCreateState(result.shardId);
        const isSuccess = result.failureCount === 0 && !result.throttled && !result.poisonPill;

        if (isSuccess) {
            state.consecutiveSuccesses++;
            state.consecutiveFailures = 0;

            // Additive increase after M consecutive successes
            if (state.consecutiveSuccesses >= this.successesBeforeIncrease) {
                state.batchSize = Math.min(state.batchSize + this.addStep, this.maxBatch);
                state.consecutiveSuccesses = 0;
            }

            // Reset delay on success
            state.delay = this.baseDelay;
            state.backoffUntil = null;
        } else {
            state.consecutiveFailures++;
            state.consecutiveSuccesses = 0;

            // Multiplicative decrease
            state.batchSize = Math.max(
                Math.floor(state.batchSize * this.decreaseFactor),
                this.minBatch
            );

            // Increase delay
            state.delay = Math.min(state.delay * this.delayMultiplier, this.maxDelay);

            // Backoff after N consecutive errors
            if (state.consecutiveFailures >= this.backoffThreshold) {
                const backoffMs = Math.min(
                    Math.pow(2, state.consecutiveFailures - this.backoffThreshold) * 1000,
                    this.maxBackoff
                );
                state.backoffUntil = Date.now() + backoffMs;
            }
        }

        // Track per-type stats
        this.updateTypeStats(result);
    }

    getSnapshot(shardId?: string): AdaptiveSnapshot {
        if (shardId) {
            const state = this.getOrCreateState(shardId);
            return {
                shardId,
                currentBatchSize: state.batchSize,
                currentDelay: state.delay,
                consecutiveSuccesses: state.consecutiveSuccesses,
                consecutiveFailures: state.consecutiveFailures,
                backoffUntil: state.backoffUntil,
                hotTaskTypes: this.getHotTaskTypes(),
            };
        }

        // Aggregate across all shards
        let totalBatchSize = 0;
        let totalDelay = 0;
        let totalSuccesses = 0;
        let totalFailures = 0;
        let count = 0;
        let latestBackoff: number | null = null;

        for (const state of this.shardStates.values()) {
            totalBatchSize += state.batchSize;
            totalDelay += state.delay;
            totalSuccesses += state.consecutiveSuccesses;
            totalFailures += state.consecutiveFailures;
            count++;
            if (state.backoffUntil !== null) {
                latestBackoff = latestBackoff === null
                    ? state.backoffUntil
                    : Math.max(latestBackoff, state.backoffUntil);
            }
        }

        return {
            currentBatchSize: count > 0 ? Math.round(totalBatchSize / count) : BATCH_RECORD_LIMIT,
            currentDelay: count > 0 ? Math.round(totalDelay / count) : this.baseDelay,
            consecutiveSuccesses: totalSuccesses,
            consecutiveFailures: totalFailures,
            backoffUntil: latestBackoff,
            hotTaskTypes: this.getHotTaskTypes(),
        };
    }

    private updateTypeStats(result: BatchResult): void {
        // Record successes for all task types
        for (const type of result.taskTypes) {
            const entry = { type, success: !result.failedTaskTypes.includes(type) };
            this.typeHistory.push(entry);

            const stats = this.typeStats.get(type) || { success: 0, fail: 0 };
            if (entry.success) {
                stats.success++;
            } else {
                stats.fail++;
            }
            this.typeStats.set(type, stats);
        }

        // Trim rolling window
        while (this.typeHistory.length > this.rollingWindowSize) {
            const removed = this.typeHistory.shift()!;
            const stats = this.typeStats.get(removed.type);
            if (stats) {
                if (removed.success) {
                    stats.success = Math.max(0, stats.success - 1);
                } else {
                    stats.fail = Math.max(0, stats.fail - 1);
                }
                if (stats.success === 0 && stats.fail === 0) {
                    this.typeStats.delete(removed.type);
                }
            }
        }
    }

    private getHotTaskTypes(): string[] {
        const hot: string[] = [];
        for (const [type, stats] of this.typeStats) {
            const total = stats.success + stats.fail;
            if (total > 0 && stats.fail / total > 0.5) {
                hot.push(type);
            }
        }
        return hot;
    }
}
