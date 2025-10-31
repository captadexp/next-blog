/**
 * Shared constants for Kinesis queue utilities
 */

export const REBALANCE_INTERVAL = 60000; // 1 minute
export const LOCK_RENEWAL_INTERVAL = 15000; // 15 seconds - Should be less than lockTTLMs / 2
export const LOCK_TTL_MS = 35000; // 35 seconds - Lock Time-To-Live (MUST be > LOCK_RENEWAL_INTERVAL * 2)
export const PROCESSING_DELAY = 5000; // Delay when no records found
export const MAX_CONSECUTIVE_ERRORS = 5; // Threshold to stop processing on repeated errors
export const PROCESSOR_TIMEOUT_MS = 300000; // 5 minutes
export const BATCH_RECORD_LIMIT = 50; // Max records per GetRecords call
export const MAX_SHARDS_PER_BATCH = 3; // Max shards to process in processBatch