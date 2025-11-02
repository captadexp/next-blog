import {ITaskStorageAdapter} from "./ITaskStorageAdapter";
import {CronTask} from "./types";

class InMemoryAdapter<PAYLOAD> implements ITaskStorageAdapter<PAYLOAD, string> {
    private scheduledTasks: Map<string, CronTask<PAYLOAD, string>> = new Map();

    async addTasksToScheduled(tasks: CronTask<PAYLOAD, string>[]): Promise<CronTask<PAYLOAD, string>[]> {
        const addedTasks = tasks.map(task => {
            const id = task._id;
            const taskWithId = {...task};
            this.scheduledTasks.set(id, taskWithId);
            return taskWithId;
        });
        return addedTasks;
    }

    async getMatureTasks(timestamp: number): Promise<CronTask<PAYLOAD, string>[]> {
        const matureTasks: CronTask[] = [];
        for (const [id, task] of Array.from(this.scheduledTasks.entries())) {
            if (task.execute_at.getTime() <= timestamp && task.status !== 'processing' && task.status !== 'executed') {
                matureTasks.push(task);
            }
        }
        return matureTasks;
    }

    async markTasksAsProcessing(tasks: CronTask<PAYLOAD, string>[], processingStartedAt: Date): Promise<void> {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task._id);
            if (existingTask) {
                existingTask.status = 'processing';
                existingTask.processing_started_at = processingStartedAt;
                this.scheduledTasks.set(task._id, existingTask);
            }
        }
    }

    async markTasksAsExecuted(tasks: CronTask<PAYLOAD, string>[]): Promise<void> {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task._id);
            if (existingTask) {
                existingTask.status = 'executed';
                existingTask.execute_at = new Date();
                this.scheduledTasks.set(task._id, existingTask);
            }
        }
    }

    async markTasksAsFailed(tasks: CronTask<PAYLOAD, string>[]): Promise<void> {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task._id);
            if (existingTask) {
                existingTask.status = 'failed';
                existingTask.execution_stats = {...existingTask.execution_stats, failed_at: new Date()};
                this.scheduledTasks.set(task._id, existingTask);
            }
        }
    }

    async getTasksByIds(taskIds: string[]): Promise<CronTask<PAYLOAD, string>[]> {
        return taskIds.map(id => this.scheduledTasks.get(id)).filter(Boolean) as CronTask<PAYLOAD, string>[];
    }

    async updateTasks(updates: Array<{ id: string; updates: Partial<CronTask<PAYLOAD, string>> }>): Promise<void> {
        for (const {id, updates: taskUpdates} of updates) {
            const task = this.scheduledTasks.get(id);
            if (task) {
                Object.assign(task, taskUpdates);
                this.scheduledTasks.set(id, task);
            }
        }
    }

    async getCleanupStats(): Promise<{ orphanedTasks: number; expiredTasks: number }> {
        let orphanedTasks = 0;
        let expiredTasks = 0;
        const now = Date.now();

        for (const task of Array.from(this.scheduledTasks.values())) {
            if (task.status === 'processing' && task.processing_started_at && (now - task.processing_started_at.getTime()) > 300000) {
                orphanedTasks++;
            }
            if (task.expires_at && now > task.expires_at.getTime()) {
                expiredTasks++;
            }
        }

        return {orphanedTasks, expiredTasks};
    }

    async cleanupTasks(orphanedBefore: Date, expiredBefore: Date): Promise<void> {
        for (const [id, task] of Array.from(this.scheduledTasks.entries())) {
            const shouldDelete =
                (task.status === 'processing' && task.processing_started_at && task.processing_started_at < orphanedBefore) ||
                (task.expires_at && task.expires_at < expiredBefore);

            if (shouldDelete) {
                this.scheduledTasks.delete(id);
            }
        }
    }

    async initialize(): Promise<void> {
        // No initialization needed for memory adapter
    }

    async close(): Promise<void> {
        this.scheduledTasks.clear();
    }

    generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    async markTasksAsIgnored(tasks: CronTask<PAYLOAD, string>[]) {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task._id);
            if (existingTask) {
                existingTask.status = 'ignored';
                existingTask.execution_stats = {...existingTask.execution_stats, ignore_reason: "unknown type"};
                this.scheduledTasks.set(task._id, existingTask);
            }
        }
    }
}

export {InMemoryAdapter}