import {IMessageQueue} from "./IMessageQueue.js";
import {getEnvironmentQueueName} from "../utils.js";
import {QueueName} from "../types.js";
import {BaseTask, ITasksAdapter, ProcessedTaskResult, TaskProcessor} from "../adapters/index.js";

/**
 * In-memory implementation of the message queue.
 * This is primarily for development, testing, and environments where external message queues are not available.
 */
class InMemoryQueue implements IMessageQueue {
    private queues: Map<QueueName, BaseTask<any>[]> = new Map();
    private isRunning: boolean = false;
    private processingIntervals: Map<QueueName, NodeJS.Timeout> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    constructor(private tasksAdapter: ITasksAdapter) {
        this.setupShutdownHandlers();
    }

    /**
     * Returns the name of this queue implementation
     */
    name(): string {
        return "memory";
    }

    /**
     * Adds tasks to the in-memory queue
     * @param queueId - The identifier for the queue
     * @param tasks - Array of tasks to add to the queue
     */
    async addTasks<T>(queueId: QueueName, tasks: BaseTask<T>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!tasks.length) {
            return;
        }

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        if (!this.queues.has(queueId)) {
            this.queues.set(queueId, []);
        }

        const queue = this.queues.get(queueId)!;
        queue.push(...tasks);

        console.log(`Added ${tasks.length} tasks to in-memory queue ${queueId}`);
    }

    /**
     * Consumes tasks from the in-memory queue
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the tasks
     */
    async consumeTasks(
        queueId: QueueName,
        processor: TaskProcessor
    ): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        this.isRunning = true;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        // Create the queue if it doesn't exist
        if (!this.queues.has(queueId)) {
            this.queues.set(queueId, []);
        }

        // Set up a polling interval for this queue if not already set
        if (!this.processingIntervals.has(queueId)) {
            const interval = setInterval(async () => {
                if (this.isRunning) {
                    await this.processBatch(queueId, processor);
                }
            }, 1000);
            this.processingIntervals.set(queueId, interval);
        }

        console.log(`Started consuming from in-memory queue ${queueId}`);
    }

    /**
     * Process a batch of tasks from the queue
     * @param queueId The queue to process from
     * @param processor Function to process tasks
     * @param limit Maximum number of tasks to process
     * @returns ProcessedTaskResult
     */
    async processBatch(
        queueId: QueueName,
        processor: TaskProcessor,
        limit: number = 10
    ): Promise<ProcessedTaskResult> {
        queueId = getEnvironmentQueueName(queueId);
        const result: ProcessedTaskResult = {
            failedTasks: [],
            newTasks: [],
            successTasks: []
        };

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        if (!this.queues.has(queueId)) {
            this.queues.set(queueId, []);
            return result;
        }

        const queue = this.queues.get(queueId)!;
        if (queue.length === 0) return result;

        // Take a batch of tasks (up to limit)
        const batch = queue.splice(0, Math.min(limit, queue.length));

        if (batch.length > 0) {
            try {
                // Process the batch
                const batchResult = await processor(`memory:${queueId}`, batch);
                console.log(`Processed ${batch.length} tasks from in-memory queue ${queueId}`);

                if (batchResult) {
                    return batchResult;
                }
            } catch (error) {
                console.error(`Error processing tasks from in-memory queue ${queueId}:`, error);
                // Put the failed tasks back in the queue
                queue.unshift(...batch);
            }
        }

        return result;
    }

    /**
     * Stops consuming tasks and cleans up resources
     */
    async shutdown(): Promise<void> {
        this.isRunning = false;

        // Clear all processing intervals
        for (const [queueId, interval] of this.processingIntervals.entries()) {
            clearInterval(interval);
            this.processingIntervals.delete(queueId);
        }

        console.log('In-memory queue shut down');
    }

    /**
     * Registers a queue with the message queue
     * @param queueId The queue to register
     */
    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        console.log(`Registered queue ${normalizedQueueId}`);
    }

    /**
     * Handles graceful shutdown by registering signal handlers
     */
    private setupShutdownHandlers() {
        process.on('SIGINT', async () => await this.shutdown());
        process.on('SIGTERM', async () => await this.shutdown());
        process.on('SIGQUIT', async () => await this.shutdown());
    }
}

export default InMemoryQueue
