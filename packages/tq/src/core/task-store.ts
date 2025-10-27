import {getEnvironmentQueueName} from "@supergrowthai/mq";
import {CronTask, databaseAdapter} from "../adapters/index.js";
import {ObjectId} from "mongodb";

/**
 * Adds multiple tasks to the scheduled queue
 */
async function addTasksToScheduled(tasks: CronTask<any>[]): Promise<any> {
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

    return await databaseAdapter.addTasksToScheduled(transformedTasks);
}

/**
 * Gets mature tasks that are ready to be processed
 * Implements a two-phase approach:
 * 1. Reset stale processing tasks
 * 2. Fetch and mark new mature tasks
 */
async function getMatureTasks(timestamp: number): Promise<CronTask<any>[]> {
    return await databaseAdapter.getMatureTasks(timestamp);
}

/**
 * Marks tasks as processing with current timestamp
 */
async function markTasksAsProcessing(taskIds: ObjectId[]): Promise<void> {
    await databaseAdapter.markTasksAsProcessing(taskIds, new Date());
}

/**
 * Marks tasks as executed/completed
 */
async function markTasksAsExecuted(taskIds: ObjectId[]): Promise<void> {
    await databaseAdapter.markTasksAsExecuted(taskIds);
}

/**
 * Marks tasks as failed and increments retry count
 */
async function markTasksAsFailed(taskIds: ObjectId[]): Promise<void> {
    await databaseAdapter.markTasksAsFailed(taskIds);
}

/**
 * Updates multiple tasks with specific updates
 */
async function updateTasks(updates: Array<{ id: ObjectId; updates: Partial<CronTask<any>> }>): Promise<void> {
    await databaseAdapter.updateTasks(updates);
}

/**
 * Gets tasks by their IDs
 */
async function getTasksByIds(taskIds: ObjectId[]): Promise<CronTask<any>[]> {
    return await databaseAdapter.getTasksByIds(taskIds);
}

/**
 * Gets cleanup statistics
 */
async function getCleanupStats(): Promise<{ orphanedTasks: number; expiredTasks: number }> {
    return await databaseAdapter.getCleanupStats();
}

/**
 * Cleans up orphaned and expired tasks
 */
async function cleanupTasks(): Promise<void> {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const now = new Date();

    await databaseAdapter.cleanupTasks(twoDaysAgo, now);
}

/**
 * Updates tasks for retry with new execution time and retry count
 */
async function updateTasksForRetry(tasks: CronTask<any>[]): Promise<void> {
    const updates = tasks.map(task => ({
        id: task._id as ObjectId,
        updates: {
            execute_at: task.execute_at,
            status: task.status,
            execution_stats: task.execution_stats,
            updated_at: new Date()
        }
    }));

    await databaseAdapter.updateTasks(updates);
}

/**
 * Marks tasks as successful/completed
 */
async function markTasksAsSuccess(tasks: CronTask<any>[]): Promise<void> {
    const taskIds = tasks.map(task => task._id as ObjectId);
    await databaseAdapter.markTasksAsExecuted(taskIds);
}

/**
 * Marks tasks as ignored (same as failed for now)
 */
async function markTasksAsIgnored(tasks: CronTask<any>[]): Promise<void> {
    const taskIds = tasks.map(task => task._id as ObjectId);
    await databaseAdapter.markTasksAsFailed(taskIds);
}

const TaskStore = {
    addTasksToScheduled,
    getMatureTasks,
    markTasksAsProcessing,
    markTasksAsExecuted,
    markTasksAsFailed,
    updateTasks,
    getTasksByIds,
    getCleanupStats,
    cleanupTasks,
    updateTasksForRetry,
    markTasksAsSuccess,
    markTasksAsIgnored
};

export default TaskStore;