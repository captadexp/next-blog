import {ExecutorActions} from "./base/interfaces";
import {Logger, LogLevel} from "@supergrowthai/utils";
import {tId} from "../utils/task-id-gen.js";
import {CronTask} from "../adapters";
import type {StartFlowInput, FlowMeta} from "./flow/types.js";
import type {EntityTaskProjection} from "./entity/IEntityProjectionProvider.js";
import type {IFlowLifecycleProvider} from "./lifecycle.js";
import type {QueueName} from "@supergrowthai/mq";
import {randomUUID} from "crypto";

const logger = new Logger('Actions', LogLevel.INFO);

interface ActionEntry<ID = any> {
    type: 'success' | 'fail' | 'addTasks';
    timestamp: number;
    task?: CronTask<ID>;  // The task passed to success/fail
    newTasks?: CronTask<ID>[];     // Tasks to add
    result?: unknown;              // Result from success(task, result)
    error?: Error | string;        // Error from fail(task, error)
    meta?: Record<string, unknown>; // Meta from fail(task, error, meta)
}

interface TaskContext<ID = any> {
    task: CronTask<ID> | null;  // The task being executed (null for batch contexts)
    actions: ActionEntry<ID>[];
}

export interface ActionResults<ID = any> {
    failedTasks: CronTask<ID>[];
    successTasks: CronTask<ID>[];
    newTasks: CronTask<ID>[];
    ignoredTasks: CronTask<ID>[];
    /** RFC-002: Entity projections from startFlow calls (processing status, task_id = flow_id) */
    flowProjections: EntityTaskProjection[];
}

const MAX_RESULT_SIZE_BYTES = 256 * 1024; // 256KB

function validateResultSize(result: unknown): boolean {
    // Fast path: null and non-string primitives are always small
    if (result === null || typeof result === 'number' || typeof result === 'boolean') return true;

    try {
        const json = JSON.stringify(result);
        // json.length is always <= Buffer.byteLength (UTF-8 chars are 1-4 bytes)
        // So if json string length exceeds limit, byte length definitely does too
        if (json.length > MAX_RESULT_SIZE_BYTES) return false;
        return Buffer.byteLength(json, 'utf8') <= MAX_RESULT_SIZE_BYTES;
    } catch {
        // Circular reference or other serialization error
        return false;
    }
}

function enrichTaskWithResult<ID>(task: CronTask<ID>, result: unknown): CronTask<ID> {
    if (result === undefined) return task;
    if (!validateResultSize(result)) return task;  // caller logs warning
    task.execution_result = result;  // mutate in place — tasks are already extracted copies
    return task;
}

function enrichTaskWithError<ID>(task: CronTask<ID>, error?: Error | string, meta?: Record<string, unknown>): CronTask<ID> {
    if (!error && !meta) return task;

    const errorFields: Record<string, unknown> = {};
    if (error instanceof Error) {
        errorFields.last_error = error.message;
        errorFields.last_error_stack = error.stack;
    } else if (typeof error === 'string') {
        errorFields.last_error = error;
    }

    // Mutate in place — tasks are already extracted copies
    task.execution_stats = {
        ...(task.execution_stats || {}),
        ...errorFields,
        ...(meta || {})
    };
    return task;
}

export class Actions<ID = any> implements ExecutorActions<ID> {
    private readonly taskRunnerId: string;
    private readonly taskContexts = new Map<string, TaskContext<ID>>();
    /** RFC-002: Flow projections accumulated from startFlow calls */
    private readonly _flowProjections: EntityTaskProjection[] = [];

    /** Logger for multi-task executors — carries runtime-only context (RFC-005) */
    readonly log: Logger;

    private readonly flowLifecycleProvider?: IFlowLifecycleProvider;
    /** Process identity (hostname-pid-timestamp) for lifecycle events */
    private readonly workerId: string;

    constructor(taskRunnerId: string, flowLifecycleProvider?: IFlowLifecycleProvider, workerId: string = '') {
        this.taskRunnerId = taskRunnerId;
        this.flowLifecycleProvider = flowLifecycleProvider;
        this.workerId = workerId;
        // Root actions logger has no task-specific context — only ALS runtime context applies
        this.log = logger.child({});
    }

    /**
     * Fork execution context for a specific task (for single-task executors)
     */
    forkForTask(task: CronTask<ID>): ExecutorActions<ID> {
        const taskId = tId(task);
        const parentLogContext = task.metadata?.log_context;

        // Initialize context for this task
        const context: TaskContext<ID> = {task, actions: []};
        this.taskContexts.set(taskId, context);

        // Create child logger scoped to this task's log_context (RFC-005)
        const taskLog = logger.child(parentLogContext || {});

        // Return a scoped actions object that tracks everything in this context
        return {
            log: taskLog,

            fail: (t: CronTask<ID>, error?: Error | string, meta?: Record<string, unknown>) => {
                context.actions.push({
                    type: 'fail',
                    timestamp: Date.now(),
                    task: t,
                    error,
                    meta
                });
                logger.error(`[${this.taskRunnerId}] Task failed: ${tId(t)} (${t.type})`);
            },

            success: (t: CronTask<ID>, result?: unknown) => {
                context.actions.push({
                    type: 'success',
                    timestamp: Date.now(),
                    task: t,
                    result
                });
                logger.info(`[${this.taskRunnerId}] Task succeeded: ${tId(t)} (${t.type})`);
            },

            addTasks: (tasks: CronTask<ID>[]) => {
                // Merge parent log_context onto child tasks (RFC-005: parent keys as defaults, child wins)
                const mergedTasks = parentLogContext
                    ? tasks.map(t => ({
                        ...t,
                        metadata: {
                            ...(t.metadata || {}),
                            log_context: {...parentLogContext, ...(t.metadata?.log_context || {})}
                        }
                    }))
                    : tasks;

                context.actions.push({
                    type: 'addTasks',
                    timestamp: Date.now(),
                    newTasks: mergedTasks
                });
                logger.info(`[${this.taskRunnerId}] Task ${taskId} adding ${tasks.length} new tasks`);
            },

            startFlow: (input: StartFlowInput): string => {
                return this._startFlowImpl(input, parentLogContext);
            }
        };
    }

    // For multi-task executors - they use the root Actions directly (no forking)
    fail(task: CronTask<ID>, error?: Error | string, meta?: Record<string, unknown>): void {
        const taskId = tId(task);
        let context = this.taskContexts.get(taskId);
        if (!context) {
            context = {task, actions: []};
            this.taskContexts.set(taskId, context);
        }

        context!.actions.push({
            type: 'fail',
            timestamp: Date.now(),
            task,
            error,
            meta
        });
        logger.error(`[${this.taskRunnerId}] Task failed: ${taskId} (${task.type})`);
    }

    success(task: CronTask<ID>, result?: unknown): void {
        const taskId = tId(task);
        let context = this.taskContexts.get(taskId);
        if (!context) {
            context = {task, actions: []};
            this.taskContexts.set(taskId, context);
        }

        context.actions.push({
            type: 'success',
            timestamp: Date.now(),
            task,
            result
        });
        logger.info(`[${this.taskRunnerId}] Task succeeded: ${taskId} (${task.type})`);
    }

    // TODO(P1): Add configurable max child tasks per execution (e.g., 1000).
    //   A buggy executor can call addTasks() with unbounded entries, all in memory.
    //   Each child can spawn more children — unbounded amplification risk.
    addTasks(tasks: CronTask<ID>[]): void {
        // For multi-task mode, store in a batch-specific context
        logger.info(`[${this.taskRunnerId}] Adding ${tasks.length} new tasks`);

        const batchKey = `__batch_${this.taskRunnerId}__`;
        let batchContext = this.taskContexts.get(batchKey);
        if (!batchContext) {
            batchContext = {task: null, actions: []};
            this.taskContexts.set(batchKey, batchContext);
        }
        batchContext.actions.push({
            type: 'addTasks',
            timestamp: Date.now(),
            newTasks: tasks
        });
    }

    addIgnoredTask(task: CronTask<ID>): void {
        const taskId = tId(task);
        this.taskContexts.set(taskId, {task, actions: []});
        logger.warn(`[${this.taskRunnerId}] Task ignored: ${taskId} (${task.type})`);
    }

    /**
     * RFC-002: Start a fan-out/fan-in flow from the root Actions context (multi-task executors).
     */
    startFlow(input: StartFlowInput): string {
        return this._startFlowImpl(input);
    }

    /**
     * RFC-002: Internal implementation for startFlow.
     * Used by both root Actions and forked per-task actions.
     */
    private _startFlowImpl(input: StartFlowInput, parentLogContext?: Record<string, string>): string {
        const {steps, config} = input;

        if (steps.length === 0) {
            throw new Error('[TQ/RFC-002] startFlow requires at least 1 step');
        }

        const flowId = randomUUID();
        const now = new Date();
        const failurePolicy = config.failure_policy || 'continue';

        const stepTasks: CronTask<ID>[] = steps.map((step, index) => {
            const flowMeta: FlowMeta = {
                flow_id: flowId,
                step_index: index,
                total_steps: steps.length,
                join: config.join,
                failure_policy: failurePolicy,
                ...(config.entity ? {entity: config.entity} : {}),
            };

            const metadata: Record<string, unknown> = {
                flow_meta: flowMeta as unknown as Record<string, unknown>,
            };

            // Inherit parent log_context onto step tasks (RFC-005)
            if (parentLogContext) {
                (metadata as any).log_context = {...parentLogContext};
            }

            return {
                type: step.type,
                queue_id: step.queue_id as QueueName,
                payload: step.payload,
                execute_at: now,
                status: 'scheduled' as const,
                created_at: now,
                updated_at: now,
                force_store: true,
                metadata,
                ...(step.entity ? {entity: step.entity} : {}),
            } as CronTask<ID>;
        });

        // Create timeout sentinel if configured
        if (config.timeout_ms && config.timeout_ms > 0) {
            const timeoutFlowMeta: FlowMeta = {
                flow_id: flowId,
                step_index: -1,
                total_steps: steps.length,
                join: config.join,
                failure_policy: failurePolicy,
                is_timeout: true,
                ...(config.entity ? {entity: config.entity} : {}),
            };

            stepTasks.push({
                type: '_flow.timeout',
                queue_id: config.join.queue_id as QueueName,
                payload: {flow_id: flowId, is_timeout: true},
                execute_at: new Date(now.getTime() + config.timeout_ms),
                status: 'scheduled' as const,
                created_at: now,
                updated_at: now,
                force_store: true,
                metadata: {
                    flow_meta: timeoutFlowMeta as unknown as Record<string, unknown>,
                    ...(parentLogContext ? {log_context: {...parentLogContext}} : {}),
                },
            } as unknown as CronTask<ID>);
        }

        // Add step tasks via the existing addTasks mechanism
        this.addTasks(stepTasks);

        // RFC-002 + RFC-003: If entity present, emit a 'processing' projection with flow_id as task_id
        if (config.entity) {
            this._flowProjections.push({
                task_id: flowId,
                entity_id: config.entity.id,
                entity_type: config.entity.type,
                task_type: config.join.type,
                queue_id: config.join.queue_id,
                status: 'processing',
                created_at: now,
                updated_at: now,
            });
        }

        logger.info(`[${this.taskRunnerId}] Started flow ${flowId} with ${steps.length} steps, join: ${config.join.type}`);

        // Emit onFlowStarted lifecycle event
        if (this.flowLifecycleProvider?.onFlowStarted) {
            try {
                const result = this.flowLifecycleProvider.onFlowStarted({
                    flow_id: flowId,
                    total_steps: steps.length,
                    join: config.join,
                    failure_policy: failurePolicy,
                    entity: config.entity,
                    worker_id: this.workerId,
                    consumer_id: this.taskRunnerId,
                    started_at: now,
                    step_types: steps.map(s => s.type),
                });
                if (result instanceof Promise) {
                    result.catch(err => logger.error(`[TQ] Flow lifecycle onFlowStarted error: ${err}`));
                }
            } catch (err) {
                logger.error(`[TQ] Flow lifecycle onFlowStarted error: ${err}`);
            }
        }

        return flowId;
    }

    /**
     * Check the result status for a specific task
     * Returns 'success', 'fail', or 'pending' (no action recorded yet)
     */
    getTaskResultStatus(taskId: string): 'success' | 'fail' | 'pending' {
        const context = this.taskContexts.get(taskId);
        if (!context) return 'pending';

        for (const action of context.actions) {
            if (action.type === 'success') return 'success';
            if (action.type === 'fail') return 'fail';
        }
        return 'pending';
    }

    /**
     * Extract actions for a single task (used by async tasks)
     */
    extractTaskActions(taskId: string): ActionResults<ID> {
        const results: ActionResults<ID> = {
            failedTasks: [],
            successTasks: [],
            newTasks: [],
            ignoredTasks: [],
            flowProjections: []
        };

        const context = this.taskContexts.get(taskId);
        if (!context) return results;

        if (context.actions.length === 0 && context.task) {
            // No actions = ignored task
            results.ignoredTasks.push(context.task);
        } else {
            // Process all actions
            for (const action of context.actions) {
                if (action.type === 'success' && action.task) {
                    if (action.result !== undefined && !validateResultSize(action.result)) {
                        logger.warn(`[${this.taskRunnerId}] Result for task ${tId(action.task)} exceeds size limit, dropping result`);
                    }
                    results.successTasks.push(enrichTaskWithResult(action.task, action.result));
                    // If marking a different task, remove its context
                    const targetTaskId = tId(action.task);
                    if (targetTaskId !== taskId) {
                        this.taskContexts.delete(targetTaskId);
                    }
                } else if (action.type === 'fail' && action.task) {
                    results.failedTasks.push(enrichTaskWithError(action.task, action.error, action.meta));
                    const targetTaskId = tId(action.task);
                    if (targetTaskId !== taskId) {
                        this.taskContexts.delete(targetTaskId);
                    }
                } else if (action.type === 'addTasks' && action.newTasks) {
                    results.newTasks.push(...action.newTasks);
                }
            }
        }

        this.taskContexts.delete(taskId);
        return results;
    }

    /**
     * Extract sync results including batch context (for sync processing)
     */
    extractSyncResults(excludeTaskIds: string[]): ActionResults<ID> {
        const results: ActionResults<ID> = {
            failedTasks: [],
            successTasks: [],
            newTasks: [],
            ignoredTasks: [],
            flowProjections: [...this._flowProjections]
        };

        const excludeSet = new Set(excludeTaskIds);
        const batchKey = `__batch_${this.taskRunnerId}__`;

        // Process all task contexts except excluded ones
        for (const [taskId, context] of this.taskContexts) {
            if (excludeSet.has(taskId)) continue;

            if (taskId === batchKey) {
                // Batch context - only has addTasks
                for (const action of context.actions) {
                    if (action.type === 'addTasks' && action.newTasks) {
                        results.newTasks.push(...action.newTasks);
                    }
                }
            } else {
                // Regular task context
                if (context.actions.length === 0 && context.task) {
                    results.ignoredTasks.push(context.task);
                } else {
                    for (const action of context.actions) {
                        if (action.type === 'success' && action.task) {
                            if (action.result !== undefined && !validateResultSize(action.result)) {
                                logger.warn(`[${this.taskRunnerId}] Result for task ${tId(action.task)} exceeds size limit, dropping result`);
                            }
                            results.successTasks.push(enrichTaskWithResult(action.task, action.result));
                        } else if (action.type === 'fail' && action.task) {
                            results.failedTasks.push(enrichTaskWithError(action.task, action.error, action.meta));
                        } else if (action.type === 'addTasks' && action.newTasks) {
                            results.newTasks.push(...action.newTasks);
                        }
                    }
                }
            }
        }

        // Clear processed contexts
        for (const [taskId] of this.taskContexts) {
            if (!excludeSet.has(taskId)) {
                this.taskContexts.delete(taskId);
            }
        }

        // Clear flow projections after extraction
        this._flowProjections.length = 0;

        return results;
    }

    /**
     * Get all results (mainly for backward compatibility)
     */
    getResults(): ActionResults<ID> {
        return this.extractSyncResults([]);
    }

    /**
     * Get the result for a specific task (before extraction).
     * Used by TaskRunner to pass results to lifecycle events.
     */
    getTaskResult(taskId: string): unknown | undefined {
        const context = this.taskContexts.get(taskId);
        if (!context) return undefined;

        for (const action of context.actions) {
            if (action.type === 'success' && action.result !== undefined) {
                return action.result;
            }
        }
        return undefined;
    }
}