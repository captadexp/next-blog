import {QueueName} from "../types.js";
import {BaseTask, ProcessedTaskResult, TaskProcessor} from "../adapters/index.js";
import {IAsyncTaskManager} from "./IAsyncTaskManager.js";

export type Processor = (id: string, tasks: BaseTask<any>[]) => Promise<ProcessedTaskResult>

export interface IMessageQueue {
    /**
     * Returns the name of the queue implementation
     */
    name(): string;

    /**
     * Adds a batch of tasks to the queue
     * @param queueId - The identifier for the queue
     * @param tasks - Array of tasks to add to the queue
     */
    addTasks<T>(queueId: QueueName, tasks: BaseTask<T>[]): Promise<void>;

    /**
     * Consumes tasks from the queue and processes them with the provided function
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the tasks
     */
    consumeTasks(queueId: QueueName, processor: TaskProcessor): Promise<void>;

    /**
     * Stops consuming tasks and cleans up resources
     */
    shutdown(): Promise<void>;

    /**
     * Process a batch of tasks from the queue
     * @param queueId The queue to process from
     * @param processor Function to process tasks
     * @param limit Maximum number of tasks to process
     * @returns Number of tasks processed
     */
    processBatch(queueId: QueueName, processor: TaskProcessor, limit?: number): Promise<ProcessedTaskResult>;

    /**
     * Registers a queue with the message queue
     * @param queueId The queue to register
     */
    register(queueId: QueueName): void;
}

export type {IAsyncTaskManager}