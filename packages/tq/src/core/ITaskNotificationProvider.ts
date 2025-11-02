import type {QueueName} from "@supergrowthai/mq";

export interface TaskQueueStats {
    queueName: QueueName;
    success: number;
    failed: number;
    async: number;
    ignored: number;
    instanceId: string;
}

export interface DiscardedTaskInfo {
    count: number;
    last24HourTotal?: number;
}

export interface TaskErrorInfo {
    error: string;
    context: string;
    taskType?: string;
    queueName?: QueueName;
}

/**
 * Interface for handling task queue notifications
 * Consumers can implement this to receive events for stats, errors, and discarded tasks
 */
export interface ITaskNotificationProvider {
    /**
     * Called when queue statistics reach reporting thresholds
     */
    onQueueStats?(stats: TaskQueueStats): Promise<void>;

    /**
     * Called when tasks are discarded after exceeding retry limits
     */
    onTasksDiscarded?(info: DiscardedTaskInfo): Promise<void>;

    /**
     * Called when critical errors occur during task processing
     */
    onTaskError?(error: TaskErrorInfo): Promise<void>;

    /**
     * Called during final stats reporting (e.g., during shutdown)
     */
    onFinalStats?(allStats: TaskQueueStats[]): Promise<void>;
}