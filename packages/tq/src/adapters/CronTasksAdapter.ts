import {BaseTask, ITasksAdapter} from "@supergrowthai/mq";

/**
 * Extended task structure for cron tasks with additional fields
 */
export interface CronTask<T = any, ID = any> extends BaseTask<T, ID> {
    _id: ID;
}

/**
 * Extended TasksAdapter interface specifically for cron tasks
 * This extends the base ITasksAdapter with TQ-specific requirements
 */
export interface ICronTasksAdapter<T = any> extends ITasksAdapter<T> {
    /**
     * Insert multiple cron tasks into storage
     */
    insertTasks(tasks: CronTask<T>[]): Promise<void>;

    /**
     * Find cron tasks ready for processing
     */
    findScheduledTasks(queueId: string, limit: number): Promise<CronTask<T>[]>;
}

/**
 * In-memory implementation of ICronTasksAdapter for testing/development
 */
export class MemoryCronTasksAdapter<T = any> implements ICronTasksAdapter<T> {
    private tasks: Map<string, CronTask<T>> = new Map();
    private idCounter = 0;

    generateTaskId(): string {
        return `cron_task_${++this.idCounter}`;
    }

    async insertTasks(tasks: CronTask<T>[]): Promise<void> {
        for (const task of tasks) {
            if (!task._id) {
                task._id = this.generateTaskId();
            }
            task.created_at = task.created_at || new Date();
            task.status = task.status || 'scheduled';
            this.tasks.set(task._id, task);
        }
    }

    async findScheduledTasks(queueId: string, limit: number): Promise<CronTask<T>[]> {
        const now = new Date();
        const scheduled: CronTask<T>[] = [];

        for (const task of this.tasks.values()) {
            if (scheduled.length >= limit) break;

            if (task.queue_id === queueId &&
                task.status === 'scheduled' &&
                (!task.execute_at || task.execute_at <= now)) {
                scheduled.push(task);
            }
        }

        return scheduled;
    }

    async markTasksAsProcessing(taskIds: any[]): Promise<void> {
        for (const id of taskIds) {
            const task = this.tasks.get(id);
            if (task) {
                task.status = 'processing';
                task.processing_started_at = new Date();
            }
        }
    }

    async markTasksAsExecuted(taskIds: any[]): Promise<void> {
        for (const id of taskIds) {
            const task = this.tasks.get(id);
            if (task) {
                task.status = 'executed';
                task.updated_at = new Date();
            }
        }
    }

    async markTasksAsFailed(taskIds: any[]): Promise<void> {
        for (const id of taskIds) {
            const task = this.tasks.get(id);
            if (task) {
                task.status = 'failed';
                task.updated_at = new Date();
                task.retries = (task.retries || 0) + 1;
            }
        }
    }
}