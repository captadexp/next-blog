import type {CronTask, ITaskStorageAdapter} from "../adapters";
import {getEnvironmentQueueName} from "@supergrowthai/mq";

class TaskStore<ID> {

    constructor(private databaseAdapter: ITaskStorageAdapter<ID>) {
    }

    /**
     * Adds multiple tasks to the scheduled queue
     */
    async addTasksToScheduled(tasks: CronTask<ID>[]): Promise<CronTask<ID>[]> {
        if (!tasks.length) return [];

        const transformedTasks = tasks.map((task) => ({
            id: task.id,
            type: task.type,
            queue_id: getEnvironmentQueueName(task.queue_id),
            payload: task.payload,
            execute_at: task.execute_at,
            expires_at: task.expires_at,
            status: 'scheduled' as const,
            task_group: task.task_group,
            task_hash: task.task_hash,
            retries: task.retries || 0,
            retry_after: task.retry_after,
            execution_stats: task.execution_stats,
            created_at: task.created_at || new Date(),
            updated_at: task.updated_at || new Date(),
            processing_started_at: task.processing_started_at || new Date(),
            force_store: task.force_store
        })) as CronTask<ID>[];

        return await this.databaseAdapter.addTasksToScheduled(transformedTasks);
    }

    /**
     * Gets mature tasks that are ready to be processed
     * Implements a two-phase approach:
     * 1. Reset stale processing tasks
     * 2. Fetch and mark new mature tasks
     */
    async getMatureTasks(timestamp: number): Promise<CronTask<ID>[]> {
        return await this.databaseAdapter.getMatureTasks(timestamp);
    }

    /**
     * Marks tasks as processing with current timestamp
     */
    async markTasksAsProcessing(tasks: CronTask<ID>[]): Promise<void> {
        await this.databaseAdapter.markTasksAsProcessing(tasks, new Date());
    }

    /**
     * Marks tasks as executed/completed
     */
    async markTasksAsExecuted(tasks: CronTask<ID>[]): Promise<void> {
        await this.databaseAdapter.markTasksAsExecuted(tasks);
    }

    /**
     * Marks tasks as failed — uses upsert to handle store_on_failure tasks
     * that were never persisted to DB
     */
    async markTasksAsFailed(tasks: CronTask<ID>[]): Promise<void> {
        const tasksWithStatus = tasks.map(task => ({
            ...task,
            status: 'failed' as const,
            execution_stats: {
                ...(task.execution_stats || {}),
                failed_at: new Date()
            }
        }));
        await this.databaseAdapter.upsertTasks(tasksWithStatus);
    }

    /**
     * Marks tasks as successful/completed
     */
    async markTasksAsSuccess(tasks: CronTask<ID>[]): Promise<void> {
        await this.databaseAdapter.markTasksAsExecuted(tasks);
    }

    /**
     * Marks tasks as ignored with proper task context
     */
    async markTasksAsIgnored(tasks: CronTask<ID>[]): Promise<void> {
        const tasksWithStatus = tasks.map(task => ({
            ...task,
            status: 'ignored' as const,
            execution_stats: {
                ...(task.execution_stats || {}),
                error: 'No executor found for task type',
                ignored_reason: 'unknown_executor',
                ignored_at: new Date()
            }
        }));

        await this.databaseAdapter.upsertTasks(tasksWithStatus);
    }

    /**
     * Updates multiple tasks with specific updates
     */
    async updateTasks(updates: Array<{ id: ID; updates: Partial<CronTask<ID>> }>): Promise<void> {
        await this.databaseAdapter.updateTasks(updates);
    }

    /**
     * Gets tasks by their IDs
     */
    async getTasksByIds(taskIds: ID[]): Promise<CronTask<ID>[]> {
        return await this.databaseAdapter.getTasksByIds(taskIds);
    }

    /**
     * Gets cleanup statistics
     */
    async getCleanupStats(): Promise<{ orphanedTasks: number; expiredTasks: number }> {
        return await this.databaseAdapter.getCleanupStats();
    }

    /**
     * Cleans up orphaned and expired tasks
     */
    async cleanupTasks(): Promise<void> {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const now = new Date();

        await this.databaseAdapter.cleanupTasks(twoDaysAgo, now);
    }

    /**
     * Updates tasks for retry — uses upsert to handle store_on_failure tasks
     * that were never persisted to DB
     */
    async updateTasksForRetry(tasks: CronTask<ID>[]): Promise<void> {
        await this.databaseAdapter.upsertTasks(tasks);
    }

}

export {TaskStore};