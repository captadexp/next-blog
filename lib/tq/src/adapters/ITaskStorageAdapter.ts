import {CronTask} from "./types.js";

/**
 * Database adapter interface for task storage operations
 * @template ID - The type of the ID used for tasks (e.g., ObjectId, string, number)
 */
export interface ITaskStorageAdapter<ID = any> {
    /**
     * Add tasks to the scheduled collection
     */
    addTasksToScheduled(tasks: CronTask<ID>[]): Promise<CronTask<ID>[]>;

    /**
     * Get mature tasks ready for processing
     */
    getMatureTasks(timestamp: number): Promise<CronTask<ID>[]>;

    /**
     * Update task status to processing
     */
    markTasksAsProcessing(tasks: CronTask<ID>[], processingStartedAt: Date): Promise<void>;

    /**
     * Update task status to executed
     */
    markTasksAsExecuted(tasks: CronTask<ID>[]): Promise<void>;

    /**
     * Update task status to failed
     */
    markTasksAsFailed(tasks: CronTask<ID>[]): Promise<void>;

    markTasksAsIgnored(tasks: CronTask<ID>[]): Promise<void>;

    /**
     * Get tasks by IDs
     */
    getTasksByIds(taskIds: ID[]): Promise<CronTask<ID>[]>;

    /**
     * Update multiple tasks
     */
    updateTasks(updates: Array<{ id: ID; updates: Partial<CronTask<ID>> }>): Promise<void>;

    /**
     * Get stats for cleanup
     */
    getCleanupStats(): Promise<{
        orphanedTasks: number;
        expiredTasks: number;
    }>;

    /**
     * Clean up orphaned and expired tasks
     */
    cleanupTasks(orphanedBefore: Date, expiredBefore: Date): Promise<void>;

    /**
     * Initialize database connection
     */
    initialize(): Promise<void>;

    /**
     * Close database connection
     */
    close(): Promise<void>;

    /**
     * Storage specific id generator
     */
    generateId(): ID
}