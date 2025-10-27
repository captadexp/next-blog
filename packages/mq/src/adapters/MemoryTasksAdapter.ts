import {BaseTask, ITasksAdapter} from "./TasksAdapter.js";

/**
 * In-memory implementation of ITasksAdapter for testing/development
 */
export class MemoryTasksAdapter<T = any> implements ITasksAdapter<T, string> {
    private tasks: Map<string, BaseTask<T>> = new Map();
    private idCounter = 0;

    generateTaskId(): string {
        return `task_${++this.idCounter}`;
    }

    async insertTasks(tasks: BaseTask<T>[]): Promise<void> {
        for (const task of tasks) {
            if (!task._id) {
                task._id = this.generateTaskId();
            }
            task.created_at = task.created_at || new Date();
            task.status = task.status || 'scheduled';
            this.tasks.set(task._id, task);
        }
    }

    async findScheduledTasks(queueId: string, limit: number): Promise<BaseTask<T>[]> {
        const now = new Date();
        const scheduled: BaseTask<T>[] = [];

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