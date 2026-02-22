/**
 * Consumer-side adaptive processing strategy.
 * Constructor-injected into KinesisQueue. Plain functions that return
 * different values at different times based on internal AIMD state.
 *
 * All methods are consumer-local — no cross-server coordination needed.
 */
export interface IAdaptiveStrategy {
    /** AIMD-controlled batch size per shard. Default: BATCH_RECORD_LIMIT (50) */
    getBatchSize(shardId: string): number;

    /** Adaptive delay when no records found. Increases on errors, decreases on success. */
    getProcessingDelay(shardId: string): number;

    /** Should this shard skip processing? (circuit-breaker-lite: backs off on consecutive errors) */
    shouldBackoff(shardId: string): boolean;

    /** Feed consumer-side metrics back into the adapter */
    recordBatchResult(result: BatchResult): void;

    /** Observability snapshot for notifiers/lifecycle events */
    getSnapshot(shardId?: string): AdaptiveSnapshot;
}

export interface BatchResult {
    shardId: string;
    recordCount: number;
    successCount: number;
    failureCount: number;
    processingTimeMs: number;
    taskTypes: string[];
    failedTaskTypes: string[];
    throttled: boolean;
    poisonPill: boolean;
}

export interface AdaptiveSnapshot {
    shardId?: string;
    currentBatchSize: number;
    currentDelay: number;
    consecutiveSuccesses: number;
    consecutiveFailures: number;
    backoffUntil: number | null;
    hotTaskTypes: string[];
}
