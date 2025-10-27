import {ObjectId} from "mongodb";
import {Logger, LogLevel} from "@supergrowthai/utils";
import TaskStore from "../task-store.js";
import {Actions} from "./Actions.js";
import {IMessageQueue, QueueName} from "@supergrowthai/mq";
import tId from "../../utils/task-id-gen.js";
import {CronTask} from "../../adapters/index.js";
import taskQueue from "../../index.js";

const logger = new Logger('AsyncActions', LogLevel.INFO);

export class AsyncActions {
    private readonly actions: Actions;
    private readonly taskId: string;

    constructor(private messageQueue: IMessageQueue, actions: Actions, task: CronTask<any>) {
        this.actions = actions;
        this.taskId = tId(task);
    }

    /**
     * Called when the async promise completes to execute the collected actions
     */
    async onPromiseFulfilled(): Promise<void> {
        // Extract this task's results (NO batch context for async tasks)
        const results = this.actions.extractTaskActions(this.taskId);

        // Fail fast if task didn't call success or fail
        const hasCompletion = results.successTasks.length > 0 || results.failedTasks.length > 0;
        if (!hasCompletion) {
            throw new Error(`Async task ${this.taskId} completed without calling success() or fail()`);
        }

        logger.info(`[AsyncActions] Processing results for async task ${this.taskId}: ` +
            `${results.successTasks.length} success, ${results.failedTasks.length} failed, ` +
            `${results.newTasks.length} new tasks`);

        // Process all results
        if (results.failedTasks.length > 0) {
            try {
                const failedTaskIds = results.failedTasks.map(task => task._id as ObjectId);
                await TaskStore.markTasksAsFailed(failedTaskIds);
                logger.info(`[AsyncActions] Marked ${results.failedTasks.length} tasks as failed in database`);
            } catch (err) {
                logger.error(`[AsyncActions] Failed to mark tasks as failed:`, err);
                throw err;
            }
        }

        if (results.successTasks.length > 0) {
            try {
                await TaskStore.markTasksAsSuccess(results.successTasks);
                logger.info(`[AsyncActions] Marked ${results.successTasks.length} tasks as success in database`);
            } catch (err) {
                logger.error(`[AsyncActions] Failed to mark tasks as success:`, err);
                throw err;
            }
        }

        if (results.newTasks.length > 0) {
            logger.info(`[AsyncActions] Scheduling ${results.newTasks.length} new tasks`);
            await this.scheduleNewTasks(results.newTasks);
        }
    }

    /**
     * Schedule new tasks - replicates the logic from task-handler's addTasks
     */
    private async scheduleNewTasks(tasks: CronTask<any>[]): Promise<void> {
        const now = new Date();
        const immediate: { [key in QueueName]?: CronTask<any>[] } = {};
        const future: CronTask<any>[] = [];

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
                const executor = taskQueue.getExecutor(task.queue_id, task.type);
                const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                const id = shouldStoreOnFailure ? {_id: new ObjectId()} : {};
                return {...id, ...task};
            });

            try {
                await this.messageQueue.addTasks(queue, queueTasks);
                logger.info(`[AsyncActions] Added ${queueTasks.length} immediate tasks to queue ${queue}`);
            } catch (err) {
                logger.error(`[AsyncActions] Failed to add tasks to queue ${queue}:`, err);
                throw err;
            }
        }

        // Process future tasks
        if (future.length > 0) {
            const futureTasks = future.map((task) => {
                const executor = taskQueue.getExecutor(task.queue_id, task.type);
                const shouldStoreOnFailure = executor?.store_on_failure ?? false;
                const id = shouldStoreOnFailure ? {_id: new ObjectId()} : {};
                return {...id, ...task};
            });

            try {
                await TaskStore.addTasksToScheduled(futureTasks);
                logger.info(`[AsyncActions] Added ${futureTasks.length} future tasks to database`);
            } catch (err) {
                logger.error(`[AsyncActions] Failed to add tasks to database:`, err);
                throw err;
            }
        }
    }
}