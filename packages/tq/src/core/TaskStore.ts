import type {CronTask, ITaskStorageAdapter} from "../adapters";
import {getEnvironmentQueueName} from "@supergrowthai/mq";

class TaskStore<PAYLOAD, ID> {

    constructor(private databaseAdapter: ITaskStorageAdapter<PAYLOAD, ID>) {
    }

    /**
     * Adds multiple tasks to the scheduled queue
     */
    async addTasksToScheduled(tasks: CronTask<PAYLOAD, ID>[]): Promise<CronTask<PAYLOAD, ID>[]> {
        if (!tasks.length) return [];

        const transformedTasks: CronTask<PAYLOAD, ID>[] = tasks.map((task) => ({
            _id: task._id,
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
        }));

        return await this.databaseAdapter.addTasksToScheduled(transformedTasks);
    }

    /**
     * Gets mature tasks that are ready to be processed
     * Implements a two-phase approach:
     * 1. Reset stale processing tasks
     * 2. Fetch and mark new mature tasks
     */
    async getMatureTasks(timestamp: number): Promise<CronTask<PAYLOAD, ID>[]> {
        return await this.databaseAdapter.getMatureTasks(timestamp);
    }

    /**
     * Marks tasks as processing with current timestamp
     */
    async markTasksAsProcessing(tasks: CronTask<PAYLOAD, ID>[]): Promise<void> {
        await this.databaseAdapter.markTasksAsProcessing(tasks, new Date());
    }

    /**
     * Marks tasks as executed/completed
     */
    async markTasksAsExecuted(tasks: CronTask<PAYLOAD, ID>[]): Promise<void> {
        await this.databaseAdapter.markTasksAsExecuted(tasks);
    }

    /**
     * Marks tasks as failed and increments retry count
     */
    async markTasksAsFailed(tasks: CronTask<PAYLOAD, ID>[]): Promise<void> {
        await this.databaseAdapter.markTasksAsFailed(tasks);
    }

    /**
     * Marks tasks as successful/completed
     */
    async markTasksAsSuccess(tasks: CronTask<PAYLOAD, ID>[]): Promise<void> {
        await this.databaseAdapter.markTasksAsExecuted(tasks);
    }

    /**
     * Marks tasks as ignored with proper task context
     */
    async markTasksAsIgnored(tasks: CronTask<PAYLOAD, ID>[]): Promise<void> {

        //                             error: 'No executor found for task type',
        //                             ignored_reason: 'unknown_executor',
        //                             ignored_at: new Date()
        // todo we cant update execution stats
        await this.databaseAdapter.markTasksAsIgnored(tasks);
    }

    /**
     * Updates multiple tasks with specific updates
     */
    async updateTasks(updates: Array<{ id: ID; updates: Partial<CronTask<PAYLOAD, ID>> }>): Promise<void> {
        await this.databaseAdapter.updateTasks(updates);
    }

    /**
     * Gets tasks by their IDs
     */
    async getTasksByIds(taskIds: ID[]): Promise<CronTask<PAYLOAD, ID>[]> {
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
     * Updates tasks for retry with new execution time and retry count
     */
    async updateTasksForRetry(tasks: CronTask<PAYLOAD, ID>[]): Promise<void> {
        const updates = tasks.map(task => ({
            id: task._id as ID,
            updates: {
                execute_at: task.execute_at,
                status: task.status,
                execution_stats: task.execution_stats,
                updated_at: new Date()
            }
        }));

        await this.databaseAdapter.updateTasks(updates);
    }

}

export {TaskStore};