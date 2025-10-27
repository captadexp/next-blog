import cacheProvider from "@supergrowthai/cache";
import TaskStore from "./task-store.js";
import {LockManager, Logger, LogLevel} from "@supergrowthai/utils"
import taskRunner from "./task-runner.js";
import {ObjectId} from "mongodb";
import {getEnabledQueues} from "./environment.js";
import moment from "moment";
import taskQueue from "../index.js";
import {IAsyncTaskManager, IMessageQueue, ProcessedTaskResult, Processor, QueueName} from "@supergrowthai/mq";
import {CronTask} from "../adapters/index.js";

// Constants for Redis metrics
const METRICS_KEY_PREFIX = 'task_metrics:';
const DISCARDED_TASKS_KEY = `${METRICS_KEY_PREFIX}discarded_tasks`;

// Stats tracking
const queueStats = new Map<QueueName, {
    success: number;
    failed: number;
    async: number;
    ignored: number;
}>();

const STATS_THRESHOLD = parseInt(process.env.TQ_STATS_THRESHOLD || '1000');
const FAILURE_THRESHOLD = parseInt(process.env.TQ_STATS_FAILURE_THRESHOLD || '100');
const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';

const logger = new Logger('TaskHandler', LogLevel.INFO);
const lock = new LockManager(cacheProvider, {
    prefix: 'mature_task_lock_',
    defaultTimeout: 20,
});

const slack = {sendSlackMessage: console.log}

// Async task manager instance - to be injected
let asyncTaskManager: IAsyncTaskManager | null = null;

/**
 * Tracks the count of discarded tasks using cacheProvider
 * Maintains separate counters for each hour, creating a true 24-hour sliding window
 */
async function trackDiscardedTasks(count: number) {
    try {
        // Get current hour key using moment.js
        const now = moment.utc();
        const hourKey = `${DISCARDED_TASKS_KEY}:${now.format('YYYY-MM-DD-HH')}`;

        // Increment the counter for current hour
        const currentHourCountStr = await cacheProvider.get(hourKey) || '0';
        const currentHourCount = parseInt(currentHourCountStr, 10);
        const newCount = currentHourCount + count;

        // Store with 25-hour expiry (extra hour for safety)
        await cacheProvider.set(hourKey, newCount.toString(), 25 * 3600);

        // Get total for last 24 hours for logging (optional)
        let total = 0;
        try {
            // We'll only compute this occasionally to avoid too much overhead
            if (Math.random() < 0.1) { // 10% chance to compute total
                for (let i = 0; i < 24; i++) {
                    const hourOffset = moment.utc().subtract(i, 'hours');
                    const pastHourKey = `${DISCARDED_TASKS_KEY}:${hourOffset.format('YYYY-MM-DD-HH')}`;
                    const pastHourCountStr = await cacheProvider.get(pastHourKey) || '0';
                    total += parseInt(pastHourCountStr, 10);
                }
                logger.info(`Added ${count} discarded tasks to metrics. Last 24h total: ${total}`);
            } else {
                logger.info(`Added ${count} discarded tasks to current hour metrics.`);
            }
        } catch (error) {
            // If getting the total fails, just log the current hour's update
            logger.info(`Added ${count} discarded tasks to current hour metrics.`);
        }
    } catch (error) {
        logger.error(`Failed to track discarded tasks: ${error}`);
        // Non-critical error, don't throw
    }
}

let matureTaskTimer: NodeJS.Timeout | null = null;
const getRetryCount = (task: CronTask<any>): number => {
    if (typeof task.retries === 'number') return task.retries;
    const executor = taskQueue.getExecutor(task.queue_id, task.type);
    return executor?.default_retries ?? 3;
};

async function addTasks(messageQueue: IMessageQueue, tasks: CronTask<any>[]) {
    const diffedItems = tasks.reduce(
        (acc, {force_store, ...task}) => {
            const currentTime = new Date();
            const executeTime = task.execute_at;
            const timeDifference = (executeTime.getTime() - currentTime.getTime()) / 1000 / 60; // difference in minutes

            const queue = task.queue_id;
            if (timeDifference > 2 || force_store) {
                acc.future[queue] = acc.future[queue] || [];
                acc.future[queue].push(task);
            } else {
                acc.immediate[queue] = acc.immediate[queue] || [];
                acc.immediate[queue].push(task);
            }

            return acc;
        },
        {
            future: {} as { [key in QueueName]: CronTask<any>[] },
            immediate: {} as { [key in QueueName]: CronTask<any>[] },
        }
    );

    const iQueues = Object.keys(diffedItems.immediate) as unknown as QueueName[];
    for (let i = 0; i < iQueues.length; i++) {
        const queue = iQueues[i];
        const tasks: CronTask<any>[] = diffedItems.immediate[queue]
            .map((task) => {
                const executor = taskQueue.getExecutor(task.queue_id, task.type);
                const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                const id = shouldStoreOnFailure ? {_id: new ObjectId(),} : {}
                return ({...id, ...task});
            });

        await messageQueue.addTasks(queue, tasks);
    }

    const fQueues = Object.keys(diffedItems.future) as unknown as QueueName[];
    for (let i = 0; i < fQueues.length; i++) {
        const queue = fQueues[i];
        const tasks: CronTask<any>[] = diffedItems.future[queue]
            .map((task) => {
                const executor = taskQueue.getExecutor(task.queue_id, task.type);
                const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                const id = shouldStoreOnFailure ? {_id: new ObjectId(),} : {}
                return ({...id, ...task}); //fixme [THINK] if the task is "save_on_failure=false" should it ever be stored ?
            });
        await TaskStore.addTasksToScheduled(tasks);
    }
}

async function postProcessTasks(messageQueue: IMessageQueue, {
    failedTasks: failedTasksRaw,
    newTasks,
    successTasks
}: ProcessedTaskResult) {
    // Separate tasks into two categories: 
    // 1. Tasks with _id (to be updated in DB)
    // 2. Tasks without _id and exceeded retries (to be discarded)
    const tasksToRetry: CronTask<any>[] = [];
    const finalFailedTasks: CronTask<any>[] = [];
    let discardedTasksCount = 0;

    for (const task of failedTasksRaw) {
        const taskRetryCount = (task.execution_stats && typeof task.execution_stats.retry_count === 'number') ? task.execution_stats.retry_count : 0;
        const taskRetryAfter = task.retry_after || 2000; // seconds
        const retryAfter = taskRetryAfter * Math.pow(taskRetryCount + 1, 2);
        //fixme rename to executeAtMillis
        const executeAt = Date.now() + retryAfter;
        const maxRetries = getRetryCount(task);

        if (task._id && taskRetryCount < maxRetries) {
            // This is a retry-able task with an ID - update the existing task
            tasksToRetry.push({
                ...task,
                status: 'scheduled',
                execute_at: new Date(executeAt),
                execution_stats: {
                    ...(task.execution_stats || {}),
                    retry_count: taskRetryCount + 1
                }
            });
        } else if (task._id) {
            // This is a task with ID that exceeded retry count - mark as failed
            finalFailedTasks.push(task);
        } else if (taskRetryCount < maxRetries) {
            // This is a task without ID but still has retries left
            // For tasks without _id that can be retried, we create a new task
            // but only if the executor is configured to store on failure
            //fixme check executor
            const shouldStoreOnFailure = taskQueue.getExecutor(task.queue_id, task.type)?.store_on_failure;
            if (shouldStoreOnFailure) {
                tasksToRetry.push({
                    ...task,
                    _id: new ObjectId(),
                    status: 'scheduled',
                    execute_at: new Date(executeAt),
                    execution_stats: {
                        ...(task.execution_stats || {}),
                        retry_count: taskRetryCount + 1
                    }
                });
            } else {
                // Just create a retry task without persistence
                await addTasks(messageQueue, [{
                    ...task,
                    status: 'scheduled',
                    execute_at: new Date(executeAt),
                    execution_stats: {
                        ...(task.execution_stats || {}),
                        retry_count: taskRetryCount + 1
                    }
                }]);
            }
        } else {
            // Task without _id that exceeded retries is being discarded
            discardedTasksCount++;
            logger.info(`Discarding task of type ${task.type} after ${taskRetryCount} retries`);
        }
    }

    // Track discarded tasks count in Redis for monitoring
    if (discardedTasksCount > 0) {
        await trackDiscardedTasks(discardedTasksCount);
    }

    // Process tasks that need to be retried (already have _id)
    if (tasksToRetry.length > 0) {
        await TaskStore.updateTasksForRetry(tasksToRetry);
    }

    // Process new tasks
    if (newTasks.length > 0) {
        await addTasks(messageQueue, newTasks);
    }

    // Mark tasks that have exceeded retries as finally failed
    if (finalFailedTasks.length > 0) {
        const taskIds = finalFailedTasks.map(task => task._id as ObjectId);
        await TaskStore.markTasksAsFailed(taskIds);
    }

    // Mark successful tasks
    if (successTasks.length > 0) {
        await TaskStore.markTasksAsSuccess(successTasks);
    }
}

async function reportQueueStats(queueName: QueueName, forceSend: boolean = false): Promise<void> {
    const stats = queueStats.get(queueName);
    if (!stats) return;

    const total = stats.success + stats.failed + stats.async + stats.ignored;

    // Skip if no stats
    if (total === 0) return;

    // Check thresholds unless force sending
    if (!forceSend && total < STATS_THRESHOLD && stats.failed < FAILURE_THRESHOLD) return;

    const message = `[${INSTANCE_ID}] TQ Stats for ${queueName}:\n` +
        `✅ Success: ${stats.success}\n` +
        `❌ Failed: ${stats.failed}\n` +
        `⏳ Async: ${stats.async}\n` +
        `🚫 Ignored: ${stats.ignored}`;

    try {
        // fixme
        // await slack.sendSlackMessage(undefined, message);
        logger.info(`Sent stats for ${queueName}`);
    } catch (err) {
        logger.error(`Failed to send stats: ${err}`);
    }

    // Reset stats after threshold-based reporting (not on shutdown)
    if (!forceSend) {
        stats.success = 0;
        stats.failed = 0;
        stats.async = 0;
        stats.ignored = 0;
    }
}

function startConsumingTasks(messageQueue: IMessageQueue, streamName: QueueName) {
    return messageQueue.consumeTasks(streamName, async (id, tasks) => {
        logger.debug(`Processing ${tasks.length} tasks for stream ${streamName}`);
        const {
            failedTasks,
            newTasks,
            successTasks,
            asyncTasks,
            ignoredTasks
        } = await taskRunner(messageQueue, id, tasks, asyncTaskManager || undefined)
            .catch(err => {
                logger.error("Failed to execute tasks?", err);
                return {failedTasks: [], newTasks: [], successTasks: [], asyncTasks: [], ignoredTasks: []}
            });

        // Handle async tasks if we have an async manager
        if (asyncTasks.length > 0 && !asyncTaskManager) {
            throw new Error("Async tasks detected but AsyncTaskManager not initialized!");
        }
        if (asyncTasks.length > 0) {
            logger.info(`Handling ${asyncTasks.length} async tasks for stream ${streamName}`);
            for (const asyncTask of asyncTasks) {
                const accepted = asyncTaskManager!.handoffTask(asyncTask.task, asyncTask.promise);
                if (!accepted) {
                    // Queue full - push back to queue with backpressure
                    logger.warn(`Async queue full, requeueing task ${asyncTask.task._id} with 30s delay`);
                    await addTasks(messageQueue, [{
                        ...asyncTask.task,
                        execute_at: new Date(Date.now() + 30000) // 30 second delay
                    }]);
                }
            }
        }

        // Handle ignored tasks (tasks with no executor)
        if (ignoredTasks.length > 0) {
            logger.warn(`Storing ${ignoredTasks.length} ignored tasks with no executor for stream ${streamName}`);
            await TaskStore.markTasksAsIgnored(ignoredTasks)
                .catch(err => {
                    logger.error("Failed to mark tasks as ignored", err)
                });
        }

        await postProcessTasks(messageQueue, {failedTasks, newTasks, successTasks})
            .catch(err => {
                logger.error("Failed to postProcessTasks", err)
            })

        // Update stats
        if (!queueStats.has(streamName)) {
            queueStats.set(streamName, {
                success: 0,
                failed: 0,
                async: 0,
                ignored: 0
            });
        }
        const stats = queueStats.get(streamName)!;
        stats.success += successTasks.length;
        stats.failed += failedTasks.length;
        stats.async += asyncTasks.length;
        stats.ignored += ignoredTasks.length;

        // Check thresholds and report if needed
        await reportQueueStats(streamName);

        logger.debug(`Completed processing for stream ${streamName}: ${successTasks.length} succeeded, ${failedTasks.length} failed, ${newTasks.length} new tasks, ${ignoredTasks.length} ignored`);
        return {failedTasks, newTasks, successTasks};
    });
}

function processMatureTasks(messageQueue: IMessageQueue) {
    const LOCK_ID = 'task_processor';

    if (matureTaskTimer) clearInterval(matureTaskTimer);
    matureTaskTimer = setInterval(async () => {
        // Check if the operation is already locked
        if (await lock.isLocked(LOCK_ID)) {
            logger.info('Mature task runner locked');
            return; // Exit if another execution is in progress
        }

        try {
            // Acquire lock before proceeding
            await lock.acquire(LOCK_ID);

            // Perform the task operations
            const matureTasks = await TaskStore.getMatureTasks(Date.now());
            logger.debug(`Found ${matureTasks.length} mature tasks to process`);
            await addTasks(messageQueue, matureTasks);
        } catch (error) {
            logger.error(`Error processing tasks: ${error}`);
        } finally {
            // Always release the lock when done
            await lock.release(LOCK_ID);
        }

    }, 5000);
}

function taskProcessServer(messageQueue: IMessageQueue,) {
    const queues = getEnabledQueues();
    for (let i = 0; i < queues.length; i++) {
        logger.info(`Starting consumer for queue: ${queues[i]}`);
        startConsumingTasks(messageQueue, queues[i]);
    }
    logger.info('Starting mature tasks processor');
    processMatureTasks(messageQueue);

    //fixme
    // Register shutdown handler to send final stats
    // shutdownManager.sigint.register(async () => {
    //     await sendFinalStats();
    // });
    // shutdownManager.sigterm.register(async () => {
    //     await sendFinalStats();
    // });
}

async function sendFinalStats(): Promise<void> {
    // Send stats for each queue that has processed tasks (force send on shutdown)
    for (const queueName of queueStats.keys()) {
        await reportQueueStats(queueName, true);
    }

    // If no queues have been initialized, send a no-tasks message
    if (queueStats.size === 0) {
        try {
            const message = `[${INSTANCE_ID}] TQ Final Stats:\nNo tasks processed during this session`;
            await slack.sendSlackMessage(undefined, message);
            logger.info('Sent final TQ stats to Slack (no tasks)');
        } catch (err) {
            logger.error(`Failed to send final stats: ${err}`);
        }
    }
}

function processBatch(messageQueue: IMessageQueue, queueId: QueueName, processor: Processor, limit?: number): Promise<ProcessedTaskResult> {
    return messageQueue.processBatch(queueId, processor, limit);
}

function setAsyncTaskManager(manager: IAsyncTaskManager) {
    asyncTaskManager = manager;
    logger.info('Async task manager set');
}

export default {
    processBatch,
    processMatureTasks,
    startConsumingTasks,
    postProcessTasks,
    addTasks,
    taskProcessServer,
    setAsyncTaskManager
}
