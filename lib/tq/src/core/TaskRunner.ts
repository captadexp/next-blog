import chunk from "lodash/chunk";
import {Logger, LogLevel} from "@supergrowthai/utils/server";
import {tId} from "../utils/task-id-gen.js";
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

export interface AsyncTask<ID> {
    task: CronTask<ID>;
    promise: Promise<void>;
    startTime: number;
    actions: AsyncActions<ID>;
}

export class TaskRunner<ID> {
    private readonly logger: Logger;
    private lockManager: LockManager;

    constructor(
        private messageQueue: IMessageQueue<ID>,
        private taskQueue: TaskQueuesManager<ID>,
        private taskStore: TaskStore<ID>,
        cacheProvider: CacheProvider<any>,
        private generateId: () => ID
    ) {
        this.logger = new Logger('TaskRunner', LogLevel.INFO);
        this.lockManager = new LockManager(cacheProvider, {
            prefix: "task_lock_",
            defaultTimeout: 30 * 60
        });
    }

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
        await Promise.all(tasks.map((t) => this.lockManager!.acquire(tId(t))));

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
                await executor.onTasks(taskGroup.tasks as any[], actions).catch(err => this.logger.error(`[${taskRunnerId}] executor.onTasks failed: ${err}`))
            } else {
                if (executor.parallel) {
                    const chunks = chunk(taskGroup.tasks, executor.chunkSize) as CronTask<ID>[][];
                    this.logger.info(`[${taskRunnerId}] Processing in parallel chunks of ${executor.chunkSize}`);
                    for (const chunk of chunks) {
                        const chunkTasks: Promise<void>[] = []
                        for (let j = 0; j < chunk.length; j++) {
                            const taskActions = actions.forkForTask(chunk[j]);
                            chunkTasks.push(executor.onTask(chunk[j], taskActions).catch(err => this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`)))
                        }
                        await Promise.all(chunkTasks)
                    }
                } else {
                    const timeoutMs = executor.asyncConfig?.handoffTimeout;

                    for (let j = 0; j < taskGroup.tasks.length; j++) {
                        const task = taskGroup.tasks[j];

                        if (!timeoutMs) {
                            const taskActions = actions.forkForTask(task);
                            await executor.onTask(task, taskActions).catch(err => this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`))
                        } else {
                            const startTime = Date.now();
                            let isTimedOut = false;

                            const taskActions = actions.forkForTask(task);

                            const taskPromise = executor.onTask(task, taskActions).catch(err => {
                                this.logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
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

        // FIXME: Critical race condition - locks are acquired for ALL tasks at line 57
        // but only released for processedTaskIds. If execution fails before adding to
        // processedTaskIds (e.g., executor not found, async queue full), those locks
        // remain held forever causing deadlocks. Need to track all acquired locks
        // separately and ensure they're always released in a finally block.
        await Promise.all(tasks.filter(t => processedTaskIds.has(tId(t))).map((t) => this.lockManager!.release(tId(t))));

        return {...results, asyncTasks};
    }
}