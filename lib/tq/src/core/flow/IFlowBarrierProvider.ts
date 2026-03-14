/**
 * RFC-002: Flow Barrier Provider Interface
 *
 * Tracks step completion for fan-out/fan-in flows.
 * The barrier decrements as steps complete and signals when
 * all steps are done (or the flow is aborted/timed out).
 */

import type {FlowStepResult} from "./types.js";

/** Result of a batchDecrementAndCheck call */
export interface BarrierDecrementResult {
    /**
     * Number of steps remaining after this decrement.
     * 0 = barrier met (all steps done).
     * -1 = flow was already aborted or completed (late arrival).
     */
    remaining: number;
}

/**
 * Provider interface for flow barrier operations.
 * Implementations must guarantee HSETNX-style dedup:
 * a step_index can only decrement the counter once.
 */
export interface IFlowBarrierProvider {
    /**
     * Initialize a barrier for a new flow.
     * @param flowId Unique flow identifier
     * @param totalSteps Total number of steps to wait for
     */
    initBarrier(flowId: string, totalSteps: number): Promise<void>;

    /**
     * Record step results and decrement the barrier.
     * Uses HSETNX semantics: duplicate step_index submissions are ignored
     * (counter only decrements by the number of genuinely new steps).
     *
     * @param flowId Flow identifier
     * @param results Step results to record
     * @returns remaining count (0 = complete, -1 = aborted/already complete)
     */
    batchDecrementAndCheck(flowId: string, results: FlowStepResult[]): Promise<BarrierDecrementResult>;

    /**
     * Get all recorded step results for a flow.
     */
    getStepResults(flowId: string): Promise<FlowStepResult[]>;

    /**
     * Mark a flow as aborted. Returns true if this is the first abort call.
     * Subsequent calls return false (idempotent).
     */
    markAborted(flowId: string): Promise<boolean>;

    /**
     * Check if a flow's barrier has been fully met (remaining = 0).
     */
    isComplete(flowId: string): Promise<boolean>;

    /**
     * Get the time when a flow's barrier was initialized.
     */
    getStartedAt(flowId: string): Promise<Date | null>;
}
