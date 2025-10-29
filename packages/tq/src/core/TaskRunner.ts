import chunk from "lodash/chunk";
import {Logger, LogLevel} from "@supergrowthai/utils/server";
import {tId} from "../utils/task-id-gen.js";
import {TasksType} from "../task-registry.js";
import {ActionResults, Actions} from "./Actions.js";
import {AsyncActions} from "./async/AsyncActions.js";
import {CronTask} from "../adapters/index.js";
import {IMessageQueue} from "@supergrowthai/mq";
import {BaseCacheProvider} from "memoose-js";
import {LockManager} from "@supergrowthai/utils";
import {TaskQueuesManager} from "./TaskQueuesManager";
import {TaskStore} from "./TaskStore";
import {IAsyncTaskManager} from "./async/async-task-manager";

export interface AsyncTask {
    task: CronTask<any>;
    promise: Promise<void>;
    startTime: number;
    actions: AsyncActions;
}

export class TaskRunner<ID = any> {
    private readonly logger: Logger;
    private lockManager: LockManager;

    constructor(
        private messageQueue: IMessageQueue,
        private taskQueue: TaskQueuesManager,
        private taskStore: TaskStore<ID>,
        cacheProvider: BaseCacheProvider<any>,
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
        tasksRaw: Array<CronTask<any>>,
        asyncTaskManager?: IAsyncTaskManager
    ): Promise<ActionResults & { asyncTasks: AsyncTask[] }> {
        this.logger.info(`[${taskRunnerId}] Starting task runner`);
        this.logger.info(`[${taskRunnerId}] Processing ${tasksRaw.length} provided tasks`);

        const tasks = await this.lockManager.filterLocked(tasksRaw, tId);

        this.logger.info(`[${taskRunnerId}] Found ${tasks.length} not locked tasks to process`);
        await Promise.all(tasks.map((t) => this.lockManager!.acquire(tId(t))));

        const groupedTasksObject = tasks
            .reduce((acc: any, task) => {
                acc[task.type] = acc[task.type] || [];
                acc[task.type].push(task);
                return acc;
            }, {}) as Record<TasksType, CronTask<any>[]>;

        const groupedTasksArray = (Object.keys(groupedTasksObject) as unknown as TasksType[]).reduce((acc: {
            type: TasksType,
            tasks: CronTask<any>[]
        }[], type: TasksType) => {
            acc.push({type, tasks: groupedTasksObject[type]})
            return acc;
        }, [] as { type: TasksType, tasks: CronTask<any>[] }[]);

        this.logger.info(`[${taskRunnerId}] Task groups: ${groupedTasksArray.map(g => `${g.type}: ${g.tasks.length}`).join(', ')}`);

        const actions = new Actions(taskRunnerId);
        const asyncTasks: AsyncTask[] = [];

        for (let i = 0; i < groupedTasksArray.length; i++) {
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
                    const taskWithId: CronTask<any> = task._id
                        ? task as CronTask<any>
                        : {...task, _id: ""};
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

            this.logger.info(`[${taskRunnerId}] Processing ${taskGroup.tasks.length} tasks of type: ${taskGroup.type}`);

            if (executor.multiple) {
                await executor.onTasks(taskGroup.tasks, actions).catch(err => this.logger.error(`[${taskRunnerId}] executor.onTasks failed: ${err}`))
            } else {
                if (executor.parallel) {
                    const chunks = chunk(taskGroup.tasks, executor.chunkSize);
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

                            const timeoutPromise = new Promise<'~~~timeout'>(resolve =>
                                setTimeout(() => {
                                    isTimedOut = true;
                                    resolve('~~~timeout');
                                }, timeoutMs)
                            );

                            const result = await Promise.race([taskPromise, timeoutPromise]);

                            if (result === '~~~timeout') {
                                this.logger.info(`[${taskRunnerId}] Task ${tId(task)} (${task.type}) exceeded ${timeoutMs}ms, marking for async handoff`);

                                if (!asyncTaskManager) {
                                    throw new Error(`Task ${task.type} exceeded timeout but AsyncTaskManager not initialized!`);
                                }

                                if (!task._id) {
                                    this.logger.error(`[${taskRunnerId}] Cannot hand off task without _id (type: ${task.type}). Task will continue but won't be tracked.`);
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

        await Promise.all(tasks.map((t) => this.lockManager!.release(tId(t))));

        return {...results, asyncTasks};
    }
}