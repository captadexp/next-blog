/**
 * Shared constants for Kinesis queue utilities
 *
 * TODO(SCALE-02): Make these configurable via KinesisConfig constructor.
 *   All values are hardcoded, preventing tuning for different workload profiles.
 *   At minimum, PROCESSOR_TIMEOUT_MS, MAX_CONSECUTIVE_ERRORS, and REBALANCE_INTERVAL
 *   should be configurable. BATCH_RECORD_LIMIT (50) is very conservative —
 *   Kinesis allows 10K records / 10MB per GetRecords call.
 */

export const REBALANCE_INTERVAL = 60000; // 1 minute — new instances wait up to 60s to get shards
export const LOCK_RENEWAL_INTERVAL = 15000; // 15 seconds — only 1 attempt before TTL expiry (see K2)
export const LOCK_TTL_MS = 35000; // 35 seconds — barely above 2 * LOCK_RENEWAL_INTERVAL. Tight margin.
export const PROCESSING_DELAY = 5000; // Delay when no records found
export const MAX_CONSECUTIVE_ERRORS = 5; // Too aggressive for throttle errors (see K3)
export const PROCESSOR_TIMEOUT_MS = 300000; // 5 minutes
export const BATCH_RECORD_LIMIT = 50; // Max records per GetRecords call (Kinesis max is 10K)
export const MAX_SHARDS_PER_BATCH = 3; // Max shards to process in processBatch