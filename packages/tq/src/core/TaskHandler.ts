import {TaskStore} from "./TaskStore.js";
import {LockManager, Logger, LogLevel} from "@supergrowthai/utils"
import {TaskRunner} from "./TaskRunner.js";
import {getEnabledQueues} from "./environment.js";
import moment from "moment";
import type {MessageConsumer} from "@supergrowthai/mq";
import {IMessageQueue, QueueName} from "@supergrowthai/mq";
import {ProcessedTaskResult} from "./task-processor-types.js";
import {CronTask, ITaskStorageAdapter} from "../adapters";
import type {CacheProvider} from "memoose-js";
import {TaskQueuesManager} from "./TaskQueuesManager";
import {IAsyncTaskManager} from "./async/async-task-manager";
import {
    DiscardedTaskInfo,
    ITaskNotificationProvider,
    TaskErrorInfo,
    TaskQueueStats
} from "./ITaskNotificationProvider.js";

const METRICS_KEY_PREFIX = 'task_metrics:';
const DISCARDED_TASKS_KEY = `${METRICS_KEY_PREFIX}discarded_tasks`;
const STATS_THRESHOLD = parseInt(process.env.TQ_STATS_THRESHOLD || '1000');
const FAILURE_THRESHOLD = parseInt(process.env.TQ_STATS_FAILURE_THRESHOLD || '100');
const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';


export class TaskHandler<PAYLOAD, ID> {
    private readonly logger: Logger;
    private taskRunner: TaskRunner<PAYLOAD, ID>;
    private readonly taskStore: TaskStore<PAYLOAD, ID>;
    private matureTaskTimer: NodeJS.Timeout | null = null;

    private readonly queueStats = new Map<QueueName, {
        success: number;
        failed: number;
        async: number;
        ignored: number;
    }>();

    constructor(
        private messageQueue: IMessageQueue<PAYLOAD, ID>,
        private taskQueuesManager: TaskQueuesManager<PAYLOAD, ID>,
        private databaseAdapter: ITaskStorageAdapter<PAYLOAD, ID>,
        private cacheAdapter: CacheProvider<any>,
        private asyncTaskManager?: IAsyncTaskManager<PAYLOAD, ID>,
        private notificationProvider?: ITaskNotificationProvider
    ) {
        this.logger = new Logger('TaskHandler', LogLevel.INFO);

        this.taskStore = new TaskStore<PAYLOAD, ID>(databaseAdapter);
        this.taskRunner = new TaskRunner<PAYLOAD, ID>(messageQueue, taskQueuesManager, this.taskStore, this.cacheAdapter, databaseAdapter.generateId.bind(databaseAdapter));
    }

    async addTasks(tasks: CronTask<PAYLOAD, ID>[]) {
        const diffedItems = tasks.reduce(
            (acc, {force_store, ...task}) => {
                const currentTime = new Date();
                const executeTime = task.execute_at;
                const timeDifference = (executeTime.getTime() - currentTime.getTime()) / 1000 / 60;

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
                future: {} as { [key in QueueName]: CronTask<PAYLOAD, ID>[] },
                immediate: {} as { [key in QueueName]: CronTask<PAYLOAD, ID>[] },
            }
        );

        const iQueues = Object.keys(diffedItems.immediate) as unknown as QueueName[];
        for (let i = 0; i < iQueues.length; i++) {
            const queue = iQueues[i];
            const tasks: CronTask<PAYLOAD, ID>[] = diffedItems.immediate[queue]
                .map((task) => {
                    const executor = this.taskQueuesManager.getExecutor(task.queue_id, task.type);
                    const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                    const id = shouldStoreOnFailure ? {_id: this.databaseAdapter.generateId(),} : {}
                    return ({...id, ...task});
                });

            await this.messageQueue.addMessages(queue, tasks);
        }

        const fQueues = Object.keys(diffedItems.future) as unknown as QueueName[];
        for (let i = 0; i < fQueues.length; i++) {
            const queue = fQueues[i];
            const tasks: CronTask<PAYLOAD, ID>[] = diffedItems.future[queue]
                .map((task) => {
                    const executor = this.taskQueuesManager.getExecutor(task.queue_id, task.type);
                    const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                    const id = shouldStoreOnFailure ? {_id: this.databaseAdapter.generateId(),} : {}
                    return ({...id, ...task});
                });
            await this.taskStore.addTasksToScheduled(tasks);
        }
    }

    async postProcessTasks({
                               failedTasks: failedTasksRaw,
                               newTasks,
                               successTasks
                           }: ProcessedTaskResult<PAYLOAD, ID>) {
        const tasksToRetry: CronTask<PAYLOAD, ID>[] = [];
        const finalFailedTasks: CronTask<PAYLOAD, ID>[] = [];
        let discardedTasksCount = 0;

        for (const task of failedTasksRaw) {
            const taskRetryCount = (task.execution_stats && typeof task.execution_stats.retry_count === 'number') ? task.execution_stats.retry_count : 0;
            const taskRetryAfter = task.retry_after || 2000;
            const retryAfter = taskRetryAfter * Math.pow(taskRetryCount + 1, 2);
            const executeAt = Date.now() + retryAfter;
            const maxRetries = this.getRetryCount(task);

            if (task._id && taskRetryCount < maxRetries) {
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
                finalFailedTasks.push(task);
            } else if (taskRetryCount < maxRetries) {
                const shouldStoreOnFailure = this.taskQueuesManager.getExecutor(task.queue_id, task.type)?.store_on_failure;
                if (shouldStoreOnFailure) {
                    tasksToRetry.push({
                        ...task,
                        _id: this.databaseAdapter.generateId(),
                        status: 'scheduled',
                        execute_at: new Date(executeAt),
                        execution_stats: {
                            ...(task.execution_stats || {}),
                            retry_count: taskRetryCount + 1
                        }
                    });
                } else {
                    await this.addTasks([{
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
                discardedTasksCount++;
                this.logger.info(`Discarding task of type ${task.type} after ${taskRetryCount} retries`);
            }
        }

        if (discardedTasksCount > 0) {
            await this.trackDiscardedTasks(discardedTasksCount);
        }

        if (tasksToRetry.length > 0) {
            await this.taskStore.updateTasksForRetry(tasksToRetry);
        }

        if (newTasks.length > 0) {
            await this.addTasks(newTasks);
        }

        if (finalFailedTasks.length > 0) {
            await this.taskStore.markTasksAsFailed(finalFailedTasks);
        }

        if (successTasks.length > 0) {
            await this.taskStore.markTasksAsSuccess(successTasks);
        }
    }

    startConsumingTasks(streamName: QueueName, abortSignal?: AbortSignal) {
        return this.messageQueue.consumeMessagesStream(streamName, async (id, tasks) => {
            if (abortSignal?.aborted) {
                this.logger.info(`AbortSignal detected, skipping processing of ${tasks.length} tasks for stream ${streamName}`);
                return {failedTasks: [], newTasks: [], successTasks: [], asyncTasks: [], ignoredTasks: []};
            }

            this.logger.debug(`Processing ${tasks.length} tasks for stream ${streamName}`);
            const {
                failedTasks,
                newTasks,
                successTasks,
                asyncTasks,
                ignoredTasks
            } = await this.taskRunner.run(id, tasks, this.asyncTaskManager, abortSignal)
                .catch(err => {
                    this.logger.error("Failed to execute tasks?", err);
                    return {failedTasks: [], newTasks: [], successTasks: [], asyncTasks: [], ignoredTasks: []}
                });

            if (asyncTasks.length > 0 && !this.asyncTaskManager) {
                throw new Error("Async tasks detected but AsyncTaskManager not initialized!");
            }
            if (asyncTasks.length > 0) {
                this.logger.info(`Handling ${asyncTasks.length} async tasks for stream ${streamName}`);
                for (const asyncTask of asyncTasks) {
                    const accepted = this.asyncTaskManager!.handoffTask(asyncTask.task, asyncTask.promise);
                    if (!accepted) {
                        this.logger.warn(`Async queue full, requeueing task ${asyncTask.task._id} with 30s delay`);
                        await this.addTasks([{
                            ...asyncTask.task,
                            execute_at: new Date(Date.now() + 30000)
                        }]);
                    }
                }
            }

            if (ignoredTasks.length > 0) {
                this.logger.warn(`Storing ${ignoredTasks.length} ignored tasks with no executor for stream ${streamName}`);
                await this.taskStore.markTasksAsIgnored(ignoredTasks)
                    .catch(err => {
                        this.logger.error("Failed to mark tasks as ignored", err)
                    });
            }

            await this.postProcessTasks({failedTasks, newTasks, successTasks})
                .catch(err => {
                    this.logger.error("Failed to postProcessTasks", err)
                })

            if (!this.queueStats.has(streamName)) {
                this.queueStats.set(streamName, {
                    success: 0,
                    failed: 0,
                    async: 0,
                    ignored: 0
                });
            }
            const stats = this.queueStats.get(streamName)!;
            stats.success += successTasks.length;
            stats.failed += failedTasks.length;
            stats.async += asyncTasks.length;
            stats.ignored += ignoredTasks.length;

            await this.reportQueueStats(streamName);

            this.logger.debug(`Completed processing for stream ${streamName}: ${successTasks.length} succeeded, ${failedTasks.length} failed, ${newTasks.length} new tasks, ${ignoredTasks.length} ignored`);
            return {failedTasks, newTasks, successTasks, asyncTasks, ignoredTasks};
        }, abortSignal);
    }

    processMatureTasks(abortSignal?: AbortSignal) {
        const LOCK_ID = 'mature_task_lock_:task_processor';

        if (this.matureTaskTimer) clearInterval(this.matureTaskTimer);

        if (abortSignal?.aborted) {
            this.logger.info('AbortSignal already aborted, not starting mature task processing');
            return;
        }

        this.matureTaskTimer = setInterval(async () => {
            if (abortSignal?.aborted) {
                this.logger.info('AbortSignal detected, stopping mature task processing');
                if (this.matureTaskTimer) clearInterval(this.matureTaskTimer);
                return;
            }
            const lockManager = new LockManager(this.cacheAdapter, {prefix: 'mature_task_lock_:'});

            if (await lockManager.isLocked('task_processor')) {
                this.logger.info('Mature task runner locked');
                return;
            }

            try {
                const acquired = await lockManager.acquire('task_processor', 20);
                if (!acquired) {
                    this.logger.info('Could not acquire lock for mature task processing');
                    return;
                }

                const matureTasks = await this.taskStore.getMatureTasks(Date.now());
                this.logger.debug(`Found ${matureTasks.length} mature tasks to process`);
                await this.addTasks(matureTasks);
            } catch (error) {
                this.logger.error(`Error processing tasks: ${error}`);
            } finally {
                await lockManager.release('task_processor');
            }

        }, 5000);

        // Clean up interval when aborted
        abortSignal?.addEventListener('abort', () => {
            this.logger.info('AbortSignal received, cleaning up mature task timer');
            if (this.matureTaskTimer) {
                clearInterval(this.matureTaskTimer);
                this.matureTaskTimer = null;
            }
        });
    }

    taskProcessServer(abortSignal?: AbortSignal) {
        const queues = getEnabledQueues();
        for (let i = 0; i < queues.length; i++) {
            this.logger.info(`Starting consumer for queue: ${queues[i]}`);
            this.startConsumingTasks(queues[i], abortSignal);
        }
        this.logger.info('Starting mature tasks processor');
        this.processMatureTasks(abortSignal);
    }

    processBatch(queueId: QueueName, processor: MessageConsumer<PAYLOAD, ID>, limit?: number, abortSignal?: AbortSignal): Promise<void> {
        if (abortSignal?.aborted) {
            this.logger.info(`AbortSignal already aborted, skipping batch processing for queue ${queueId}`);
            return Promise.resolve();
        }
        return this.messageQueue.consumeMessagesBatch(queueId, processor, limit);
    }

    private async trackDiscardedTasks(count: number) {
        try {
            const now = moment.utc();
            const hourKey = `${DISCARDED_TASKS_KEY}:${now.format('YYYY-MM-DD-HH')}`;

            if (!this.cacheAdapter) throw new Error('Cache adapter not initialized');
            const currentHourCountStr = await this.cacheAdapter.get(hourKey) || '0';
            const currentHourCount = parseInt(currentHourCountStr, 10);
            const newCount = currentHourCount + count;

            await this.cacheAdapter.set(hourKey, newCount.toString(), 25 * 3600);

            let total = 0;
            try {
                if (Math.random() < 0.1) {
                    for (let i = 0; i < 24; i++) {
                        const hourOffset = moment.utc().subtract(i, 'hours');
                        const pastHourKey = `${DISCARDED_TASKS_KEY}:${hourOffset.format('YYYY-MM-DD-HH')}`;
                        const pastHourCountStr = await this.cacheAdapter.get(pastHourKey) || '0';
                        total += parseInt(pastHourCountStr, 10);
                    }
                    this.logger.info(`Added ${count} discarded tasks to metrics. Last 24h total: ${total}`);
                } else {
                    this.logger.info(`Added ${count} discarded tasks to current hour metrics.`);
                }

                // Notify provider if available
                if (this.notificationProvider?.onTasksDiscarded) {
                    const discardedInfo: DiscardedTaskInfo = {count, last24HourTotal: total > 0 ? total : undefined};
                    try {
                        await this.notificationProvider.onTasksDiscarded(discardedInfo);
                    } catch (err) {
                        this.logger.error(`Notification provider error for discarded tasks: ${err}`);
                    }
                }
            } catch (error) {
                this.logger.info(`Added ${count} discarded tasks to current hour metrics.`);

                // Still notify provider about the count even if metrics failed
                if (this.notificationProvider?.onTasksDiscarded) {
                    const discardedInfo: DiscardedTaskInfo = {count};
                    try {
                        await this.notificationProvider.onTasksDiscarded(discardedInfo);
                    } catch (err) {
                        this.logger.error(`Notification provider error for discarded tasks: ${err}`);
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Failed to track discarded tasks: ${error}`);

            // Try to notify provider about the error
            if (this.notificationProvider?.onTaskError) {
                const errorInfo: TaskErrorInfo = {
                    error: `Failed to track discarded tasks: ${error}`,
                    context: 'trackDiscardedTasks'
                };
                this.notificationProvider.onTaskError(errorInfo).catch(() => {
                    // Ignore notification errors to prevent infinite loops
                });
            }
        }
    }

    private getRetryCount(task: CronTask<PAYLOAD, ID>): number {
        if (typeof task.retries === 'number') return task.retries;
        const executor = this.taskQueuesManager.getExecutor(task.queue_id, task.type);
        return executor?.default_retries ?? 3;
    }

    private async reportQueueStats(queueName: QueueName, forceSend: boolean = false): Promise<void> {
        const stats = this.queueStats.get(queueName);
        if (!stats) return;

        const total = stats.success + stats.failed + stats.async + stats.ignored;
        if (total === 0) return;

        if (!forceSend && total < STATS_THRESHOLD && stats.failed < FAILURE_THRESHOLD) return;

        const message = `[${INSTANCE_ID}] TQ Stats for ${queueName}:\n` +
            `✅ Success: ${stats.success}\n` +
            `❌ Failed: ${stats.failed}\n` +
            `⏳ Async: ${stats.async}\n` +
            `🚫 Ignored: ${stats.ignored}`;

        try {
            if (this.notificationProvider?.onQueueStats) {
                const queueStats: TaskQueueStats = {
                    queueName,
                    success: stats.success,
                    failed: stats.failed,
                    async: stats.async,
                    ignored: stats.ignored,
                    instanceId: INSTANCE_ID
                };
                await this.notificationProvider.onQueueStats(queueStats);
            }
            this.logger.info(`Sent stats for ${queueName}`);
        } catch (err) {
            this.logger.error(`Failed to send stats: ${err}`);
        }

        if (!forceSend) {
            stats.success = 0;
            stats.failed = 0;
            stats.async = 0;
            stats.ignored = 0;
        }
    }

    private async sendFinalStats(): Promise<void> {
        for (const queueName of this.queueStats.keys()) {
            await this.reportQueueStats(queueName, true);
        }

        if (this.queueStats.size === 0) {
            try {
                if (this.notificationProvider?.onFinalStats) {
                    await this.notificationProvider.onFinalStats([]);
                }
                this.logger.info('Sent final TQ stats (no tasks)');
            } catch (err) {
                this.logger.error(`Failed to send final stats: ${err}`);
            }
        }
    }
}