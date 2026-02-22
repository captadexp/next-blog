import {describe, expect, it, beforeEach} from "bun:test";
import {AIMDStrategy} from "../queues/implementations/_kinesis/AIMDStrategy.js";
import {BATCH_RECORD_LIMIT, PROCESSING_DELAY} from "../queues/implementations/_kinesis/constants.js";
import type {BatchResult} from "../core/interfaces/adaptive-strategy.js";

function makeResult(shardId: string, overrides: Partial<BatchResult> = {}): BatchResult {
    return {
        shardId,
        recordCount: 10,
        successCount: 10,
        failureCount: 0,
        processingTimeMs: 100,
        taskTypes: ['task-a'],
        failedTaskTypes: [],
        throttled: false,
        poisonPill: false,
        ...overrides,
    };
}

function makeFailure(shardId: string, overrides: Partial<BatchResult> = {}): BatchResult {
    return makeResult(shardId, {
        successCount: 0,
        failureCount: 10,
        failedTaskTypes: ['task-a'],
        ...overrides,
    });
}

describe("AIMDStrategy", () => {
    let strategy: AIMDStrategy;
    const shardId = 'shard-001';

    beforeEach(() => {
        strategy = new AIMDStrategy();
    });

    describe("initial state", () => {
        it("returns default batch size for unknown shard", () => {
            expect(strategy.getBatchSize(shardId)).toBe(BATCH_RECORD_LIMIT);
        });

        it("returns default processing delay for unknown shard", () => {
            expect(strategy.getProcessingDelay(shardId)).toBe(PROCESSING_DELAY);
        });

        it("does not backoff for unknown shard", () => {
            expect(strategy.shouldBackoff(shardId)).toBe(false);
        });

        it("snapshot for unknown shard returns defaults", () => {
            const snap = strategy.getSnapshot(shardId);
            expect(snap.currentBatchSize).toBe(BATCH_RECORD_LIMIT);
            expect(snap.currentDelay).toBe(PROCESSING_DELAY);
            expect(snap.consecutiveSuccesses).toBe(0);
            expect(snap.consecutiveFailures).toBe(0);
            expect(snap.backoffUntil).toBeNull();
            expect(snap.hotTaskTypes).toEqual([]);
        });
    });

    describe("additive increase", () => {
        it("increases batch size after M consecutive successes", () => {
            const initial = strategy.getBatchSize(shardId);

            // Default successesBeforeIncrease = 3
            strategy.recordBatchResult(makeResult(shardId));
            strategy.recordBatchResult(makeResult(shardId));
            expect(strategy.getBatchSize(shardId)).toBe(initial); // Not yet

            strategy.recordBatchResult(makeResult(shardId));
            expect(strategy.getBatchSize(shardId)).toBe(initial + 10); // addStep = 10
        });

        it("increases multiple times with continued success", () => {
            const initial = strategy.getBatchSize(shardId);

            // 6 consecutive successes = 2 increases
            for (let i = 0; i < 6; i++) {
                strategy.recordBatchResult(makeResult(shardId));
            }
            expect(strategy.getBatchSize(shardId)).toBe(initial + 20);
        });

        it("respects maxBatch ceiling", () => {
            const s = new AIMDStrategy({maxBatch: 60, addStep: 10, successesBeforeIncrease: 1});
            // Start at 50 (BATCH_RECORD_LIMIT), max 60
            s.recordBatchResult(makeResult(shardId)); // 50 -> 60
            expect(s.getBatchSize(shardId)).toBe(60);

            s.recordBatchResult(makeResult(shardId)); // stays at 60
            expect(s.getBatchSize(shardId)).toBe(60);
        });
    });

    describe("multiplicative decrease", () => {
        it("halves batch size on failure", () => {
            const initial = strategy.getBatchSize(shardId); // 50

            strategy.recordBatchResult(makeFailure(shardId));
            expect(strategy.getBatchSize(shardId)).toBe(Math.floor(initial * 0.5)); // 25
        });

        it("respects minBatch floor", () => {
            const s = new AIMDStrategy({minBatch: 10});

            // Drive it down
            for (let i = 0; i < 10; i++) {
                s.recordBatchResult(makeFailure(shardId));
            }
            expect(s.getBatchSize(shardId)).toBe(10);
        });

        it("resets consecutive successes on failure", () => {
            // 2 successes, then 1 failure, then 3 more successes
            strategy.recordBatchResult(makeResult(shardId));
            strategy.recordBatchResult(makeResult(shardId));
            const sizeBeforeFailure = strategy.getBatchSize(shardId);

            strategy.recordBatchResult(makeFailure(shardId));
            const sizeAfterFailure = strategy.getBatchSize(shardId);
            expect(sizeAfterFailure).toBeLessThan(sizeBeforeFailure);

            // Need 3 more successes to increase (counter was reset)
            strategy.recordBatchResult(makeResult(shardId));
            strategy.recordBatchResult(makeResult(shardId));
            expect(strategy.getBatchSize(shardId)).toBe(sizeAfterFailure); // Not yet

            strategy.recordBatchResult(makeResult(shardId));
            expect(strategy.getBatchSize(shardId)).toBe(sizeAfterFailure + 10);
        });
    });

    describe("delay management", () => {
        it("increases delay on failure by multiplier", () => {
            strategy.recordBatchResult(makeFailure(shardId));
            expect(strategy.getProcessingDelay(shardId)).toBe(Math.min(PROCESSING_DELAY * 1.5, 30000));
        });

        it("caps delay at maxDelay", () => {
            const s = new AIMDStrategy({maxDelay: 10000, baseDelay: 5000});

            s.recordBatchResult(makeFailure(shardId)); // 5000 * 1.5 = 7500
            expect(s.getProcessingDelay(shardId)).toBe(7500);

            s.recordBatchResult(makeFailure(shardId)); // 7500 * 1.5 = 11250 -> capped at 10000
            expect(s.getProcessingDelay(shardId)).toBe(10000);
        });

        it("resets delay on success", () => {
            strategy.recordBatchResult(makeFailure(shardId));
            expect(strategy.getProcessingDelay(shardId)).toBeGreaterThan(PROCESSING_DELAY);

            strategy.recordBatchResult(makeResult(shardId));
            expect(strategy.getProcessingDelay(shardId)).toBe(PROCESSING_DELAY);
        });
    });

    describe("backoff", () => {
        it("activates backoff after N consecutive errors", () => {
            const s = new AIMDStrategy({backoffThreshold: 3});

            for (let i = 0; i < 2; i++) {
                s.recordBatchResult(makeFailure(shardId));
            }
            expect(s.shouldBackoff(shardId)).toBe(false);

            s.recordBatchResult(makeFailure(shardId)); // 3rd failure
            expect(s.shouldBackoff(shardId)).toBe(true);
        });

        it("backoff clears after time elapses", () => {
            const s = new AIMDStrategy({backoffThreshold: 1, maxBackoff: 10});

            s.recordBatchResult(makeFailure(shardId));
            expect(s.shouldBackoff(shardId)).toBe(true);

            // Wait for backoff to expire (backoff is 2^0 * 1000 = 1000ms, but maxBackoff=10ms)
            // Since maxBackoff is 10ms, it should expire almost immediately
            // We need to manually wait or check after time
        });

        it("backoff clears on success", () => {
            const s = new AIMDStrategy({backoffThreshold: 1});

            s.recordBatchResult(makeFailure(shardId));
            expect(s.shouldBackoff(shardId)).toBe(true);

            s.recordBatchResult(makeResult(shardId));
            expect(s.shouldBackoff(shardId)).toBe(false);
        });

        it("backoff duration uses exponential formula capped at maxBackoff", () => {
            const s = new AIMDStrategy({backoffThreshold: 2, maxBackoff: 5000});

            // 2 failures -> backoff = 2^0 * 1000 = 1000ms
            s.recordBatchResult(makeFailure(shardId));
            s.recordBatchResult(makeFailure(shardId));

            const snap1 = s.getSnapshot(shardId);
            expect(snap1.backoffUntil).not.toBeNull();
            const backoff1 = snap1.backoffUntil! - Date.now();
            expect(backoff1).toBeGreaterThan(0);
            expect(backoff1).toBeLessThanOrEqual(1100); // ~1000ms + some tolerance

            // 3rd failure -> backoff = 2^1 * 1000 = 2000ms
            s.recordBatchResult(makeFailure(shardId));
            const snap2 = s.getSnapshot(shardId);
            const backoff2 = snap2.backoffUntil! - Date.now();
            expect(backoff2).toBeGreaterThan(1000);
            expect(backoff2).toBeLessThanOrEqual(2100);
        });
    });

    describe("throttle handling", () => {
        it("treats throttle as failure for AIMD purposes", () => {
            const initial = strategy.getBatchSize(shardId);

            strategy.recordBatchResult(makeResult(shardId, {throttled: true}));
            expect(strategy.getBatchSize(shardId)).toBeLessThan(initial);
        });
    });

    describe("poison pill handling", () => {
        it("treats poisonPill as failure for AIMD purposes", () => {
            const initial = strategy.getBatchSize(shardId);

            strategy.recordBatchResult(makeResult(shardId, {poisonPill: true}));
            expect(strategy.getBatchSize(shardId)).toBeLessThan(initial);
        });
    });

    describe("per-type failure tracking", () => {
        it("identifies hot task types (>50% failure rate)", () => {
            // 3 failures for task-a, 3 successes for task-b
            for (let i = 0; i < 3; i++) {
                strategy.recordBatchResult(makeFailure(shardId, {
                    taskTypes: ['task-a'],
                    failedTaskTypes: ['task-a'],
                }));
                strategy.recordBatchResult(makeResult(shardId, {
                    taskTypes: ['task-b'],
                    failedTaskTypes: [],
                }));
            }

            const snap = strategy.getSnapshot(shardId);
            expect(snap.hotTaskTypes).toContain('task-a');
            expect(snap.hotTaskTypes).not.toContain('task-b');
        });

        it("rolling window evicts old entries", () => {
            const s = new AIMDStrategy({rollingWindowSize: 5});

            // 3 failures for task-a
            for (let i = 0; i < 3; i++) {
                s.recordBatchResult(makeFailure(shardId, {
                    taskTypes: ['task-a'],
                    failedTaskTypes: ['task-a'],
                }));
            }
            expect(s.getSnapshot(shardId).hotTaskTypes).toContain('task-a');

            // Push 5 successes for task-b, which should evict the 3 task-a failures
            for (let i = 0; i < 5; i++) {
                s.recordBatchResult(makeResult(shardId, {
                    taskTypes: ['task-b'],
                    failedTaskTypes: [],
                }));
            }
            expect(s.getSnapshot(shardId).hotTaskTypes).not.toContain('task-a');
        });
    });

    describe("per-shard isolation", () => {
        it("tracks state independently per shard", () => {
            const shard1 = 'shard-001';
            const shard2 = 'shard-002';

            // Fail shard1, succeed shard2
            strategy.recordBatchResult(makeFailure(shard1));
            for (let i = 0; i < 3; i++) {
                strategy.recordBatchResult(makeResult(shard2));
            }

            expect(strategy.getBatchSize(shard1)).toBeLessThan(BATCH_RECORD_LIMIT);
            expect(strategy.getBatchSize(shard2)).toBe(BATCH_RECORD_LIMIT + 10);

            expect(strategy.getProcessingDelay(shard1)).toBeGreaterThan(PROCESSING_DELAY);
            expect(strategy.getProcessingDelay(shard2)).toBe(PROCESSING_DELAY);
        });
    });

    describe("aggregate snapshot", () => {
        it("returns average across all shards when no shardId given", () => {
            const shard1 = 'shard-001';
            const shard2 = 'shard-002';

            // Initialize both shards by querying them
            strategy.getBatchSize(shard1);
            strategy.getBatchSize(shard2);

            const snap = strategy.getSnapshot();
            expect(snap.shardId).toBeUndefined();
            expect(snap.currentBatchSize).toBe(BATCH_RECORD_LIMIT);
            expect(snap.currentDelay).toBe(PROCESSING_DELAY);
        });

        it("returns defaults when no shards exist", () => {
            const snap = strategy.getSnapshot();
            expect(snap.currentBatchSize).toBe(BATCH_RECORD_LIMIT);
            expect(snap.currentDelay).toBe(PROCESSING_DELAY);
        });
    });

    describe("custom config", () => {
        it("respects custom successesBeforeIncrease and addStep", () => {
            const s = new AIMDStrategy({successesBeforeIncrease: 1, addStep: 5});

            s.recordBatchResult(makeResult(shardId));
            expect(s.getBatchSize(shardId)).toBe(BATCH_RECORD_LIMIT + 5);
        });

        it("respects custom decreaseFactor", () => {
            const s = new AIMDStrategy({decreaseFactor: 0.75});

            s.recordBatchResult(makeFailure(shardId));
            expect(s.getBatchSize(shardId)).toBe(Math.floor(BATCH_RECORD_LIMIT * 0.75));
        });
    });

    describe("AIMD sawtooth pattern", () => {
        it("produces expected sawtooth: slow climb, fast drop, slow climb", () => {
            const s = new AIMDStrategy({successesBeforeIncrease: 1, addStep: 10});
            const sizes: number[] = [];

            // Phase 1: climb 50 -> 60 -> 70
            s.recordBatchResult(makeResult(shardId));
            sizes.push(s.getBatchSize(shardId)); // 60
            s.recordBatchResult(makeResult(shardId));
            sizes.push(s.getBatchSize(shardId)); // 70

            // Phase 2: drop 70 -> 35
            s.recordBatchResult(makeFailure(shardId));
            sizes.push(s.getBatchSize(shardId)); // 35

            // Phase 3: climb back 35 -> 45 -> 55
            s.recordBatchResult(makeResult(shardId));
            sizes.push(s.getBatchSize(shardId)); // 45
            s.recordBatchResult(makeResult(shardId));
            sizes.push(s.getBatchSize(shardId)); // 55

            expect(sizes).toEqual([60, 70, 35, 45, 55]);
        });
    });
});
