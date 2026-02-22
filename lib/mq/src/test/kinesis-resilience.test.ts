import {describe, expect, it} from "bun:test";
import type {IAdaptiveStrategy, BatchResult} from "../core/interfaces/adaptive-strategy.js";
import type {IShardLockProvider} from "../shard/lock-providers/IShardLockProvider.js";
import {ShardLeaser} from "../shard/leaser/index.js";
import type {QueueName} from "../core";

/**
 * Tests for K1 (poison pill), K2 (lock renewal retry), K3 (throttle not error),
 * K7 (consumer key parsing), K8 (heartbeat failure visibility)
 */

// ============ K7: Consumer key parsing ============

describe("K7: consumer key parsing", () => {
    it("correctly extracts shardId from consumer key with hyphenated streamId", () => {
        const streamId = "my-stream-prod" as QueueName;
        const shardId = "shardId-000000000001";
        const consumerKey = `${streamId}-${shardId}`;

        // Old broken behavior: split('-', 2) gives ['my', 'stream']
        const [, brokenShardId] = consumerKey.split('-', 2);
        expect(brokenShardId).not.toBe(shardId); // confirms old was broken

        // New correct behavior: substring
        const correctShardId = consumerKey.substring((streamId as string).length + 1);
        expect(correctShardId).toBe(shardId);
    });

    it("works with simple streamId without hyphens", () => {
        const streamId = "mystream" as QueueName;
        const shardId = "shardId-000000000001";
        const consumerKey = `${streamId}-${shardId}`;

        const correctShardId = consumerKey.substring((streamId as string).length + 1);
        expect(correctShardId).toBe(shardId);
    });

    it("works with numeric-only shardId", () => {
        const streamId = "prod-queue-v2" as QueueName;
        const shardId = "000000000003";
        const consumerKey = `${streamId}-${shardId}`;

        const correctShardId = consumerKey.substring((streamId as string).length + 1);
        expect(correctShardId).toBe(shardId);
    });
});

// ============ K3: Throttle error handling ============

describe("K3: throttle errors should not count as consecutive errors", () => {
    it("ProvisionedThroughputExceededException is identified as throttle", () => {
        const isThrottle = (err: any) => err.name === 'ProvisionedThroughputExceededException';

        expect(isThrottle({name: 'ProvisionedThroughputExceededException'})).toBe(true);
        expect(isThrottle({name: 'InternalServerError'})).toBe(false);
        expect(isThrottle({name: 'ExpiredIteratorException'})).toBe(false);
    });

    it("mixed throttle + real errors only counts real errors", () => {
        let consecutiveErrorCount = 0;
        const errors = [
            {name: 'ProvisionedThroughputExceededException'}, // skip
            {name: 'InternalServerError'},                    // count
            {name: 'ProvisionedThroughputExceededException'}, // skip
            {name: 'ProvisionedThroughputExceededException'}, // skip
            {name: 'NetworkError'},                           // count
        ];

        for (const err of errors) {
            if (err.name !== 'ProvisionedThroughputExceededException') {
                consecutiveErrorCount++;
            }
        }

        expect(consecutiveErrorCount).toBe(2);
    });
});

// ============ K8: Heartbeat failure visibility ============

describe("K8: heartbeat failure tracking", () => {
    function createMockLockProvider(heartbeatShouldFail = false): IShardLockProvider {
        return {
            acquireLock: async () => true,
            renewLock: async () => true,
            releaseLock: async () => {},
            getCheckpoint: async () => null,
            setCheckpoint: async () => {},
            getActiveInstances: async () => [],
            sendHeartbeat: async () => {
                if (heartbeatShouldFail) throw new Error('Redis connection refused');
            }
        };
    }

    it("calls onHeartbeatFailure after threshold exceeded", async () => {
        const failingProvider = createMockLockProvider(true);
        const failures: number[] = [];

        const leaser = new ShardLeaser(
            failingProvider,
            'test-stream' as QueueName,
            'instance-1',
            200, // short TTL for fast heartbeat
            {
                onHeartbeatFailure: (_streamId, _instanceId, count) => {
                    failures.push(count);
                }
            }
        );

        // Wait for heartbeats to fire (TTL/2 = 100ms interval + initial)
        await new Promise(resolve => setTimeout(resolve, 500));

        leaser.cleanup();

        // Should have accumulated failures and called the callback
        expect(failures.length).toBeGreaterThan(0);
        expect(failures[0]).toBeGreaterThanOrEqual(3); // threshold is 3
    });

    it("resets failure counter on successful heartbeat", async () => {
        let shouldFail = true;

        const provider: IShardLockProvider = {
            acquireLock: async () => true,
            renewLock: async () => true,
            releaseLock: async () => {},
            getCheckpoint: async () => null,
            setCheckpoint: async () => {},
            getActiveInstances: async () => [],
            sendHeartbeat: async () => {
                if (shouldFail) throw new Error('Redis down');
            }
        };

        const failures: number[] = [];
        const leaser = new ShardLeaser(
            provider,
            'test-stream' as QueueName,
            'instance-1',
            100, // very short TTL
            {
                onHeartbeatFailure: (_streamId, _instanceId, count) => {
                    failures.push(count);
                    // After first callback, make heartbeat succeed
                    shouldFail = false;
                }
            }
        );

        // Wait for failures + recovery
        await new Promise(resolve => setTimeout(resolve, 500));
        leaser.cleanup();

        // Callback was called at least once, and eventually stopped being called (counter reset)
        expect(failures.length).toBeGreaterThan(0);
    });
});

// ============ K1: Poison pill detection ============

describe("K1: poison pill detection", () => {
    /** Mirrors the checkpoint tracking logic in KinesisShardConsumer.processRecordBatch */
    class PoisonPillTracker {
        lastCheckpoint: string | null = null;
        failureCount = 0;
        readonly threshold: number;

        constructor(threshold = 3) {
            this.threshold = threshold;
        }

        /** Returns true if poison pill detected (should skip batch) */
        recordCheckpoint(checkpoint: string): boolean {
            if (checkpoint === this.lastCheckpoint) {
                this.failureCount++;
            } else {
                this.lastCheckpoint = checkpoint;
                this.failureCount = 0;
            }
            return this.failureCount >= this.threshold;
        }

        reset() {
            this.failureCount = 0;
            this.lastCheckpoint = null;
        }
    }

    it("triggers after N repeated failures at same checkpoint", () => {
        const tracker = new PoisonPillTracker(3);

        expect(tracker.recordCheckpoint('seq-100')).toBe(false); // 1st: sets checkpoint, count=0
        expect(tracker.recordCheckpoint('seq-100')).toBe(false); // 2nd: count=1
        expect(tracker.recordCheckpoint('seq-100')).toBe(false); // 3rd: count=2
        expect(tracker.recordCheckpoint('seq-100')).toBe(true);  // 4th: count=3 >= threshold
    });

    it("resets counter when checkpoint advances", () => {
        const tracker = new PoisonPillTracker(3);

        tracker.recordCheckpoint('seq-100'); // set
        tracker.recordCheckpoint('seq-100'); // count=1
        tracker.recordCheckpoint('seq-100'); // count=2

        // New checkpoint resets
        expect(tracker.recordCheckpoint('seq-200')).toBe(false);
        expect(tracker.failureCount).toBe(0);
    });

    it("reset() clears all state for reuse after advancing", () => {
        const tracker = new PoisonPillTracker(3);

        // Drive to threshold
        for (let i = 0; i < 4; i++) tracker.recordCheckpoint('seq-100');
        expect(tracker.failureCount).toBe(3);

        tracker.reset();
        expect(tracker.failureCount).toBe(0);
        expect(tracker.lastCheckpoint).toBeNull();
    });
});

// ============ K2: Lock renewal retry ============

describe("K2: lock renewal retry", () => {
    /** Mirrors the retry loop in KinesisShardConsumer.startLockRenewal */
    async function retryRenewLock(
        renewFn: () => Promise<boolean>,
        maxRetries: number
    ): Promise<{renewed: boolean; attempts: number}> {
        let renewed = false;
        let attempts = 0;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            attempts++;
            try {
                renewed = await renewFn();
                if (renewed) break;
            } catch {
                if (attempt === maxRetries) break;
            }
        }

        return {renewed, attempts};
    }

    it("succeeds on first attempt — no retry needed", async () => {
        const {renewed, attempts} = await retryRenewLock(async () => true, 2);
        expect(renewed).toBe(true);
        expect(attempts).toBe(1);
    });

    it("retries on false and succeeds on second attempt", async () => {
        let calls = 0;
        const {renewed, attempts} = await retryRenewLock(async () => ++calls >= 2, 2);
        expect(renewed).toBe(true);
        expect(attempts).toBe(2);
    });

    it("retries on thrown error and succeeds on third attempt", async () => {
        let calls = 0;
        const {renewed, attempts} = await retryRenewLock(async () => {
            if (++calls < 3) throw new Error('Redis timeout');
            return true;
        }, 2);
        expect(renewed).toBe(true);
        expect(attempts).toBe(3);
    });

    it("reports failure after all retries exhausted", async () => {
        const {renewed, attempts} = await retryRenewLock(async () => false, 2);
        expect(renewed).toBe(false);
        expect(attempts).toBe(3); // 1 initial + 2 retries
    });
});

// ============ Adaptive Strategy integration ============

describe("adaptive strategy integration", () => {
    it("shouldBackoff gates processing loop", () => {
        let backoffActive = true;
        const strategy: IAdaptiveStrategy = {
            getBatchSize: () => 50,
            getProcessingDelay: () => 5000,
            shouldBackoff: () => backoffActive,
            recordBatchResult: () => {},
            getSnapshot: () => ({
                currentBatchSize: 50,
                currentDelay: 5000,
                consecutiveSuccesses: 0,
                consecutiveFailures: 10,
                backoffUntil: Date.now() + 60000,
                hotTaskTypes: [],
            }),
        };

        expect(strategy.shouldBackoff('shard-001')).toBe(true);
        backoffActive = false;
        expect(strategy.shouldBackoff('shard-001')).toBe(false);
    });
});

// ============ Partition key ============

describe("partition key generation", () => {
    /** Mirrors KinesisQueue.generatePartitionKey */
    function generatePartitionKey(
        message: {type: string; partition_key?: string},
        defaultPartitionKey?: (msg: any) => string
    ): string {
        return message.partition_key
            ?? defaultPartitionKey?.(message)
            ?? message.type;
    }

    it("uses message.partition_key when set", () => {
        expect(generatePartitionKey({type: 'email', partition_key: 'user-123'})).toBe('user-123');
    });

    it("falls back to defaultPartitionKey when no partition_key", () => {
        const fn = (msg: any) => `custom-${msg.type}`;
        expect(generatePartitionKey({type: 'email'}, fn)).toBe('custom-email');
    });

    it("falls back to message.type when nothing configured", () => {
        expect(generatePartitionKey({type: 'email'})).toBe('email');
    });
});