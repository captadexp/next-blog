import chunk from "lodash/chunk";
import cacheProvider from "@supergrowthai/cache";
import {LockManager} from "@supergrowthai/utils";
import {Logger, LogLevel} from "@supergrowthai/utils/server";
import tId from "../utils/task-id-gen.js";
import taskQueue from "../index.js";
import {TasksType} from "../task-registry.js";
import TaskStore from "./task-store.js";
import {ActionResults, Actions} from "./actions/Actions.js";
import {AsyncActions} from "./actions/AsyncActions.js";
import {CronTask} from "../adapters/index.js";
import {IAsyncTaskManager, IMessageQueue} from "@supergrowthai/mq";

const logger = new Logger('TaskRunner', LogLevel.INFO);
const lock = new LockManager(cacheProvider, {prefix: "task_lock_", defaultTimeout: 30 * 60});

/**
 * Runs tasks either from a provided array or by fetching them based on task types
 * @param taskRunnerId - Unique identifier for this run
 * @param tasksRaw - Either an array of tasks to process or an array of task types to fetch
 * @returns Results of task processing
 */
export interface AsyncTask {
    task: CronTask<any>;
    promise: Promise<void>;
    startTime: number;
    actions: AsyncActions;
}

export default async function taskRunner(
    messageQueue: IMessageQueue,
    taskRunnerId: string,
    tasksRaw: Array<CronTask<any>>,
    asyncTaskManager?: IAsyncTaskManager
): Promise<ActionResults & { asyncTasks: AsyncTask[] }> {
    logger.info(`[${taskRunnerId}] Starting task runner`);
    logger.info(`[${taskRunnerId}] Processing ${tasksRaw.length} provided tasks`);

    const tasks = await lock.filterLocked(tasksRaw, tId);

    logger.info(`[${taskRunnerId}] Found ${tasks.length} not locked tasks to process`);
    await Promise.all(tasks.map((t) => lock.acquire(tId(t))));

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

    logger.info(`[${taskRunnerId}] Task groups: ${groupedTasksArray.map(g => `${g.type}: ${g.tasks.length}`).join(', ')}`);

    const actions = new Actions(taskRunnerId);
    const asyncTasks: AsyncTask[] = [];

    for (let i = 0; i < groupedTasksArray.length; i++) {
        const taskGroup = groupedTasksArray[i];
        // Get the first task to determine the queue_id
        const firstTask = taskGroup.tasks[0];
        if (!firstTask) {
            logger.warn(`[${taskRunnerId}] No tasks found for type: ${taskGroup.type}`);
            continue;
        }
        const executor = taskQueue.getExecutor(firstTask.queue_id, taskGroup.type);
        if (!executor) {
            logger.warn(`[${taskRunnerId}] No executor found for type: ${taskGroup.type} in queue ${firstTask.queue_id}`);
            // Ensure all tasks have an _id and add them to ignoredTasks
            for (const task of taskGroup.tasks) {
                const taskWithId: CronTask<any> = task._id
                    ? task as CronTask<any>
                    : {...task, _id: ""/*generate random id*/};
                actions.addIgnoredTask(taskWithId);
            }
            continue;
        }

        // Pre-check async queue capacity before processing
        if (executor.asyncConfig?.handoffTimeout && asyncTaskManager && !asyncTaskManager.canAcceptTask()) {
            logger.warn(`[${taskRunnerId}] Async queue full, rescheduling ${taskGroup.tasks.length} ${taskGroup.type} tasks for 3 min later`);

            // Update tasks directly in database with new execute_at (3 min ensures they go to DB, not queue)
            const rescheduledTasks = taskGroup.tasks.map(task => ({
                ...task,
                execute_at: new Date(Date.now() + 180000), // 3 minutes
                status: 'scheduled' as const
            }));

            // Direct database update - no retry count increment, no duplicates
            await TaskStore.updateTasksForRetry(rescheduledTasks);
            continue; // Skip this task group entirely
        }

        logger.info(`[${taskRunnerId}] Processing ${taskGroup.tasks.length} tasks of type: ${taskGroup.type}`);

        if (executor.multiple) {
            // Multi-task executors are always sync - they get the root Actions object
            await executor.onTasks(taskGroup.tasks, actions).catch(err => logger.error(`[${taskRunnerId}] executor.onTasks failed: ${err}`))
        } else {
            if (executor.parallel) {
                const chunks = chunk(taskGroup.tasks, executor.chunkSize);
                logger.info(`[${taskRunnerId}] Processing in parallel chunks of ${executor.chunkSize}`);
                for (const chunk of chunks) {
                    const chunkTasks: Promise<void>[] = []
                    for (let j = 0; j < chunk.length; j++) {
                        // Each task gets its own forked context
                        const taskActions = actions.forkForTask(chunk[j]);
                        chunkTasks.push(executor.onTask(chunk[j], taskActions).catch(err => logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`)))
                    }
                    await Promise.all(chunkTasks)
                }
            } else {
                // Sequential processing with timeout detection for async handoff
                const timeoutMs = executor.asyncConfig?.handoffTimeout;

                for (let j = 0; j < taskGroup.tasks.length; j++) {
                    const task = taskGroup.tasks[j];

                    if (!timeoutMs) {
                        // No async config - process normally with forked context
                        const taskActions = actions.forkForTask(task);
                        await executor.onTask(task, taskActions).catch(err => logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`))
                    } else {
                        // Has async config - use timeout detection
                        const startTime = Date.now();
                        let isTimedOut = false;

                        // Fork context for this task
                        const taskActions = actions.forkForTask(task);

                        const taskPromise = executor.onTask(task, taskActions).catch(err => {
                            logger.error(`[${taskRunnerId}] executor.onTask failed: ${err}`);
                            // Let it fail fast - executor should have called fail() before throwing
                        });

                        const timeoutPromise = new Promise<'~~~timeout'>(resolve =>
                            setTimeout(() => {
                                isTimedOut = true;
                                resolve('~~~timeout');
                            }, timeoutMs)
                        );

                        const result = await Promise.race([taskPromise, timeoutPromise]);

                        if (result === '~~~timeout') {
                            logger.info(`[${taskRunnerId}] Task ${tId(task)} (${task.type}) exceeded ${timeoutMs}ms, marking for async handoff`);

                            // Check if AsyncTaskManager is available
                            if (!asyncTaskManager) {
                                throw new Error(`Task ${task.type} exceeded timeout but AsyncTaskManager not initialized!`);
                            }

                            // Async tasks MUST have an _id for tracking
                            if (!task._id) {
                                logger.error(`[${taskRunnerId}] Cannot hand off task without _id (type: ${task.type}). Task will continue but won't be tracked.`);
                                // Let the task continue running but don't track it
                            } else {
                                // Task has _id, safe to hand off
                                // Create AsyncActions wrapper (no callback needed!)
                                const asyncActions = new AsyncActions(messageQueue, actions, task);

                                // Wrap the promise to handle completion
                                const asyncPromise = taskPromise
                                    .finally(async () => {
                                        // Execute the collected actions when promise completes
                                        try {
                                            await asyncActions.onPromiseFulfilled();
                                        } catch (err) {
                                            logger.error(`[${taskRunnerId}] Failed to execute async actions for task ${tId(task)}:`, err);
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

    // Extract sync results (excluding async tasks)
    const asyncTaskIds = asyncTasks.map(at => tId(at.task));
    const results = actions.extractSyncResults(asyncTaskIds);

    logger.info(`[${taskRunnerId}] Completing run - Success: ${results.successTasks.length}, Failed: ${results.failedTasks.length}, New: ${results.newTasks.length}, Async: ${asyncTasks.length}, Ignored: ${results.ignoredTasks.length}`);

    await Promise.all(tasks.map((t) => lock.release(tId(t))));

    return {...results, asyncTasks};
}
