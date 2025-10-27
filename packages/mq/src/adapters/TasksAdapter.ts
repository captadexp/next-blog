import {QueueName} from "../types.js";

/**
 * Base task structure required by the message queue system
 */
export interface BaseTask<PAYLOAD = any, ID = any> {
    _id: ID;
    type: string;
    payload: PAYLOAD;
    execute_at: Date;
    status: 'scheduled' | 'processing' | 'executed' | 'failed';
    retries: number;
    created_at: Date;
    updated_at: Date;
    queue_id: QueueName;
    processing_started_at: Date;

    expires_at?: Date;
    task_group?: string;
    task_hash?: string;
    retry_after?: number;
    execution_stats?: Record<string, unknown>;
    force_store?: boolean;
}

/**
 * Result from processing tasks
 */
export interface ProcessedTaskResult<PAYLOAD = any, ID = any> {
    failedTasks: BaseTask<PAYLOAD, ID>[];
    newTasks: BaseTask<PAYLOAD, ID>[];
    successTasks: BaseTask<PAYLOAD, ID>[];
}

/**
 * Task processor function type
 */
export type TaskProcessor<PAYLOAD = any, ID = any> = (
    queueId: string,
    tasks: BaseTask<PAYLOAD, ID>[]
) => Promise<ProcessedTaskResult<PAYLOAD, ID>>;

/**
 * Input for creating a new task (minimal required fields)
 */
export type CreateTaskInput<PAYLOAD = any> = Pick<BaseTask<PAYLOAD>, 'type' | 'payload' | 'queue_id'> & {
    execute_at?: Date;
    expires_at?: Date;
    task_group?: string;
    task_hash?: string;
    retry_after?: number;
};

/**
 * Adapter interface for task storage operations
 * Implement this interface to use your own database/storage system
 */
export interface ITasksAdapter<T = any, ID = any> {
    /**
     * Insert multiple tasks into storage
     */
    insertTasks(tasks: BaseTask<T, ID>[]): Promise<void>;

    /**
     * Find tasks ready for processing
     * @param queueId Queue identifier
     * @param limit Maximum number of tasks to retrieve
     * @returns Array of tasks ready for processing
     */
    findScheduledTasks(queueId: string, limit: number): Promise<BaseTask<T, ID>[]>;

    /**
     * Mark tasks as processing
     * @param taskIds Array of task IDs to mark as processing
     */
    markTasksAsProcessing(taskIds: ID[]): Promise<void>;

    /**
     * Mark tasks as executed/completed
     * @param taskIds Array of task IDs to mark as executed
     */
    markTasksAsExecuted(taskIds: ID[]): Promise<void>;

    /**
     * Mark tasks as failed and increment retry count
     * @param taskIds Array of task IDs to mark as failed
     */
    markTasksAsFailed(taskIds: ID[]): Promise<void>;

    /**
     * Generate a new task ID
     * @returns A new unique task ID
     */
    generateTaskId(): ID;
}

