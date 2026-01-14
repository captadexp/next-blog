import {ITaskStorageAdapter, TaskStorageLifecycleConfig} from "./ITaskStorageAdapter";
import {CronTask} from "./types";
import type {ITaskLifecycleProvider} from "../core/lifecycle.js";

class InMemoryAdapter implements ITaskStorageAdapter<string> {
    private scheduledTasks: Map<string, CronTask<string>> = new Map();
    private lifecycleProvider?: ITaskLifecycleProvider;
    private lifecycleMode: 'sync' | 'async' = 'async';

    setLifecycleConfig(config: TaskStorageLifecycleConfig): void {
        this.lifecycleProvider = config.lifecycleProvider;
        this.lifecycleMode = config.mode || 'async';
    }

    private emitLifecycleEvent<T>(
        callback: ((ctx: T) => void | Promise<void>) | undefined,
        ctx: T
    ): void {
        if (!callback) return;
        try {
            const result = callback(ctx);
            if (result instanceof Promise) {
                result.catch(err => console.error(`[TQ] Lifecycle callback error: ${err}`));
            }
        } catch (err) {
            console.error(`[TQ] Lifecycle callback error: ${err}`);
        }
    }

    async addTasksToScheduled(tasks: CronTask<string>[]): Promise<CronTask<string>[]> {
        const addedTasks = tasks.map(task => {
            const id = task.id || this.generateId();
            const taskWithId = {...task};
            this.scheduledTasks.set(id, taskWithId);
            return taskWithId;
        });
        return addedTasks;
    }

    async getMatureTasks(timestamp: number): Promise<CronTask<string>[]> {
        const matureTasks: CronTask<string>[] = [];
        for (const [id, task] of Array.from(this.scheduledTasks.entries())) {
            if (task.execute_at.getTime() <= timestamp && task.status !== 'processing' && task.status !== 'executed') {
                matureTasks.push(task);
            }
        }
        return matureTasks;
    }

    async markTasksAsProcessing(tasks: CronTask<string>[], processingStartedAt: Date): Promise<void> {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task.id!);
            if (existingTask) {
                existingTask.status = 'processing';
                existingTask.processing_started_at = processingStartedAt;
                this.scheduledTasks.set(task.id!, existingTask);
            }
        }
    }

    async markTasksAsExecuted(tasks: CronTask<string>[]): Promise<void> {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task.id!);
            if (existingTask) {
                existingTask.status = 'executed';
                existingTask.execute_at = new Date();
                this.scheduledTasks.set(task.id!, existingTask);
            }
        }
    }

    async markTasksAsFailed(tasks: CronTask<string>[]): Promise<void> {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task.id!);
            if (existingTask) {
                existingTask.status = 'failed';
                existingTask.execution_stats = {...existingTask.execution_stats, failed_at: new Date()};
                this.scheduledTasks.set(task.id!, existingTask);
            }
        }
    }

    async getTasksByIds(taskIds: string[]): Promise<CronTask<string>[]> {
        return taskIds.map(id => this.scheduledTasks.get(id)).filter(Boolean) as CronTask<string>[];
    }

    async updateTasks(updates: Array<{ id: string; updates: Partial<CronTask<string>> }>): Promise<void> {
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

    async markTasksAsIgnored(tasks: CronTask<string>[]) {
        for (const task of tasks) {
            const existingTask = this.scheduledTasks.get(task.id!);
            if (existingTask) {
                existingTask.status = 'ignored';
                existingTask.execution_stats = {...existingTask.execution_stats, ignore_reason: "unknown type"};
                this.scheduledTasks.set(task.id!, existingTask);
            }
        }
    }
}

export {InMemoryAdapter}