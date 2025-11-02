import {CronTask} from "./types.js";

/**
 * Database adapter interface for task storage operations
 * @template ID - The type of the ID used for tasks (e.g., ObjectId, string, number)
 */
export interface ITaskStorageAdapter<PAYLOAD = any, ID = any> {
    /**
     * Add tasks to the scheduled collection
     */
    addTasksToScheduled(tasks: CronTask<PAYLOAD>[]): Promise<CronTask<PAYLOAD>[]>;

    /**
     * Get mature tasks ready for processing
     */
    getMatureTasks(timestamp: number): Promise<CronTask<PAYLOAD>[]>;

    /**
     * Update task status to processing
     */
    markTasksAsProcessing(tasks: CronTask<PAYLOAD, ID>[], processingStartedAt: Date): Promise<void>;

    /**
     * Update task status to executed
     */
    markTasksAsExecuted(tasks: CronTask<PAYLOAD, ID>[]): Promise<void>;

    /**
     * Update task status to failed
     */
    markTasksAsFailed(tasks: CronTask<PAYLOAD, ID>[]): Promise<void>;

    markTasksAsIgnored(tasks: CronTask<PAYLOAD, ID>[]): Promise<void>;

    /**
     * Get tasks by IDs
     */
    getTasksByIds(taskIds: ID[]): Promise<CronTask<PAYLOAD, ID>[]>;

    /**
     * Update multiple tasks
     */
    updateTasks(updates: Array<{ id: ID; updates: Partial<CronTask<PAYLOAD>> }>): Promise<void>;

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