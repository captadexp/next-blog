import {CronTask} from "../../adapters";

/**
 * Interface for managing async tasks that exceed timeout thresholds
 * Implementation should be in tq package to access executor configs
 */
export interface IAsyncTaskManager<T = any, ID = any> {
    /**
     * Hand off a running task to async management
     * @param message The message that is still being processed
     * @param runningPromise The promise of the still-running task
     * @returns true if accepted, false if queue is full
     */
    handoffTask(message: CronTask<ID>, runningPromise: Promise<void>): boolean;

    /**
     * Gracefully shutdown the async task manager
     */
    shutdown(abortSignal?: AbortSignal): Promise<void>;

    isHandedOff(taskId: ID): boolean;

    canAcceptTask(): boolean;

    getMetrics(): {
        activeTaskCount: number;
        totalHandedOff: number;
        [key: string]: unknown;
    };
}