/**
 * RFC-002: In-Memory Flow Barrier Provider
 *
 * Map-based implementation matching Redis Lua HSETNX dedup semantics.
 * Used for testing; production uses RedisFlowBarrierProvider.
 */

import type {FlowStepResult} from "./types.js";
import type {BarrierDecrementResult, IFlowBarrierProvider} from "./IFlowBarrierProvider.js";

interface FlowBarrierState {
    remaining: number;
    status: 'active' | 'aborted' | 'complete';
    results: Map<number, FlowStepResult>;
    started_at: Date;
}

export class InMemoryFlowBarrierProvider implements IFlowBarrierProvider {
    private readonly barriers = new Map<string, FlowBarrierState>();

    async initBarrier(flowId: string, totalSteps: number): Promise<void> {
        // Idempotent: no-op if barrier already exists (matches Redis SETNX semantics)
        if (this.barriers.has(flowId)) return;
        this.barriers.set(flowId, {
            remaining: totalSteps,
            status: 'active',
            results: new Map(),
            started_at: new Date(),
        });
    }

    async batchDecrementAndCheck(flowId: string, results: FlowStepResult[]): Promise<BarrierDecrementResult> {
        const state = this.barriers.get(flowId);
        if (!state) {
            return {remaining: -1};
        }

        // If already aborted or complete, late arrivals get -1
        if (state.status === 'aborted' || state.status === 'complete') {
            return {remaining: -1};
        }

        // HSETNX semantics: only count genuinely new step indices
        let actualNew = 0;
        for (const result of results) {
            if (!state.results.has(result.step_index)) {
                state.results.set(result.step_index, result);
                actualNew++;
            }
        }

        state.remaining -= actualNew;

        if (state.remaining <= 0) {
            state.remaining = 0;
            state.status = 'complete';
        }

        return {remaining: state.remaining};
    }

    async getStepResults(flowId: string): Promise<FlowStepResult[]> {
        const state = this.barriers.get(flowId);
        if (!state) return [];
        return Array.from(state.results.values()).sort((a, b) => a.step_index - b.step_index);
    }

    async markAborted(flowId: string): Promise<boolean> {
        const state = this.barriers.get(flowId);
        if (!state) return false;

        if (state.status === 'aborted') {
            return false; // Already aborted
        }

        state.status = 'aborted';
        return true;
    }

    async isComplete(flowId: string): Promise<boolean> {
        const state = this.barriers.get(flowId);
        if (!state) return false;
        return state.status === 'complete';
    }

    async getStartedAt(flowId: string): Promise<Date | null> {
        const state = this.barriers.get(flowId);
        if (!state) return null;
        return state.started_at;
    }
}
