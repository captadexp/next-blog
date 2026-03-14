import chunk from "lodash/chunk";
import {Logger, LogLevel} from "@supergrowthai/utils/server";
import {tId} from "../utils/task-id-gen.js";
import {DisposableLockBatch} from "../utils/disposable-lock.js";
import {TaskType} from "../types.js";
import {ActionResults, Actions} from "./Actions.js";
import {AsyncActions} from "./async/AsyncActions.js";
import {CronTask} from "../adapters";
import {IMessageQueue} from "@supergrowthai/mq";
import {CacheProvider} from "memoose-js";
import {LockManager} from "@supergrowthai/utils";
import {TaskQueuesManager} from "./TaskQueuesManager";
import {TaskStore} from "./TaskStore";
import {IAsyncTaskManager} from "./async/async-task-manager";
import type {ITaskLifecycleProvider, IFlowLifecycleProvider, TaskContext, TaskHandlerLifecycleConfig, TaskTiming} from "./lifecycle.js";
import {runWithLogContext} from "./log-context.js";
import type {LogStore} from "./log-context.js";
import type {IEntityProjectionProvider, EntityProjectionConfig, EntityTaskProjection} from "./entity/IEntityProjectionProvider.js";
import {buildProjection, syncProjections} from "./entity/IEntityProjectionProvider.js";
import type {FlowMiddleware} from "./flow/FlowMiddleware.js";

export interface AsyncTask<ID> {
    task: CronTask<ID>;
    promise: Promise<void>;
    startTime: number;
    actions: AsyncActions<ID>;
}

export interface TaskRunnerOptions<ID> {
    messageQueue: IMessageQueue<ID>;
    taskQueue: TaskQueuesManager<ID>;
    taskStore: TaskStore<ID>;
    cacheProvider: CacheProvider<any>;
    generateId: () => ID;
    lifecycleProvider?: ITaskLifecycleProvider;
    lifecycleConfig?: TaskHandlerLifecycleConfig;
    entityProjection?: IEntityProjectionProvider<ID>;
    entityProjectionConfig?: EntityProjectionConfig;
    flowMiddleware?: FlowMiddleware<ID>;
    flowLifecycleProvider?: IFlowLifecycleProvider;
    /** Process identity (hostname-pid-timestamp) for lifecycle events */
    workerId?: string;
}

export class TaskRunner<ID> {
    private readonly logger: Logger;
    private lockManager: LockManager;
    private readonly taskStartTimes = new Map<string, number>();

    private messageQueue: IMessageQueue<ID>;
    private taskQueue: TaskQueuesManager<ID>;
    private taskStore: TaskStore<ID>;
    private generateId: () => ID;
    private lifecycleProvider?: ITaskLifecycleProvider;
    private lifecycleConfig?: TaskHandlerLifecycleConfig;
    private entityProjection?: IEntityProjectionProvider<ID>;
    private entityProjectionConfig?: EntityProjectionConfig;
    private flowMiddleware?: FlowMiddleware<ID>;
    private flowLifecycleProvider?: IFlowLifecycleProvider;
    private readonly workerId: string;

    constructor(opts: TaskRunnerOptions<ID>) {
        const {
            messageQueue,
            taskQueue,
            taskStore,
            cacheProvider,
            generateId,
            lifecycleProvider,
            lifecycleConfig,
            entityProjection,
            entityProjectionConfig,
            flowMiddleware,
            flowLifecycleProvider,
            workerId = '',
        } = opts;

        this.messageQueue = messageQueue;
        this.taskQueue = taskQueue;
        this.taskStore = taskStore;
        this.generateId = generateId;
        this.lifecycleProvider = lifecycleProvider;
        this.lifecycleConfig = lifecycleConfig;
        this.entityProjection = entityProjection;
        this.entityProjectionConfig = entityProjectionConfig;
        this.flowMiddleware = flowMiddleware;
        this.flowLifecycleProvider = flowLifecycleProvider;
        this.workerId = workerId;

        this.logger = new Logger('TaskRunner', LogLevel.INFO);
        this.lockManager = new LockManager(cacheProvider, {
            prefix: "task_lock_",
            defaultTimeout: 30 * 60
        });
    }

    // ============ Log Context Helpers (RFC-005) ============

    /**
     * Build ALS log store for a single task execution.
     * Runtime keys (task_id, task_type, worker_id) override user-supplied log_context.
     */
    private buildLogStore(task: CronTask<ID>, workerId: string): LogStore {
        return {
            ...(task.metadata?.log_context || {}),
            task_id: task.id?.toString() || tId(task),
            task_type: task.type,
            worker_id: workerId,
        };
    }

    /**
     * Build ALS log store for a multi-task (batch) execution.
     * Only runtime keys — no user log_context (ambiguous across tasks).
     */
    private buildBatchLogStore(tasks: CronTask<ID>[], workerId: string): LogStore {
        return {
            worker_id: workerId,
            batch_size: String(tasks.length),
        };
    }

    // ============ Lifecycle Helpers ============

    async run(
        taskRunnerId: string,
        tasksRaw: Array<CronTask<ID>>,
        asyncTaskManager?: IAsyncTaskManager,
        abortSignal?: AbortSignal
    ): Promise<ActionResults<ID> & { asyncTasks: AsyncTask<ID>[] }> {
        this.logger.info(`[${taskRunnerId}] Starting task runner`);
        this.logger.info(`[${taskRunnerId}] Processing ${tasksRaw.length} provided tasks`);

        if (abortSignal?.aborted) {
            this.logger.info(`[${taskRunnerId}] AbortSignal already aborted, returning empty results`);
            return {successTasks: [], failedTasks: [], newTasks: [], ignoredTasks: [], asyncTasks: [], flowProjections: []};
        }

        const tasks = await this.lockManager.filterLocked(tasksRaw, tId);

        this.logger.info(`[${taskRunnerId}] Found ${tasks.length} not locked tasks to process`);

        // Use DisposableLockBatch with await using for automatic lock cleanup
        // This ensures locks are ALWAYS released, even on exceptions or early returns
            await using locks = new DisposableLockBatch(
                this.lockManager,
                (lockId, err) => this.logger.error(`[${taskRunnerId}] Failed to release lock ${lockId}:`, err)
            );

        for (const task of tasks) {
            await locks.acquire(tId(task));
        }

        const groupedTasksObject = tasks
            .reduce((acc: Record<TaskType, CronTask<ID>[]>, task) => {
                acc[task.type] = acc[task.type] || [];
                acc[task.type].push(task);
                return acc;
            }, {} as Record<TaskType, CronTask<ID>[]>);

        const groupedTasksArray = (Object.keys(groupedTasksObject) as unknown as TaskType[]).reduce((acc: {
            type: TaskType,
            tasks: CronTask<ID>[]
        }[], type: TaskType) => {
            acc.push({type, tasks: groupedTasksObject[type]})
            return acc;
        }, [] as { type: TaskType, tasks: CronTask<ID>[] }[]);

        this.logger.info(`[${taskRunnerId}] Task groups: ${groupedTasksArray.map(g => `${g.type}: ${g.tasks.length}`).join(', ')}`);

        // RFC-003: Emit 'processing' projection for first-attempt entity tasks
        if (this.entityProjection) {
            try {
                const processingProjections = tasks
                    .filter(t => t.entity && !t.execution_stats?.retry_count)
                    .map(t => buildProjection(t, 'processing', {includePayload: this.entityProjectionConfig?.includePayload}))
                    .filter((p): p is EntityTaskProjection<ID> => p !== null);
                await syncProjections(processingProjections, this.entityProjection, this.logger);
            } catch (err) {
                this.logger.error(`[TQ] Entity projection failed (non-fatal): ${err}`);
            }
        }

        const actions = new Actions<ID>(taskRunnerId, this.flowLifecycleProvider, this.workerId);
        const asyncTasks: AsyncTask<ID>[] = [];
        const processedTaskIds = new Set<string>();

        for (let i = 0; i < groupedTasksArray.length; i++) {
            if (abortSignal?.aborted) {
                this.logger.info(`[${taskRunnerId}] AbortSignal detected, stopping task group processing`);
                break;
            }

            const taskGroup = groupedTasksArray[i];
            const firstTask = taskGroup.tasks[0];
            if (!firstTask) {
                this.logger.warn(`[${taskRunnerId}] No tasks found for type: ${taskGroup.type}`);
                continue;
            }
            const executor = this.taskQueue.getExecutor(firstTask.queue_id, taskGroup.type);
            if (!executor) {
                this.logger.warn(`[${taskRunnerId}] No executor found for type: ${taskGroup.type} in queue ${firstTask.queue_id}`);
                for (const task of taskGroup.tasks) {
                    const taskWithId: CronTask<ID> = task.id
                        ? task
                        : {...task, id: this.generateId()};
                    actions.addIgnoredTask(taskWithId);
                }
                continue;
            }

            if (executor.asyncConfig?.handoffTimeout && asyncTaskManager && !asyncTaskManager.canAcceptTask()) {
                this.logger.warn(`[${taskRunnerId}] Async queue full, rescheduling ${taskGroup.tasks.length} ${taskGroup.type} tasks for 3 min later`);

                const rescheduledTasks = taskGroup.tasks.map(task => ({
                    ...task,
                    execute_at: new Date(Date.now() + 180000),
                    status: 'scheduled' as const
                }));

                await this.taskStore.updateTasksForRetry(rescheduledTasks);
                continue;
            }

            // Track that we're processing this task group
            taskGroup.tasks.forEach(task => processedTaskIds.add(tId(task)));

            this.logger.info(`[${taskRunnerId}] Processing ${taskGroup.tasks.length} tasks of type: ${taskGroup.type}`);

            if (executor.multiple) {
                const batchStore = this.buildBatchLogStore(taskGroup.tasks, this.workerId);
                const batchTaskContexts = taskGroup.tasks.map(t => this.buildTaskContext(t, this.workerId, taskRunnerId));
                const batchStartedAt = Date.now();

                // Emit onTaskBatchStarted
                this.emitLifecycleEvent(
                    this.lifecycleProvider?.onTaskBatchStarted,
                    {
                        task_type: taskGroup.type as string,
                        queue_id: firstTask.queue_id,
                        tasks: batchTaskContexts,
                        worker_id: this.workerId,
                        consumer_id: taskRunnerId,
                        started_at: new Date(batchStartedAt),
                    }
                );

                await runWithLogContext(batchStore, () =>
                    executor.onTasks(taskGroup.tasks as any[], actions).catch(err => {
                        this.logger.error(`[${taskRunnerId}] executor.onTasks failed: ${err}`);
                        for (const task of taskGroup.tasks) {
                            if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                                actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                            }
                        }
                    })
                );

                // Emit onTaskBatchCompleted
                const succeeded: string[] = [];
                const failed: string[] = [];
                for (const task of taskGroup.tasks) {
                    const status = actions.getTaskResultStatus(tId(task));
                    if (status === 'success') succeeded.push(tId(task));
                    else if (status === 'fail') failed.push(tId(task));
                    else failed.push(tId(task)); // pending = no explicit call = treat as failed
                }

                this.emitLifecycleEvent(
                    this.lifecycleProvider?.onTaskBatchCompleted,
                    {
                        task_type: taskGroup.type as string,
                        queue_id: firstTask.queue_id,
                        tasks: batchTaskContexts,
                        worker_id: this.workerId,
                        consumer_id: taskRunnerId,
                        succeeded,
                        failed,
                        duration_ms: Date.now() - batchStartedAt,
                    }
                );
            } else {
                if (executor.parallel) {
                    const chunks = chunk(taskGroup.tasks, executor.chunkSize) as CronTask<ID>[][];
                    this.logger.info(`[${taskRunnerId}] Processing in parallel chunks of ${executor.chunkSize}`);
                    for (const taskChunk of chunks) {
                        // Emit onTaskStarted for all tasks in chunk
                        for (const task of taskChunk) {
                            this.emitTaskStarted(task, this.workerId, taskRunnerId);
                        }

                        const chunkPromises: Promise<void>[] = [];
                        for (let j = 0; j < taskChunk.length; j++) {
                            const task = taskChunk[j];
                            const taskActions = actions.forkForTask(task);
                            const logStore = this.buildLogStore(task, this.workerId);
                            chunkPromises.push(runWithLogContext(logStore, () =>
                                executor.onTask(task, taskActions).catch(err => {
                                    this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
                                    if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                                        actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                                    }
                                })
                            ));
                        }
                        await Promise.all(chunkPromises);

                        // Emit completion events for all tasks in chunk
                        for (const task of taskChunk) {
                            const resultStatus = actions.getTaskResultStatus(tId(task));
                            if (resultStatus === 'success') {
                                this.emitTaskCompleted(task, this.workerId, actions.getTaskResult(tId(task)), taskRunnerId);
                            } else if (resultStatus === 'fail') {
                                const retryCount = (task.execution_stats?.retry_count as number) || 0;
                                const maxRetries = task.retries ?? executor.default_retries ?? 0;
                                const willRetry = retryCount < maxRetries;
                                this.emitTaskFailed(task, this.workerId, new Error('Task failed'), willRetry, undefined, taskRunnerId);
                            }
                        }
                    }
                } else {
                    const timeoutMs = executor.asyncConfig?.handoffTimeout;

                    for (let j = 0; j < taskGroup.tasks.length; j++) {
                        const task = taskGroup.tasks[j];

                        if (!timeoutMs) {
                            // Emit onTaskStarted
                            this.emitTaskStarted(task, this.workerId, taskRunnerId);

                            const taskActions = actions.forkForTask(task);
                            const logStore = this.buildLogStore(task, this.workerId);
                            await runWithLogContext(logStore, () =>
                                executor.onTask(task, taskActions).catch(err => {
                                    this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
                                    if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                                        actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                                    }
                                })
                            );

                            // Emit completion event based on result
                            const resultStatus = actions.getTaskResultStatus(tId(task));
                            if (resultStatus === 'success') {
                                this.emitTaskCompleted(task, this.workerId, actions.getTaskResult(tId(task)), taskRunnerId);
                            } else if (resultStatus === 'fail') {
                                const retryCount = (task.execution_stats?.retry_count as number) || 0;
                                const maxRetries = task.retries ?? executor.default_retries ?? 0;
                                const willRetry = retryCount < maxRetries;
                                this.emitTaskFailed(task, this.workerId, new Error('Task failed'), willRetry, undefined, taskRunnerId);
                            }
                        } else {
                            // Emit onTaskStarted for async-capable tasks
                            this.emitTaskStarted(task, this.workerId, taskRunnerId);

                            const startTime = Date.now();
                            let isTimedOut = false;

                            const taskActions = actions.forkForTask(task);
                            const logStore = this.buildLogStore(task, this.workerId);

                            const taskPromise = runWithLogContext(logStore, () =>
                                executor.onTask(task, taskActions).catch(err => {
                                    this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
                                    if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                                        actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                                    }
                                })
                            );

                            let timeoutId: NodeJS.Timeout | undefined;
                            const timeoutPromise = new Promise<'~~~timeout'>(resolve => {
                                timeoutId = setTimeout(() => {
                                    isTimedOut = true;
                                    resolve('~~~timeout');
                                }, timeoutMs);

                                // Support early cancellation via AbortSignal
                                // Note: In real usage, this would come from the task execution context
                                // For now, this is a foundation for future AbortSignal integration
                            });

                            const result = await Promise.race([taskPromise, timeoutPromise]);

                            // Clear the timeout to prevent memory leak
                            if (timeoutId) {
                                clearTimeout(timeoutId);
                            }

                            if (result !== '~~~timeout') {
                                // Task completed before timeout - emit lifecycle event
                                const resultStatus = actions.getTaskResultStatus(tId(task));
                                if (resultStatus === 'success') {
                                    this.emitTaskCompleted(task, this.workerId, actions.getTaskResult(tId(task)), taskRunnerId);
                                } else if (resultStatus === 'fail') {
                                    const retryCount = (task.execution_stats?.retry_count as number) || 0;
                                    const maxRetries = task.retries ?? executor.default_retries ?? 0;
                                    const willRetry = retryCount < maxRetries;
                                    this.emitTaskFailed(task, this.workerId, new Error('Task failed'), willRetry, undefined, taskRunnerId);
                                }
                            }

                            if (result === '~~~timeout') {
                                this.logger.info(`[${taskRunnerId}] Task ${tId(task)} (${task.type}) exceeded ${timeoutMs}ms, marking for async handoff`);

                                if (!asyncTaskManager) {
                                    throw new Error(`Task ${task.type} exceeded timeout but AsyncTaskManager not initialized!`);
                                }

                                if (!task.id) {
                                    this.logger.error(`[${taskRunnerId}] Cannot hand off task without id (type: ${task.type}). Task will continue but won't be tracked.`);
                                } else {
                                    const asyncLifecycleEmitter = this.lifecycleProvider ? {
                                        onCompleted: (t: CronTask<ID>, result?: unknown) => {
                                            this.emitTaskCompleted(t, this.workerId, result, taskRunnerId);
                                        },
                                        onFailed: (t: CronTask<ID>, error: Error, willRetry: boolean) => {
                                            this.emitTaskFailed(t, this.workerId, error, willRetry, undefined, taskRunnerId);
                                        },
                                        onScheduled: (t: CronTask<ID>) => {
                                            if (this.lifecycleProvider?.onTaskScheduled) {
                                                this.emitLifecycleEvent(
                                                    this.lifecycleProvider.onTaskScheduled,
                                                    this.buildTaskContext(t, this.workerId, taskRunnerId)
                                                );
                                            }
                                        }
                                    } : undefined;
                                    const asyncActions = new AsyncActions<ID>(this.messageQueue, this.taskStore, this.taskQueue, actions, task, this.generateId, asyncLifecycleEmitter, this.entityProjection, this.entityProjectionConfig, this.flowMiddleware);

                                    const asyncPromise = taskPromise
                                        .finally(async () => {
                                            try {
                                                await asyncActions.onPromiseFulfilled();
                                            } catch (err) {
                                                this.logger.error(`[${taskRunnerId}] Failed to execute async actions for task ${tId(task)}:`, err);
                                            }
                                        });

                                    asyncTasks.push({
                                        task,
                                        promise: asyncPromise,
                                        startTime,
                                        actions: asyncActions
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        const asyncTaskIds = asyncTasks.map(at => tId(at.task));
        const results = actions.extractSyncResults(asyncTaskIds);

        this.logger.info(`[${taskRunnerId}] Completing run - Success: ${results.successTasks.length}, Failed: ${results.failedTasks.length}, New: ${results.newTasks.length}, Async: ${asyncTasks.length}, Ignored: ${results.ignoredTasks.length}`);

        // Locks are automatically released by DisposableLockBatch via await using
        return {...results, asyncTasks};
    }

    private emitLifecycleEvent<T>(
        callback: ((ctx: T) => void | Promise<void>) | undefined,
        ctx: T
    ): void {
        if (!callback) return;

        try {
            const result = callback(ctx);
            if (result instanceof Promise) {
                result.catch(err => {
                    this.logger.error(`[TQ] Lifecycle callback error: ${err}`);
                });
            }
        } catch (err) {
            this.logger.error(`[TQ] Lifecycle callback error: ${err}`);
        }
    }

    private buildTaskContext(task: CronTask<ID>, workerId?: string, consumerId?: string): TaskContext {
        const retryCount = (task.execution_stats && typeof task.execution_stats.retry_count === 'number')
            ? task.execution_stats.retry_count
            : 0;
        const executor = this.taskQueue.getExecutor(task.queue_id, task.type);
        const maxRetries = task.retries ?? executor?.default_retries ?? 0;
        const payload = task.payload as Record<string, unknown>;

        return {
            task_id: task.id?.toString() || tId(task),
            task_hash: payload?.task_hash as string | undefined,
            task_type: task.type,
            queue_id: task.queue_id,
            payload: this.lifecycleConfig?.include_payload ? payload : {},
            attempt: retryCount + 1,
            max_retries: maxRetries,
            scheduled_at: task.created_at || new Date(),
            worker_id: workerId,
            consumer_id: consumerId,
            log_context: task.metadata?.log_context,
        };
    }

    private emitTaskStarted(task: CronTask<ID>, workerId: string, consumerId?: string): void {
        const startedAt = Date.now();
        this.taskStartTimes.set(tId(task), startedAt);

        if (this.lifecycleProvider?.onTaskStarted) {
            const ctx = this.buildTaskContext(task, workerId, consumerId);
            const queuedDuration = startedAt - (task.created_at?.getTime() || startedAt);
            this.emitLifecycleEvent(
                this.lifecycleProvider.onTaskStarted,
                {
                    ...ctx,
                    started_at: new Date(startedAt),
                    queued_duration_ms: queuedDuration
                }
            );
        }
    }

    private emitTaskCompleted(task: CronTask<ID>, workerId: string, result?: unknown, consumerId?: string): void {
        const completedAt = Date.now();
        const startedAt = this.taskStartTimes.get(tId(task)) || completedAt;
        this.taskStartTimes.delete(tId(task));

        if (this.lifecycleProvider?.onTaskCompleted) {
            const ctx = this.buildTaskContext(task, workerId, consumerId);
            const timing: TaskTiming = {
                queued_duration_ms: startedAt - (task.created_at?.getTime() || startedAt),
                processing_duration_ms: completedAt - startedAt,
                total_duration_ms: completedAt - (task.created_at?.getTime() || completedAt)
            };
            this.emitLifecycleEvent(
                this.lifecycleProvider.onTaskCompleted,
                {...ctx, timing, result}
            );
        }
    }

    private emitTaskFailed(task: CronTask<ID>, workerId: string, error: Error, willRetry: boolean, nextAttemptAt?: Date, consumerId?: string): void {
        const completedAt = Date.now();
        const startedAt = this.taskStartTimes.get(tId(task)) || completedAt;
        this.taskStartTimes.delete(tId(task));

        if (this.lifecycleProvider?.onTaskFailed) {
            const ctx = this.buildTaskContext(task, workerId, consumerId);
            const timing: TaskTiming = {
                queued_duration_ms: startedAt - (task.created_at?.getTime() || startedAt),
                processing_duration_ms: completedAt - startedAt,
                total_duration_ms: completedAt - (task.created_at?.getTime() || completedAt)
            };
            this.emitLifecycleEvent(
                this.lifecycleProvider.onTaskFailed,
                {...ctx, timing, error, will_retry: willRetry, next_attempt_at: nextAttemptAt}
            );
        }
    }
}