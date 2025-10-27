import {CronTask} from "./CronTasksAdapter.js";
import {ObjectId} from "mongodb";

/**
 * Database adapter interface for task storage operations
 */
export interface IDatabaseAdapter {
    /**
     * Add tasks to the scheduled collection
     */
    addTasksToScheduled(tasks: CronTask<any>[]): Promise<CronTask<any>[]>;

    /**
     * Get mature tasks ready for processing
     */
    getMatureTasks(timestamp: number): Promise<CronTask<any>[]>;

    /**
     * Update task status to processing
     */
    markTasksAsProcessing(taskIds: ObjectId[], processingStartedAt: Date): Promise<void>;

    /**
     * Update task status to executed
     */
    markTasksAsExecuted(taskIds: ObjectId[]): Promise<void>;

    /**
     * Update task status to failed
     */
    markTasksAsFailed(taskIds: ObjectId[]): Promise<void>;

    /**
     * Get tasks by IDs
     */
    getTasksByIds(taskIds: ObjectId[]): Promise<CronTask<any>[]>;

    /**
     * Update multiple tasks
     */
    updateTasks(updates: Array<{ id: ObjectId; updates: Partial<CronTask<any>> }>): Promise<void>;

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
}