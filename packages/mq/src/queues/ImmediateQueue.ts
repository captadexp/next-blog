import {IMessageQueue} from "./IMessageQueue.js";
import {BaseTask, ITasksAdapter, ProcessedTaskResult, TaskProcessor} from "../adapters/index.js";
import {getEnvironmentQueueName} from "../utils.js";
import {QueueName} from "../types.js";

/**
 * Immediate implementation of a message queue that processes tasks synchronously
 * when they are added without waiting for polling intervals
 */
class ImmediateQueue implements IMessageQueue {
    private isRunning: boolean = false;
    private processors: Map<QueueName, TaskProcessor> = new Map();
    private registeredQueues: Set<QueueName> = new Set();

    constructor(private tasksAdapter: ITasksAdapter) {
        this.isRunning = true;
        this.setupShutdownHandlers();
    }

    name(): string {
        return "immediate";
    }

    /**
     * Adds and immediately processes tasks
     * @param queueId - The identifier for the queue
     * @param tasks - Array of tasks to add and process immediately
     */
    async addTasks<T>(queueId: QueueName, tasks: BaseTask<T>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!tasks.length) return;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        const tasksToProcess = tasks.map(task => task);

        console.log(`Added ${tasks.length} tasks to immediate queue ${queueId}`);

        if (this.processors.has(queueId)) {
            const processor = this.processors.get(queueId)!;
            await this.processBatch(queueId, processor, tasksToProcess.length, tasksToProcess);
        } else {
            await this.tasksAdapter.insertTasks(tasks);
            console.warn(`No processor registered for queue ${queueId}, tasks will be processed when a consumer connects`);
        }
    }

    /**
     * Registers a processor for the queue
     * @param queueId - The identifier for the queue
     * @param processor - Function to process the tasks
     */
    async consumeTasks(queueId: QueueName, processor: TaskProcessor): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);

        if (!this.isRunning) {
            console.warn(`Cannot register processor for queue ${queueId}: queue is shutting down`);
            return;
        }

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        // Store the processor for this queue
        this.processors.set(queueId, processor);
        console.log(`Registered processor for immediate queue ${queueId}`);
    }

    /**
     * Process a batch of tasks immediately
     * @param queueId The queue identifier
     * @param processor Function to process tasks
     * @param limit Maximum number of tasks to process
     * @param tasksOverride Optional tasks to process instead of fetching from storage
     */
    async processBatch(
        queueId: QueueName,
        processor: TaskProcessor,
        limit: number = 10,
        tasksOverride?: BaseTask<any>[]
    ): Promise<ProcessedTaskResult> {
        queueId = getEnvironmentQueueName(queueId);
        const result: ProcessedTaskResult = {
            failedTasks: [],
            newTasks: [],
            successTasks: []
        };

        if (!this.isRunning) return result;

        if (!this.registeredQueues.has(queueId)) {
            throw new Error(`Queue ${queueId} is not registered`);
        }

        try {
            const tasks = tasksOverride || [];
            if (tasks.length === 0) return result;

            const processorResult = await processor(`immediate:${queueId}`, tasks);
            if (processorResult) {
                Object.assign(result, processorResult);
            }

            console.log(`Processed ${tasks.length} tasks from immediate queue ${queueId}`);
        } catch (error) {
            console.error(`Error processing tasks from immediate queue ${queueId}:`, error);
        }

        return result;
    }

    /**
     * Stops accepting and processing tasks
     */
    async shutdown(): Promise<void> {
        this.isRunning = false;
        this.processors.clear();
        console.log('Immediate queue shut down');
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

export default ImmediateQueue;
