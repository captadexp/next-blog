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
import type {
    ITaskLifecycleProvider,
    IWorkerLifecycleProvider,
    TaskContext,
    TaskHandlerConfig,
    WorkerInfo,
    WorkerStats
} from "./lifecycle.js";
import * as os from "os";

const METRICS_KEY_PREFIX = 'task_metrics:';
const DISCARDED_TASKS_KEY = `${METRICS_KEY_PREFIX}discarded_tasks`;
const STATS_THRESHOLD = parseInt(process.env.TQ_STATS_THRESHOLD || '1000');
const FAILURE_THRESHOLD = parseInt(process.env.TQ_STATS_FAILURE_THRESHOLD || '100');
const INSTANCE_ID = process.env.INSTANCE_ID || 'unknown';


export class TaskHandler<ID> {
    private readonly logger: Logger;
    private taskRunner: TaskRunner<ID>;
    private readonly taskStore: TaskStore<ID>;
    private matureTaskTimer: NodeJS.Timeout | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private readonly config: TaskHandlerConfig;

    // Worker info
    private readonly workerId: string;
    private readonly workerStartedAt: Date;
    private enabledQueues: string[] = [];
    private workerStarted = false;

    // Worker stats
    private workerStats: WorkerStats = {
        tasks_processed: 0,
        tasks_succeeded: 0,
        tasks_failed: 0,
        avg_processing_ms: 0,
        current_task: undefined
    };
    private totalProcessingMs = 0;

    private readonly queueStats = new Map<QueueName, {
        success: number;
        failed: number;
        async: number;
        ignored: number;
    }>();

    constructor(
        private messageQueue: IMessageQueue<ID>,
        private taskQueuesManager: TaskQueuesManager<ID>,
        private databaseAdapter: ITaskStorageAdapter<ID>,
        private cacheAdapter: CacheProvider<any>,
        private asyncTaskManager?: IAsyncTaskManager<ID>,
        private notificationProvider?: ITaskNotificationProvider,
        config?: TaskHandlerConfig
    ) {
        this.logger = new Logger('TaskHandler', LogLevel.INFO);
        this.config = config || {};

        // Initialize worker identity
        this.workerId = `${os.hostname()}-${process.pid}-${Date.now()}`;
        this.workerStartedAt = new Date();

        this.taskStore = new TaskStore<ID>(databaseAdapter);
        this.taskRunner = new TaskRunner<ID>(
            messageQueue,
            taskQueuesManager,
            this.taskStore,
            this.cacheAdapter,
            databaseAdapter.generateId.bind(databaseAdapter),
            this.config.lifecycleProvider,
            this.config.lifecycle
        );
    }

    // ============ Lifecycle Event Helpers ============

    private get lifecycleProvider(): ITaskLifecycleProvider | undefined {
        return this.config.lifecycleProvider;
    }

    private get workerProvider(): IWorkerLifecycleProvider | undefined {
        return this.config.workerProvider;
    }

    async addTasks(tasks: CronTask<ID>[]) {
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
                future: {} as { [key in QueueName]: CronTask<ID>[] },
                immediate: {} as { [key in QueueName]: CronTask<ID>[] },
            }
        );

        const iQueues = Object.keys(diffedItems.immediate) as unknown as QueueName[];
        for (let i = 0; i < iQueues.length; i++) {
            const queue = iQueues[i];
            const queueTasks: CronTask<ID>[] = diffedItems.immediate[queue]
                .map((task) => {
                    const executor = this.taskQueuesManager.getExecutor(task.queue_id, task.type);
                    const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                    const id = shouldStoreOnFailure ? {id: this.databaseAdapter.generateId(),} : {}
                    return ({...id, ...task});
                });

            await this.messageQueue.addMessages(queue, queueTasks as unknown as CronTask<ID>[]);

            // Emit onTaskScheduled for each task
            if (this.lifecycleProvider?.onTaskScheduled) {
                for (const task of queueTasks) {
                    this.emitLifecycleEvent(
                        this.lifecycleProvider.onTaskScheduled,
                        this.buildTaskContext(task)
                    );
                }
            }
        }

        const fQueues = Object.keys(diffedItems.future) as unknown as QueueName[];
        for (let i = 0; i < fQueues.length; i++) {
            const queue = fQueues[i];
            const queueTasks: CronTask<ID>[] = diffedItems.future[queue]
                .map((task) => {
                    const executor = this.taskQueuesManager.getExecutor(task.queue_id, task.type);
                    const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                    const id = shouldStoreOnFailure ? {id: this.databaseAdapter.generateId(),} : {}
                    return ({...id, ...task});
                });
            await this.taskStore.addTasksToScheduled(queueTasks);

            // Emit onTaskScheduled for each task
            if (this.lifecycleProvider?.onTaskScheduled) {
                for (const task of queueTasks) {
                    this.emitLifecycleEvent(
                        this.lifecycleProvider.onTaskScheduled,
                        this.buildTaskContext(task)
                    );
                }
            }
        }
    }

    async postProcessTasks({
                               failedTasks: failedTasksRaw,
                               newTasks,
                               successTasks
                           }: ProcessedTaskResult<ID>) {
        const tasksToRetry: CronTask<ID>[] = [];
        const finalFailedTasks: CronTask<ID>[] = [];
        let discardedTasksCount = 0;

        // Maximum retry delay cap to prevent unbounded delays
        const MAX_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

        for (const task of failedTasksRaw) {
            const taskRetryCount = (task.execution_stats && typeof task.execution_stats.retry_count === 'number') ? task.execution_stats.retry_count : 0;
            const taskRetryAfter = task.retry_after || 2000;
            const calculatedDelay = taskRetryAfter * Math.pow(taskRetryCount + 1, 2);
            const retryAfter = Math.min(calculatedDelay, MAX_RETRY_DELAY_MS);
            const executeAt = Date.now() + retryAfter;
            const maxRetries = this.getRetryCount(task);

            if (task.id && taskRetryCount < maxRetries) {
                tasksToRetry.push({
                    ...task,
                    status: 'scheduled',
                    execute_at: new Date(executeAt),
                    execution_stats: {
                        ...(task.execution_stats || {}),
                        retry_count: taskRetryCount + 1
                    }
                });
            } else if (task.id) {
                finalFailedTasks.push(task);
            } else if (taskRetryCount < maxRetries) {
                const shouldStoreOnFailure = this.taskQueuesManager.getExecutor(task.queue_id, task.type)?.store_on_failure;
                if (shouldStoreOnFailure) {
                    tasksToRetry.push({
                        ...task,
                        id: this.databaseAdapter.generateId(),
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

                // Emit onTaskExhausted for discarded tasks
                if (this.lifecycleProvider?.onTaskExhausted) {
                    const ctx = this.buildTaskContext(task);
                    const errorMessage = task.execution_stats?.last_error as string || 'Task exhausted all retries';
                    this.emitLifecycleEvent(
                        this.lifecycleProvider.onTaskExhausted,
                        {
                            ...ctx,
                            timing: {
                                queued_duration_ms: 0,
                                processing_duration_ms: 0,
                                total_duration_ms: Date.now() - (task.created_at?.getTime() || Date.now())
                            },
                            error: new Error(errorMessage),
                            total_attempts: taskRetryCount + 1
                        }
                    );
                }
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

            const batchStartTime = Date.now();
            const taskTypes = [...new Set(tasks.map(t => t.type))];

            // Emit batch started
            if (this.workerProvider?.onBatchStarted) {
                this.emitLifecycleEvent(
                    this.workerProvider.onBatchStarted,
                    {
                        ...this.buildWorkerInfo(),
                        batch_size: tasks.length,
                        task_types: taskTypes
                    }
                );
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
                        this.logger.warn(`Async queue full, requeueing task ${asyncTask.task.id} with 30s delay`);
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
                    throw err;
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

            // Update worker stats
            const batchDuration = Date.now() - batchStartTime;
            this.updateWorkerStats(successTasks.length, failedTasks.length, batchDuration);

            // Emit batch completed
            if (this.workerProvider?.onBatchCompleted) {
                this.emitLifecycleEvent(
                    this.workerProvider.onBatchCompleted,
                    {
                        ...this.buildWorkerInfo(),
                        batch_size: tasks.length,
                        succeeded: successTasks.length,
                        failed: failedTasks.length,
                        duration_ms: batchDuration
                    }
                );
            }

            this.logger.debug(`Completed processing for stream ${streamName}: ${successTasks.length} succeeded, ${failedTasks.length} failed, ${newTasks.length} new tasks, ${ignoredTasks.length} ignored`);
            return {failedTasks, newTasks, successTasks, asyncTasks, ignoredTasks};
        }, abortSignal);
    }

    taskProcessServer(abortSignal?: AbortSignal) {
        const queues = getEnabledQueues();
        this.enabledQueues = queues;

        // Emit worker started event
        if (!this.workerStarted) {
            this.workerStarted = true;
            this.emitWorkerStarted();
            this.startHeartbeat();
        }

        for (let i = 0; i < queues.length; i++) {
            this.logger.info(`Starting consumer for queue: ${queues[i]}`);
            this.startConsumingTasks(queues[i], abortSignal);
        }
        this.logger.info('Starting mature tasks processor');
        this.processMatureTasks(abortSignal);

        // Handle worker shutdown
        abortSignal?.addEventListener('abort', () => {
            this.stopHeartbeat();
            this.emitWorkerStopped('shutdown');
        });
    }

    private buildWorkerInfo(): WorkerInfo {
        return {
            worker_id: this.workerId,
            hostname: os.hostname(),
            pid: process.pid,
            started_at: this.workerStartedAt,
            enabled_queues: this.enabledQueues
        };
    }

    private emitWorkerStarted(): void {
        if (!this.workerProvider?.onWorkerStarted) return;
        this.emitLifecycleEvent(this.workerProvider.onWorkerStarted, this.buildWorkerInfo());
    }

    private emitWorkerStopped(reason: 'shutdown' | 'error' | 'idle_timeout'): void {
        if (!this.workerProvider?.onWorkerStopped) return;
        this.emitLifecycleEvent(
            this.workerProvider.onWorkerStopped,
            {
                ...this.buildWorkerInfo(),
                reason,
                final_stats: {...this.workerStats}
            }
        );
    }

    private emitWorkerHeartbeat(): void {
        if (!this.workerProvider?.onWorkerHeartbeat) return;

        const memUsage = process.memoryUsage();
        this.emitLifecycleEvent(
            this.workerProvider.onWorkerHeartbeat,
            {
                ...this.buildWorkerInfo(),
                stats: {...this.workerStats},
                memory_usage_mb: memUsage.heapUsed / 1024 / 1024
            }
        );
    }

    private startHeartbeat(): void {
        if (this.heartbeatTimer) return;

        const intervalMs = this.config.lifecycle?.heartbeat_interval_ms || 5000;
        this.heartbeatTimer = setInterval(() => {
            this.emitWorkerHeartbeat();
        }, intervalMs);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private updateWorkerStats(succeeded: number, failed: number, processingMs: number): void {
        this.workerStats.tasks_processed += succeeded + failed;
        this.workerStats.tasks_succeeded += succeeded;
        this.workerStats.tasks_failed += failed;
        this.totalProcessingMs += processingMs;

        if (this.workerStats.tasks_processed > 0) {
            this.workerStats.avg_processing_ms = this.totalProcessingMs / this.workerStats.tasks_processed;
        }
    }

    private emitLifecycleEvent<T>(
        callback: ((ctx: T) => void | Promise<void>) | undefined,
        ctx: T
    ): void {
        if (!callback) return;

        try {
            const result = callback(ctx);
            if (this.config.lifecycle?.mode === 'sync' && result instanceof Promise) {
                result.catch(err => {
                    this.logger.error(`[TQ] Lifecycle callback error: ${err}`);
                });
            } else if (result instanceof Promise) {
                result.catch(err => {
                    this.logger.error(`[TQ] Lifecycle callback error: ${err}`);
                });
            }
        } catch (err) {
            this.logger.error(`[TQ] Lifecycle callback error: ${err}`);
        }
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

                // Duplicate pick detection — batch check via mget, batch write via pipeline
                if (matureTasks.length > 0) {
                    try {
                        const tasksWithIds = matureTasks.filter(t => t.id);
                        const dedupKeys = tasksWithIds.map(t => `mature_dedup:${t.id}`);

                        if (dedupKeys.length > 0) {
                            const previousPickers = await this.cacheAdapter.mget(...dedupKeys);
                            for (let i = 0; i < dedupKeys.length; i++) {
                                if (previousPickers[i]) {
                                    const task = tasksWithIds[i];
                                    this.logger.warn(`DUPLICATE_MATURE_PICK: task ${task.id} (${task.type}) already picked by ${previousPickers[i]}`);
                                }
                            }

                            const pipeline = this.cacheAdapter.pipeline();
                            for (const key of dedupKeys) {
                                pipeline.set(key, INSTANCE_ID, 120);
                            }
                            await pipeline.exec();
                        }
                    } catch (err) {
                        this.logger.warn(`Duplicate pick detection failed (best-effort): ${err}`);
                    }
                }

                await this.addTasks(matureTasks);
            } catch (error) {
                this.logger.error(`Error processing tasks: ${error}`);
            } finally {
                await lockManager.release('task_processor');
            }

        }, 5000);

        // Clean up interval when aborted
        abortSignal?.addEventListener('abort', () => {
            this.logger.info('AbortSignal received, cleaning up mature task timer and sending final stats');
            if (this.matureTaskTimer) {
                clearInterval(this.matureTaskTimer);
                this.matureTaskTimer = null;
            }
            this.sendFinalStats()
                .catch(err => {
                    this.logger.error(`Failed to send final stats during shutdown: ${err}`);
                });
        });
    }

    private buildTaskContext(task: CronTask<ID>): TaskContext {
        const maxRetries = this.getRetryCount(task);
        const retryCount = (task.execution_stats && typeof task.execution_stats.retry_count === 'number')
            ? task.execution_stats.retry_count
            : 0;
        const payload = task.payload as Record<string, unknown>;

        return {
            task_id: task.id?.toString() || '',
            task_hash: payload?.task_hash as string | undefined,
            task_type: task.type,
            queue_id: task.queue_id,
            payload: this.config.lifecycle?.include_payload ? payload : {},
            attempt: retryCount + 1,
            max_retries: maxRetries,
            scheduled_at: task.created_at || new Date()
        };
    }

    processBatch(queueId: QueueName, processor: MessageConsumer<ID>, limit?: number, abortSignal?: AbortSignal): Promise<void> {
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

    private getRetryCount(task: CronTask<ID>): number {
        if (typeof task.retries === 'number') return task.retries;
        const executor = this.taskQueuesManager.getExecutor(task.queue_id, task.type);
        return executor?.default_retries ?? 0;
    }

    private async reportQueueStats(queueName: QueueName, forceSend: boolean = false): Promise<void> {
        const stats = this.queueStats.get(queueName);
        if (!stats) return;

        const total = stats.success + stats.failed + stats.async + stats.ignored;
        if (total === 0) return;

        if (!forceSend && total < STATS_THRESHOLD && stats.failed < FAILURE_THRESHOLD) return;

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