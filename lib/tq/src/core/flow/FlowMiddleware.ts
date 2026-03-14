/**
 * RFC-002: Flow Middleware
 *
 * Post-processing hook that tracks flow step completion via the barrier provider
 * and dispatches join tasks when all steps are done (or on abort/timeout).
 */

import type {CronTask} from "../../adapters/types.js";
import type {FlowMeta, FlowResults, FlowStepResult} from "./types.js";
import type {IFlowBarrierProvider} from "./IFlowBarrierProvider.js";
import type {EntityTaskProjection} from "../entity/IEntityProjectionProvider.js";
import {buildProjection} from "../entity/IEntityProjectionProvider.js";
import type {IFlowLifecycleProvider, FlowContext} from "../lifecycle.js";
import type {QueueName} from "@supergrowthai/mq";

export interface FlowPostProcessInput<ID> {
    successTasks: CronTask<ID>[];
    failedTasks: CronTask<ID>[];
}

export interface FlowPostProcessResult<ID> {
    joinTasks: CronTask<ID>[];
    projections: EntityTaskProjection<ID>[];
}

/** Extract FlowMeta from task metadata, cast through unknown for type safety */
function getFlowMeta(task: CronTask<any>): FlowMeta | undefined {
    return task.metadata?.flow_meta as unknown as FlowMeta | undefined;
}

/** Extract FlowMeta from task metadata (non-null assertion — caller has already checked) */
function getFlowMetaRequired(task: CronTask<any>): FlowMeta {
    return task.metadata!.flow_meta as unknown as FlowMeta;
}

export class FlowMiddleware<ID> {
    constructor(
        private readonly barrierProvider: IFlowBarrierProvider,
        private readonly generateId: () => ID,
        private readonly flowLifecycleProvider?: IFlowLifecycleProvider,
        private readonly workerId: string = '',
    ) {}

    private emitFlowEvent<T>(
        callback: ((ctx: T) => void | Promise<void>) | undefined,
        ctx: T
    ): void {
        if (!callback) return;
        try {
            const result = callback(ctx);
            if (result instanceof Promise) {
                result.catch(() => { /* non-fatal */ });
            }
        } catch {
            // non-fatal
        }
    }

    private buildFlowContext(flowMeta: FlowMeta): FlowContext {
        return {
            flow_id: flowMeta.flow_id,
            total_steps: flowMeta.total_steps,
            join: flowMeta.join,
            failure_policy: flowMeta.failure_policy,
            entity: flowMeta.entity,
            worker_id: this.workerId,
        };
    }

    /**
     * Process completed tasks for flow orchestration.
     * Called from TaskHandler.postProcessTasks after markFailed/markSuccess.
     *
     * @param input Categorized terminal tasks — success and final-failed (no retries left)
     * @returns Join tasks to dispatch and entity projections to sync
     */
    async onPostProcess(input: FlowPostProcessInput<ID>): Promise<FlowPostProcessResult<ID>> {
        const joinTasks: CronTask<ID>[] = [];
        const projections: EntityTaskProjection<ID>[] = [];

        // Use object identity for O(1) success/fail classification
        // (tasks may not have IDs at this point in the pipeline)
        const successTaskSet = new Set<CronTask<ID>>(input.successTasks);

        const allTasks = [...input.successTasks, ...input.failedTasks];

        // Separate flow tasks by role
        const joinCompletions: CronTask<ID>[] = [];
        const timeoutTasks: CronTask<ID>[] = [];
        const stepTasks: { task: CronTask<ID>; isSuccess: boolean }[] = [];

        for (const task of allTasks) {
            const flowMeta = getFlowMeta(task);
            if (!flowMeta) continue;

            const isSuccess = successTaskSet.has(task);

            if (flowMeta.is_join) {
                joinCompletions.push(task);
            } else if (flowMeta.is_timeout) {
                timeoutTasks.push(task);
            } else {
                stepTasks.push({task, isSuccess});
            }
        }

        // 1. Handle completed join tasks — emit entity projections
        for (const task of joinCompletions) {
            const flowMeta = getFlowMetaRequired(task);
            const isSuccess = successTaskSet.has(task);
            if (flowMeta.entity) {
                try {
                    const status = isSuccess ? 'executed' : 'failed';
                    const error = !isSuccess
                        ? (task.execution_stats?.last_error as string || 'Join task failed')
                        : undefined;
                    const p = buildProjection(
                        {
                            ...task,
                            id: flowMeta.flow_id as unknown as ID,
                            entity: flowMeta.entity,
                        },
                        status,
                        {result: task.execution_result, error}
                    );
                    if (p) projections.push(p);
                } catch {
                    // Non-fatal: projection build can fail if no ID
                }
            }
        }

        // 2. Handle timeout sentinel tasks
        for (const task of timeoutTasks) {
            const flowMeta = getFlowMetaRequired(task);
            const flowId = flowMeta.flow_id;

            // Auto-init barrier if not yet created (timeout can fire before any step completes)
            await this.barrierProvider.initBarrier(flowId, flowMeta.total_steps);

            // Check if flow already completed
            const isComplete = await this.barrierProvider.isComplete(flowId);
            if (isComplete) continue; // No-op: flow already done

            // Flow not complete — abort and dispatch join with partial results
            const isFirstAbort = await this.barrierProvider.markAborted(flowId);
            if (!isFirstAbort) continue; // Already aborted by step failure — no duplicate join
            const partialResults = await this.barrierProvider.getStepResults(flowId);

            const flowResults: FlowResults = {
                flow_id: flowId,
                steps: partialResults,
                timed_out: true,
            };

            const joinTask = this.buildJoinTask(flowMeta, flowResults);
            joinTasks.push(joinTask);

            // Emit onFlowTimedOut
            if (this.flowLifecycleProvider?.onFlowTimedOut) {
                const startedAt = await this.barrierProvider.getStartedAt(flowId);
                const durationMs = startedAt ? Date.now() - startedAt.getTime() : 0;
                this.emitFlowEvent(this.flowLifecycleProvider.onFlowTimedOut, {
                    ...this.buildFlowContext(flowMeta),
                    duration_ms: durationMs,
                    steps_completed: partialResults.length,
                });
            }

            // Entity projection for timeout
            if (flowMeta.entity) {
                try {
                    const p = buildProjection(
                        {
                            ...joinTask,
                            id: flowId as unknown as ID,
                            entity: flowMeta.entity,
                        },
                        'failed',
                        {error: 'flow_timeout'}
                    );
                    if (p) projections.push(p);
                } catch {
                    // Non-fatal
                }
            }
        }

        // 3. Handle step tasks — group by flow_id, batchDecrementAndCheck once per group
        const stepsByFlow = new Map<string, { task: CronTask<ID>; isSuccess: boolean }[]>();
        for (const entry of stepTasks) {
            const flowMeta = getFlowMetaRequired(entry.task);
            const group = stepsByFlow.get(flowMeta.flow_id) || [];
            group.push(entry);
            stepsByFlow.set(flowMeta.flow_id, group);
        }

        for (const [flowId, entries] of stepsByFlow) {
            const firstFlowMeta = getFlowMetaRequired(entries[0].task);

            // Auto-init barrier if not yet created (idempotent — no-op if exists)
            await this.barrierProvider.initBarrier(flowId, firstFlowMeta.total_steps);

            // Check for abort policy: if any step failed and policy is 'abort'
            if (firstFlowMeta.failure_policy === 'abort') {
                const hasFailure = entries.some(e => !e.isSuccess);

                if (hasFailure) {
                    const isFirstAbort = await this.barrierProvider.markAborted(flowId);
                    if (isFirstAbort) {
                        // Record results for the steps we have, then dispatch join
                        const stepResults = this.buildStepResults(entries);
                        await this.barrierProvider.batchDecrementAndCheck(flowId, stepResults);
                        const allResults = await this.barrierProvider.getStepResults(flowId);

                        const flowResults: FlowResults = {
                            flow_id: flowId,
                            steps: allResults,
                            aborted: true,
                        };

                        const joinTask = this.buildJoinTask(firstFlowMeta, flowResults);
                        joinTasks.push(joinTask);

                        // Emit onFlowAborted
                        if (this.flowLifecycleProvider?.onFlowAborted) {
                            const startedAt = await this.barrierProvider.getStartedAt(flowId);
                            const durationMs = startedAt ? Date.now() - startedAt.getTime() : 0;
                            const failedEntry = entries.find(e => !e.isSuccess);
                            const triggerIndex = failedEntry
                                ? (failedEntry.task.metadata?.flow_meta as unknown as FlowMeta)?.step_index ?? -1
                                : -1;
                            this.emitFlowEvent(this.flowLifecycleProvider.onFlowAborted, {
                                ...this.buildFlowContext(firstFlowMeta),
                                duration_ms: durationMs,
                                steps_completed: allResults.length,
                                trigger_step_index: triggerIndex,
                            });
                        }

                        // Entity projection for abort
                        if (firstFlowMeta.entity) {
                            try {
                                const p = buildProjection(
                                    {
                                        ...joinTask,
                                        id: flowId as unknown as ID,
                                        entity: firstFlowMeta.entity,
                                    },
                                    'failed',
                                    {error: 'flow_aborted'}
                                );
                                if (p) projections.push(p);
                            } catch {
                                // Non-fatal
                            }
                        }
                    }
                    // Else: already aborted, skip (no second join)
                    continue;
                }
            }

            // Normal path: record results and check barrier
            const stepResults = this.buildStepResults(entries);
            const {remaining} = await this.barrierProvider.batchDecrementAndCheck(flowId, stepResults);

            if (remaining === 0) {
                // Barrier met — dispatch join task
                const allResults = await this.barrierProvider.getStepResults(flowId);

                const flowResults: FlowResults = {
                    flow_id: flowId,
                    steps: allResults,
                };

                const joinTask = this.buildJoinTask(firstFlowMeta, flowResults);
                joinTasks.push(joinTask);

                // Emit onFlowCompleted
                if (this.flowLifecycleProvider?.onFlowCompleted) {
                    const startedAt = await this.barrierProvider.getStartedAt(flowId);
                    const durationMs = startedAt ? Date.now() - startedAt.getTime() : 0;
                    const stepsSucceeded = allResults.filter(r => r.status === 'success').length;
                    const stepsFailed = allResults.filter(r => r.status === 'fail').length;
                    this.emitFlowEvent(this.flowLifecycleProvider.onFlowCompleted, {
                        ...this.buildFlowContext(firstFlowMeta),
                        duration_ms: durationMs,
                        steps_succeeded: stepsSucceeded,
                        steps_failed: stepsFailed,
                    });
                }
            }
            // remaining > 0: not yet complete, wait for more steps
            // remaining === -1: late arrival (already aborted/completed), ignore
        }

        return {joinTasks, projections};
    }

    private buildStepResults(entries: { task: CronTask<ID>; isSuccess: boolean }[]): FlowStepResult[] {
        return entries.map(({task, isSuccess}) => {
            const flowMeta = getFlowMetaRequired(task);
            return {
                step_index: flowMeta.step_index,
                status: isSuccess ? 'success' as const : 'fail' as const,
                result: task.execution_result,
                error: !isSuccess
                    ? (task.execution_stats?.last_error as string || 'Step failed')
                    : undefined,
            };
        });
    }

    private buildJoinTask(flowMeta: FlowMeta, flowResults: FlowResults): CronTask<ID> {
        const now = new Date();
        const joinFlowMeta: FlowMeta = {
            ...flowMeta,
            is_join: true,
            is_timeout: undefined,
            step_index: -1,
        };

        return {
            id: this.generateId(),
            type: flowMeta.join.type,
            queue_id: flowMeta.join.queue_id as QueueName,
            payload: {flow_results: flowResults},
            execute_at: now,
            status: 'scheduled',
            created_at: now,
            updated_at: now,
            force_store: true,
            metadata: {
                flow_meta: joinFlowMeta as unknown as Record<string, unknown>,
            },
            ...(flowMeta.entity ? {entity: flowMeta.entity} : {}),
        } as unknown as CronTask<ID>;
    }
}