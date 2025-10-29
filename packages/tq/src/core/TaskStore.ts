import {getEnvironmentQueueName} from "@supergrowthai/mq";
import {CronTask, IDatabaseAdapter} from "../adapters/index.js";

class TaskStore<ID = any> {

    constructor(private databaseAdapter: IDatabaseAdapter<ID>) {
    }

    /**
     * Adds multiple tasks to the scheduled queue
     */
    async addTasksToScheduled(tasks: CronTask<any>[]): Promise<any> {
        if (!tasks.length) return [];

        const transformedTasks: CronTask<any>[] = tasks.map((task) => ({
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
    async getMatureTasks(timestamp: number): Promise<CronTask<any>[]> {
        return await this.databaseAdapter.getMatureTasks(timestamp);
    }

    /**
     * Marks tasks as processing with current timestamp
     */
    async markTasksAsProcessing(taskIds: ID[]): Promise<void> {
        await this.databaseAdapter.markTasksAsProcessing(taskIds, new Date());
    }

    /**
     * Marks tasks as executed/completed
     */
    async markTasksAsExecuted(taskIds: ID[]): Promise<void> {
        await this.databaseAdapter.markTasksAsExecuted(taskIds);
    }

    /**
     * Marks tasks as failed and increments retry count
     */
    async markTasksAsFailed(taskIds: ID[]): Promise<void> {
        await this.databaseAdapter.markTasksAsFailed(taskIds);
    }

    /**
     * Updates multiple tasks with specific updates
     */
    async updateTasks(updates: Array<{ id: ID; updates: Partial<CronTask<any>> }>): Promise<void> {
        await this.databaseAdapter.updateTasks(updates);
    }

    /**
     * Gets tasks by their IDs
     */
    async getTasksByIds(taskIds: ID[]): Promise<CronTask<any>[]> {
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
    async updateTasksForRetry(tasks: CronTask<any>[]): Promise<void> {
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

    /**
     * Marks tasks as successful/completed
     */
    async markTasksAsSuccess(tasks: CronTask<any>[]): Promise<void> {
        const taskIds = tasks.map(task => task._id as ID);
        await this.databaseAdapter.markTasksAsExecuted(taskIds);
    }

    /**
     * Marks tasks as ignored (same as failed for now)
     */
    async markTasksAsIgnored(tasks: CronTask<any>[]): Promise<void> {
        const taskIds = tasks.map(task => task._id as ID);
        await this.databaseAdapter.markTasksAsFailed(taskIds);
    }
}

export {TaskStore};