import {IDatabaseAdapter} from "./IDatabaseAdapter";
import {CronTask} from "./types";

class InMemoryAdapter implements IDatabaseAdapter<string> {
    private scheduledTasks: Map<string, CronTask> = new Map();

    async addTasksToScheduled(tasks: CronTask[]): Promise<CronTask[]> {
        const addedTasks = tasks.map(task => {
            const id = task._id;
            const taskWithId = {...task};
            this.scheduledTasks.set(id, taskWithId);
            return taskWithId;
        });
        return addedTasks;
    }

    async getMatureTasks(timestamp: number): Promise<any[]> {
        const matureTasks: CronTask[] = [];
        for (const [id, task] of Array.from(this.scheduledTasks.entries())) {
            if (task.execute_at.getTime() <= timestamp && task.status !== 'processing' && task.status !== 'executed') {
                matureTasks.push(task);
            }
        }
        return matureTasks;
    }

    async markTasksAsProcessing(taskIds: string[], processingStartedAt: Date): Promise<void> {
        for (const id of taskIds) {
            const task = this.scheduledTasks.get(id);
            if (task) {
                task.status = 'processing';
                task.processing_started_at = processingStartedAt;
                this.scheduledTasks.set(id, task);
            }
        }
    }

    async markTasksAsExecuted(taskIds: string[]): Promise<void> {
        for (const id of taskIds) {
            const task = this.scheduledTasks.get(id);
            if (task) {
                task.status = 'executed';
                task.execute_at = new Date();
                this.scheduledTasks.set(id, task);
            }
        }
    }

    async markTasksAsFailed(taskIds: string[]): Promise<void> {
        for (const id of taskIds) {
            const task = this.scheduledTasks.get(id);
            if (task) {
                task.status = 'failed';
                task.execution_stats = {...task.execution_stats, failed_at: new Date()};
                this.scheduledTasks.set(id, task);
            }
        }
    }

    async getTasksByIds(taskIds: string[]): Promise<any[]> {
        return taskIds.map(id => this.scheduledTasks.get(id)).filter(Boolean);
    }

    async updateTasks(updates: Array<{ id: string; updates: Partial<any> }>): Promise<void> {
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
}

export {InMemoryAdapter}