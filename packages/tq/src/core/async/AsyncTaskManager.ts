import {Logger, LogLevel} from "@supergrowthai/utils";
import {CronTask} from "../../adapters";
import {IAsyncTaskManager} from "./async-task-manager";

const logger = new Logger('AsyncTaskManager', LogLevel.INFO);

interface AsyncTaskEntry<PAYLOAD = any, ID = any> {
    task: CronTask<PAYLOAD, ID>;
    promise: Promise<void>;
    startTime: number;
}

export class AsyncTaskManager<PAYLOAD = any, ID = any> implements IAsyncTaskManager<PAYLOAD, ID> {
    private asyncTasks: Map<string, AsyncTaskEntry<PAYLOAD, ID>> = new Map();
    private handedOffTaskIds: Set<string> = new Set();
    private readonly maxTasks: number;
    private totalHandedOff: number = 0;

    constructor(maxTasks: number = 100) {
        this.maxTasks = maxTasks;
        logger.info(`AsyncTaskManager initialized with max ${maxTasks} concurrent tasks`);
    }

    handoffTask(task: CronTask<PAYLOAD, ID>, runningPromise: Promise<void>): boolean {
        // Require _id for async tasks - we need to track completion in DB
        if (!task._id) {
            logger.error(`Cannot hand off task without _id (type: ${task.type})`);
            return false;
        }

        const taskId = task._id.toString();

        // Check if queue is full
        if (this.asyncTasks.size >= this.maxTasks) {
            logger.warn(`Async queue full (${this.asyncTasks.size}/${this.maxTasks}), rejecting task ${taskId}`);
            return false;
        }

        // Add to tracking
        const entry: AsyncTaskEntry<PAYLOAD, ID> = {
            task: task,
            promise: runningPromise,
            startTime: Date.now()
        };

        this.asyncTasks.set(taskId, entry);
        this.handedOffTaskIds.add(taskId);
        this.totalHandedOff++;
        logger.info(`Task ${taskId} (${task.type}) handed off to async processing (queue: ${this.asyncTasks.size}/${this.maxTasks})`);

        // Monitor completion - AsyncActions handles success/fail
        runningPromise
            .then(() => {
                const duration = Date.now() - entry.startTime;
                logger.info(`Async task ${taskId} completed after ${duration}ms`);
            })
            .catch(error => {
                const duration = Date.now() - entry.startTime;
                logger.error(`Async task ${taskId} errored after ${duration}ms:`, error);
            })
            .finally(() => {
                this.asyncTasks.delete(taskId);
                this.handedOffTaskIds.delete(taskId);
                logger.debug(`Task ${taskId} removed from async queue (remaining: ${this.asyncTasks.size})`);
            });

        return true;
    }


    async shutdown(abortSignal?: AbortSignal): Promise<void> {
        logger.info(`Shutting down AsyncTaskManager with ${this.asyncTasks.size} tasks still running`);

        // Wait a bit for tasks to complete
        const gracePeriod = 10000; // 10 seconds
        logger.info(`Waiting ${gracePeriod}ms for tasks to complete...`);

        // Use AbortSignal to support early termination
        if (abortSignal?.aborted) {
            logger.info('AbortSignal already aborted, skipping grace period');
        } else {
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(resolve, gracePeriod);

                // Resolve early if aborted
                abortSignal?.addEventListener('abort', () => {
                    logger.info('AbortSignal received during shutdown grace period');
                    clearTimeout(timeout);
                    resolve();
                });
            });
        }

        if (this.asyncTasks.size > 0) {
            logger.warn(`${this.asyncTasks.size} tasks still running after grace period, they will continue in background`);

            // Log remaining tasks
            for (const [taskId, entry] of this.asyncTasks) {
                const runtime = Date.now() - entry.startTime;
                logger.info(`Task ${taskId} (${entry.task.type}) has been running for ${runtime}ms`);
            }
        }

        logger.info('AsyncTaskManager shutdown complete');
    }

    getMetrics() {
        return {
            activeTaskCount: this.asyncTasks.size,
            totalHandedOff: this.totalHandedOff,
            maxTasks: this.maxTasks,
            utilizationPercent: (this.asyncTasks.size / this.maxTasks) * 100
        };
    }

    isHandedOff(taskId: ID): boolean {
        return this.handedOffTaskIds.has(String(taskId));
    }

    canAcceptTask(): boolean {
        return this.asyncTasks.size < this.maxTasks;
    }
}