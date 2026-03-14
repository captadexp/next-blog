import {Logger, LogLevel} from "@supergrowthai/utils";
import {TaskStore} from "../TaskStore.js";
import {Actions} from "../Actions.js";
import {IMessageQueue, QueueName} from "@supergrowthai/mq";
import {tId} from "../../utils/task-id-gen.js";
import {CronTask} from "../../adapters";
import {TaskQueuesManager} from "../TaskQueuesManager.js";
import {computeRetryDecision} from "./retry-utils.js";
import type {IEntityProjectionProvider, EntityProjectionConfig, EntityTaskProjection} from "../entity/IEntityProjectionProvider.js";
import {buildProjection, syncProjections} from "../entity/IEntityProjectionProvider.js";
import type {FlowMiddleware} from "../flow/FlowMiddleware.js";

const logger = new Logger('AsyncActions', LogLevel.INFO);

/**
 * Interface for emitting async task lifecycle events.
 * Constructed from the sync-path's ITaskLifecycleProvider by TaskRunner.
 */
export interface AsyncLifecycleEmitter {
    onCompleted(task: CronTask<any>, result?: unknown): void;
    onFailed(task: CronTask<any>, error: Error, willRetry: boolean): void;
    onScheduled?(task: CronTask<any>): void;
}

export class AsyncActions<ID = any> {
    private readonly actions: Actions<ID>;
    private readonly taskId: string;

    constructor(
        private messageQueue: IMessageQueue<ID>,
        private taskStore: TaskStore<ID>,
        private taskQueue: TaskQueuesManager<ID>,
        actions: Actions<ID>,
        private task: CronTask<ID>,
        private generateId: () => ID,
        private lifecycleEmitter?: AsyncLifecycleEmitter,
        private entityProjection?: IEntityProjectionProvider<ID>,
        private entityProjectionConfig?: EntityProjectionConfig,
        private flowMiddleware?: FlowMiddleware<ID>
    ) {
        this.actions = actions;
        this.taskId = tId(task);
    }

    /**
     * Called when the async promise completes to execute the collected actions
     */
    async onPromiseFulfilled(): Promise<void> {
        // Extract this task's results (NO batch context for async tasks)
        const results = this.actions.extractTaskActions(this.taskId);

        // If task didn't call success or fail, default to fail (forgetful executor)
        const hasCompletion = results.successTasks.length > 0 || results.failedTasks.length > 0;
        if (!hasCompletion) {
            logger.warn(`Async task ${this.taskId} completed without calling success() or fail() — defaulting to fail`);
            results.failedTasks.push({
                ...this.task,
                execution_stats: {
                    ...(this.task.execution_stats || {}),
                    last_error: `Async task ${this.taskId} completed without calling success() or fail()`,
                }
            });
        }

        logger.info(`[AsyncActions] Processing results for async task ${this.taskId}: ` +
            `${results.successTasks.length} success, ${results.failedTasks.length} failed, ` +
            `${results.newTasks.length} new tasks`);

        // Process failed tasks with retry logic
        if (results.failedTasks.length > 0) {
            for (const failedTask of results.failedTasks) {
                try {
                    await this.processFailedTaskWithRetry(failedTask);
                } catch (err) {
                    logger.error(`[AsyncActions] Failed to process failed task:`, err);
                    throw err;
                }
            }
        }

        if (results.successTasks.length > 0) {
            try {
                await this.taskStore.markTasksAsSuccess(results.successTasks);
                logger.info(`[AsyncActions] Marked ${results.successTasks.length} tasks as success in database`);

                // Emit lifecycle event for each success
                if (this.lifecycleEmitter) {
                    for (const task of results.successTasks) {
                        try {
                            this.lifecycleEmitter.onCompleted(task, task.execution_result);
                        } catch (err) {
                            logger.error(`[AsyncActions] Lifecycle onCompleted error:`, err);
                        }
                    }
                }

                // RFC-003: Emit 'executed' entity projections for async success tasks
                await syncProjections(
                    results.successTasks
                        .map(t => buildProjection(t, 'executed', {
                            includePayload: this.entityProjectionConfig?.includePayload,
                            result: t.execution_result,
                        }))
                        .filter((p): p is EntityTaskProjection<ID> => p !== null),
                    this.entityProjection,
                    logger
                );
            } catch (err) {
                logger.error(`[AsyncActions] Failed to mark tasks as success:`, err);
                throw err;
            }
        }

        // RFC-002: Flow middleware — process terminal tasks for barrier tracking and join dispatch
        if (this.flowMiddleware) {
            try {
                // Collect final failures (not retries) for flow middleware
                const finalFailedTasks: CronTask<ID>[] = [];
                for (const failedTask of results.failedTasks) {
                    const executor = this.taskQueue.getExecutor(failedTask.queue_id, failedTask.type);
                    const maxRetries = failedTask.retries ?? executor?.default_retries ?? 0;
                    const decision = computeRetryDecision(failedTask, maxRetries);
                    // Only include final failures (no more retries)
                    if (decision.action !== 'retry' || !decision.retryTask) {
                        finalFailedTasks.push(failedTask);
                    }
                }

                if (results.successTasks.length > 0 || finalFailedTasks.length > 0) {
                    const flowResult = await this.flowMiddleware.onPostProcess({
                        successTasks: results.successTasks,
                        failedTasks: finalFailedTasks,
                    });

                    if (flowResult.projections.length > 0 && this.entityProjection) {
                        await syncProjections(flowResult.projections, this.entityProjection, logger);
                    }

                    if (flowResult.joinTasks.length > 0) {
                        await this.scheduleNewTasks(flowResult.joinTasks);
                    }
                }
            } catch (err) {
                logger.error(`[AsyncActions] Flow middleware failed (non-fatal): ${err}`);
            }
        }

        if (results.newTasks.length > 0) {
            logger.info(`[AsyncActions] Scheduling ${results.newTasks.length} new tasks`);
            await this.scheduleNewTasks(results.newTasks);
        }
    }

    /**
     * Process a failed task through the retry pipeline
     */
    private async processFailedTaskWithRetry(failedTask: CronTask<ID>): Promise<void> {
        const executor = this.taskQueue.getExecutor(failedTask.queue_id, failedTask.type);
        const maxRetries = failedTask.retries ?? executor?.default_retries ?? 0;
        const decision = computeRetryDecision(failedTask, maxRetries);
        const willRetry = decision.action === 'retry' && !!decision.retryTask;

        if (willRetry) {
            logger.info(`[AsyncActions] Retrying async task ${this.taskId} (attempt ${(decision.retryTask!.execution_stats?.retry_count as number) || 0})`);
            await this.taskStore.updateTasksForRetry([decision.retryTask!]);
        } else {
            logger.info(`[AsyncActions] Async task ${this.taskId} exhausted retries, marking as failed`);
            await this.taskStore.markTasksAsFailed([failedTask]);

            // RFC-003: Emit 'failed' entity projection for final-failed async tasks
            const errorMsg = failedTask.execution_stats?.last_error as string || 'Task failed';
            const p = buildProjection(failedTask, 'failed', {
                includePayload: this.entityProjectionConfig?.includePayload,
                error: errorMsg,
            });
            if (p) await syncProjections([p], this.entityProjection, logger);
        }

        if (this.lifecycleEmitter) {
            const errorMsg = failedTask.execution_stats?.last_error as string || 'Task failed';
            try {
                this.lifecycleEmitter.onFailed(failedTask, new Error(errorMsg), willRetry);
            } catch (err) {
                logger.error(`[AsyncActions] Lifecycle onFailed error:`, err);
            }
        }
    }

    /**
     * Schedule new tasks - replicates the logic from task-handler's addTasks
     */
    private async scheduleNewTasks(tasks: CronTask<ID>[]): Promise<void> {
        const now = new Date();
        const immediate: { [key in QueueName]?: CronTask<ID>[] } = {};
        const future: CronTask<ID>[] = [];

        // Split tasks by timing
        for (const task of tasks) {
            const timeDiff = (task.execute_at.getTime() - now.getTime()) / 1000 / 60; // in minutes

            if (timeDiff > 2) {
                // Future task - goes to database
                future.push(task);
            } else {
                // Immediate task - goes to message queue
                const queue = task.queue_id;
                if (!immediate[queue]) {
                    immediate[queue] = [];
                }
                immediate[queue].push(task);
            }
        }

        // Process immediate tasks
        const iQueues = Object.keys(immediate) as QueueName[];
        for (const queue of iQueues) {
            const queueTasks = immediate[queue]!.map((task) => {
                const executor = this.taskQueue.getExecutor(task.queue_id, task.type);
                const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                const id = shouldStoreOnFailure ? {id: this.generateId()} : {};
                const partitionKey = executor?.getPartitionKey?.(task);
                return {...id, ...task, ...(partitionKey ? {partition_key: partitionKey} : {})};
            });

            // Entity projections for scheduled tasks (mirrors TaskHandler.addTasks pattern)
            if (this.entityProjection) {
                try {
                    const projections = queueTasks
                        .filter(t => t.entity)
                        .map(t => buildProjection(t, 'scheduled', {includePayload: this.entityProjectionConfig?.includePayload}))
                        .filter((p): p is EntityTaskProjection<ID> => p !== null);
                    await syncProjections(projections, this.entityProjection, logger);
                } catch (err) {
                    logger.error(`[AsyncActions] Entity projection failed (non-fatal): ${err}`);
                }
            }

            try {
                await this.messageQueue.addMessages(queue, queueTasks as CronTask<ID>[]);
                logger.info(`[AsyncActions] Added ${queueTasks.length} immediate tasks to queue ${queue}`);
            } catch (err) {
                logger.error(`[AsyncActions] Failed to add tasks to queue ${queue}:`, err);
                throw err;
            }

            // Emit onScheduled lifecycle event for each task
            if (this.lifecycleEmitter?.onScheduled) {
                for (const task of queueTasks) {
                    try {
                        this.lifecycleEmitter.onScheduled(task);
                    } catch (err) {
                        logger.error(`[AsyncActions] Lifecycle onScheduled error:`, err);
                    }
                }
            }
        }

        // Process future tasks
        if (future.length > 0) {
            const futureTasks = future.map((task) => {
                const executor = this.taskQueue.getExecutor(task.queue_id, task.type);
                const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                const id = shouldStoreOnFailure ? {id: this.generateId()} : {};
                const partitionKey = executor?.getPartitionKey?.(task);
                return {...id, ...task, ...(partitionKey ? {partition_key: partitionKey} : {})};
            });

            // Entity projections for future scheduled tasks
            if (this.entityProjection) {
                try {
                    const projections = futureTasks
                        .filter(t => t.entity)
                        .map(t => buildProjection(t, 'scheduled', {includePayload: this.entityProjectionConfig?.includePayload}))
                        .filter((p): p is EntityTaskProjection<ID> => p !== null);
                    await syncProjections(projections, this.entityProjection, logger);
                } catch (err) {
                    logger.error(`[AsyncActions] Entity projection failed (non-fatal): ${err}`);
                }
            }

            try {
                await this.taskStore.addTasksToScheduled(futureTasks);
                logger.info(`[AsyncActions] Added ${futureTasks.length} future tasks to database`);
            } catch (err) {
                logger.error(`[AsyncActions] Failed to add tasks to database:`, err);
                throw err;
            }

            // Emit onScheduled lifecycle event for future tasks
            if (this.lifecycleEmitter?.onScheduled) {
                for (const task of futureTasks) {
                    try {
                        this.lifecycleEmitter.onScheduled(task);
                    } catch (err) {
                        logger.error(`[AsyncActions] Lifecycle onScheduled error:`, err);
                    }
                }
            }
        }
    }
}
