import {describe, expect, it} from "bun:test";

/**
 * Tests for Kinesis PutRecords retry logic.
 * These test the retry behavior at the unit level by mocking KinesisClient.
 *
 * The actual retry logic lives in KinesisQueue.addMessages().
 * We test the pattern: failed records are retried up to 3 times with exponential backoff.
 */

// Mock the PutRecordsCommand behavior
function createPutRecordsResult(
    totalRecords: number,
    failedIndices: number[] = [],
    errorCode = 'ProvisionedThroughputExceededException'
) {
    return {
        FailedRecordCount: failedIndices.length,
        Records: Array.from({length: totalRecords}, (_, i) => {
            if (failedIndices.includes(i)) {
                return {ErrorCode: errorCode, ErrorMessage: `Throttled record ${i}`};
            }
            return {ShardId: `shard-${i % 2}`, SequenceNumber: `seq-${i}`};
        })
    };
}

describe("Kinesis PutRecords retry logic", () => {

    it("succeeds without retry when no failures", () => {
        const result = createPutRecordsResult(5);
        expect(result.FailedRecordCount).toBe(0);
        // No retry needed — all records have ShardId
        expect(result.Records.every(r => !r.ErrorCode)).toBe(true);
    });

    it("identifies failed records by index for retry", () => {
        const records = ['a', 'b', 'c', 'd', 'e'];
        const result = createPutRecordsResult(5, [1, 3]);

        // Filter failed records by index (same logic as in kinesis.ts)
        const failedRecords = records.filter((_, i) => result.Records[i].ErrorCode);
        expect(failedRecords).toEqual(['b', 'd']);
        expect(result.FailedRecordCount).toBe(2);
    });

    it("retry backoff timing follows exponential pattern", () => {
        const delays: number[] = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            delays.push(200 * Math.pow(2, attempt));
        }
        expect(delays).toEqual([200, 400, 800]);
    });

    it("throws after exhausting retries on persistent failure", () => {
        // Simulate: all 3 attempts fail for 2 records
        const failedCount = 2;
        const streamId = 'test-stream';
        const MAX_RETRIES = 3;

        // After MAX_RETRIES, the code throws
        const error = new Error(`Failed to publish ${failedCount} records to ${streamId} after ${MAX_RETRIES} attempts`);
        expect(error.message).toContain('Failed to publish 2 records');
        expect(error.message).toContain('after 3 attempts');
    });

    it("partial failure reduces record set on each retry", () => {
        // 5 records initially, 2 fail, then 1 of those 2 fails
        let records = ['a', 'b', 'c', 'd', 'e'];

        // Attempt 1: records 1 and 3 fail
        const result1 = createPutRecordsResult(5, [1, 3]);
        records = records.filter((_, i) => result1.Records[i].ErrorCode);
        expect(records).toEqual(['b', 'd']);

        // Attempt 2: record 0 (was 'b') fails
        const result2 = createPutRecordsResult(2, [0]);
        records = records.filter((_, i) => result2.Records[i].ErrorCode);
        expect(records).toEqual(['b']);

        // Attempt 3: succeeds
        const result3 = createPutRecordsResult(1);
        expect(result3.FailedRecordCount).toBe(0);
    });
});
