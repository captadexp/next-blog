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
import type {ITaskLifecycleProvider, TaskContext, TaskHandlerLifecycleConfig, TaskTiming} from "./lifecycle.js";

export interface AsyncTask<ID> {
    task: CronTask<ID>;
    promise: Promise<void>;
    startTime: number;
    actions: AsyncActions<ID>;
}

export class TaskRunner<ID> {
    private readonly logger: Logger;
    private lockManager: LockManager;
    private readonly taskStartTimes = new Map<string, number>();

    constructor(
        private messageQueue: IMessageQueue<ID>,
        private taskQueue: TaskQueuesManager<ID>,
        private taskStore: TaskStore<ID>,
        cacheProvider: CacheProvider<any>,
        private generateId: () => ID,
        private lifecycleProvider?: ITaskLifecycleProvider,
        private lifecycleConfig?: TaskHandlerLifecycleConfig
    ) {
        this.logger = new Logger('TaskRunner', LogLevel.INFO);
        this.lockManager = new LockManager(cacheProvider, {
            prefix: "task_lock_",
            defaultTimeout: 30 * 60
        });
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
            return {successTasks: [], failedTasks: [], newTasks: [], ignoredTasks: [], asyncTasks: []};
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

        const actions = new Actions<ID>(taskRunnerId);
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
                await executor.onTasks(taskGroup.tasks as any[], actions).catch(err => {
                    this.logger.error(`[${taskRunnerId}] executor.onTasks failed: ${err}`);
                    for (const task of taskGroup.tasks) {
                        if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                            actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                        }
                    }
                });
            } else {
                if (executor.parallel) {
                    const chunks = chunk(taskGroup.tasks, executor.chunkSize) as CronTask<ID>[][];
                    this.logger.info(`[${taskRunnerId}] Processing in parallel chunks of ${executor.chunkSize}`);
                    for (const taskChunk of chunks) {
                        // Emit onTaskStarted for all tasks in chunk
                        for (const task of taskChunk) {
                            this.emitTaskStarted(task, taskRunnerId);
                        }

                        const chunkPromises: Promise<void>[] = [];
                        for (let j = 0; j < taskChunk.length; j++) {
                            const task = taskChunk[j];
                            const taskActions = actions.forkForTask(task);
                            chunkPromises.push(executor.onTask(task, taskActions).catch(err => {
                                this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
                                if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                                    actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                                }
                            }));
                        }
                        await Promise.all(chunkPromises);

                        // Emit completion events for all tasks in chunk
                        for (const task of taskChunk) {
                            const resultStatus = actions.getTaskResultStatus(tId(task));
                            if (resultStatus === 'success') {
                                this.emitTaskCompleted(task, taskRunnerId, actions.getTaskResult(tId(task)));
                            } else if (resultStatus === 'fail') {
                                const retryCount = (task.execution_stats?.retry_count as number) || 0;
                                const maxRetries = task.retries ?? executor.default_retries ?? 0;
                                const willRetry = retryCount < maxRetries;
                                this.emitTaskFailed(task, taskRunnerId, new Error('Task failed'), willRetry);
                            }
                        }
                    }
                } else {
                    const timeoutMs = executor.asyncConfig?.handoffTimeout;

                    for (let j = 0; j < taskGroup.tasks.length; j++) {
                        const task = taskGroup.tasks[j];

                        if (!timeoutMs) {
                            // Emit onTaskStarted
                            this.emitTaskStarted(task, taskRunnerId);

                            const taskActions = actions.forkForTask(task);
                            await executor.onTask(task, taskActions).catch(err => {
                                this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
                                if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                                    actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                                }
                            });

                            // Emit completion event based on result
                            const resultStatus = actions.getTaskResultStatus(tId(task));
                            if (resultStatus === 'success') {
                                this.emitTaskCompleted(task, taskRunnerId, actions.getTaskResult(tId(task)));
                            } else if (resultStatus === 'fail') {
                                const retryCount = (task.execution_stats?.retry_count as number) || 0;
                                const maxRetries = task.retries ?? executor.default_retries ?? 0;
                                const willRetry = retryCount < maxRetries;
                                this.emitTaskFailed(task, taskRunnerId, new Error('Task failed'), willRetry);
                            }
                        } else {
                            // Emit onTaskStarted for async-capable tasks
                            this.emitTaskStarted(task, taskRunnerId);

                            const startTime = Date.now();
                            let isTimedOut = false;

                            const taskActions = actions.forkForTask(task);

                            const taskPromise = executor.onTask(task, taskActions).catch(err => {
                                this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
                                if (actions.getTaskResultStatus(tId(task)) === 'pending') {
                                    actions.fail(task, err instanceof Error ? err : new Error(String(err)));
                                }
                            });

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
                                    this.emitTaskCompleted(task, taskRunnerId, actions.getTaskResult(tId(task)));
                                } else if (resultStatus === 'fail') {
                                    const retryCount = (task.execution_stats?.retry_count as number) || 0;
                                    const maxRetries = task.retries ?? executor.default_retries ?? 0;
                                    const willRetry = retryCount < maxRetries;
                                    this.emitTaskFailed(task, taskRunnerId, new Error('Task failed'), willRetry);
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
                                    const asyncActions = new AsyncActions<ID>(this.messageQueue, this.taskStore, this.taskQueue, actions, task, this.generateId);

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

    private buildTaskContext(task: CronTask<ID>, workerId?: string): TaskContext {
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
            worker_id: workerId
        };
    }

    private emitTaskStarted(task: CronTask<ID>, workerId: string): void {
        const startedAt = Date.now();
        this.taskStartTimes.set(tId(task), startedAt);

        if (this.lifecycleProvider?.onTaskStarted) {
            const ctx = this.buildTaskContext(task, workerId);
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

    private emitTaskCompleted(task: CronTask<ID>, workerId: string, result?: unknown): void {
        const completedAt = Date.now();
        const startedAt = this.taskStartTimes.get(tId(task)) || completedAt;
        this.taskStartTimes.delete(tId(task));

        if (this.lifecycleProvider?.onTaskCompleted) {
            const ctx = this.buildTaskContext(task, workerId);
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

    private emitTaskFailed(task: CronTask<ID>, workerId: string, error: Error, willRetry: boolean, nextAttemptAt?: Date): void {
        const completedAt = Date.now();
        const startedAt = this.taskStartTimes.get(tId(task)) || completedAt;
        this.taskStartTimes.delete(tId(task));

        if (this.lifecycleProvider?.onTaskFailed) {
            const ctx = this.buildTaskContext(task, workerId);
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