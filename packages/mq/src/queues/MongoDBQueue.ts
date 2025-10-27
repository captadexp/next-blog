import {IMessageQueue} from "./IMessageQueue.js";
import {BaseTask, ITasksAdapter, ProcessedTaskResult, TaskProcessor} from "../adapters/index.js";
import {getEnvironmentQueueName} from "../utils.js";
import {QueueName} from "../types.js";
import {BaseCacheProvider} from "memoose-js";
import {LockManager} from "@supergrowthai/utils";

/**
 * MongoDB implementation of message queue using the TasksAdapter
 */
class MongoDBQueue implements IMessageQueue {
    private isRunning: boolean = false;
    private processingIntervals: Map<QueueName, NodeJS.Timeout> = new Map();
    private lockManager: LockManager;
    private registeredQueues: Set<QueueName> = new Set();

    constructor(cacheAdapter: BaseCacheProvider<any>, private tasksAdapter: ITasksAdapter) {
        this.lockManager = new LockManager(cacheAdapter, {
            prefix: 'mq-lock:',
            defaultTimeout: 300 // 5 minutes lock by default
        });
        this.setupShutdownHandlers();
    }

    register(queueId: QueueName): void {
        const normalizedQueueId = getEnvironmentQueueName(queueId);
        this.registeredQueues.add(normalizedQueueId);
        console.log(`Registered queue ${normalizedQueueId}`);
    }

    name(): string {
        return "mongodb";
    }

    async addTasks<T>(queueId: QueueName, tasks: BaseTask<T>[]): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        if (!tasks.length) return;

        try {
            const tasksToInsert = tasks.map(task => ({
                ...task,
                queue_id: queueId,
                _id: task._id || this.tasksAdapter.generateTaskId(),
                status: task.status || "scheduled",
                created_at: task.created_at || new Date()
            }));

            await this.tasksAdapter.insertTasks(tasksToInsert);
            console.log(`Added ${tasks.length} tasks to MongoDB queue ${queueId}`);
        } catch (error) {
            console.error(`Error adding tasks to MongoDB queue ${queueId}:`, error);
            throw error;
        }
    }

    async consumeTasks(queueId: QueueName, processor: TaskProcessor): Promise<void> {
        queueId = getEnvironmentQueueName(queueId);
        this.isRunning = true;

        if (!this.processingIntervals.has(queueId)) {
            const interval = setInterval(async () => {
                if (this.isRunning) {
                    await this.processBatch(queueId, processor);
                }
            }, 5000);

            this.processingIntervals.set(queueId, interval);
        }

        console.log(`Started consuming from MongoDB queue ${queueId}`);
        await this.processBatch(queueId, processor);
    }

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

        if (!this.isRunning) return result;

        const lockKey = `queue:${queueId}:${process.env.INSTANCE_ID || 'default'}`;
        const lockAcquired = await this.lockManager.acquire(lockKey, 60);
        if (!lockAcquired) return result;

        try {
            const tasks = await this.tasksAdapter.findScheduledTasks(queueId, limit);

            if (tasks.length === 0) return result;

            const taskIds = tasks.map(task => task._id);
            await this.tasksAdapter.markTasksAsProcessing(taskIds);

            try {
                const processorResult = await processor(`mongodb:${queueId}`, tasks);

                if (processorResult) {
                    Object.assign(result, processorResult);

                    // Update successful tasks
                    const successIds = result.successTasks.map(task => task._id);
                    if (successIds.length > 0) {
                        await this.tasksAdapter.markTasksAsExecuted(successIds);
                    }

                    // Update failed tasks
                    const failedIds = result.failedTasks.map(task => task._id);
                    if (failedIds.length > 0) {
                        await this.tasksAdapter.markTasksAsFailed(failedIds);
                    }

                    // Add new tasks
                    if (result.newTasks.length > 0) {
                        await this.tasksAdapter.insertTasks(result.newTasks);
                    }
                }

                console.log(`Processed ${tasks.length} tasks from MongoDB queue ${queueId}`);
            } catch (error) {
                console.error(`Error processing tasks from MongoDB queue ${queueId}:`, error);

                // Mark all as failed if the processor throws an error
                await this.tasksAdapter.markTasksAsFailed(taskIds);
            }
        } catch (error) {
            console.error(`Error in batch processing for MongoDB queue ${queueId}:`, error);
        } finally {
            await this.lockManager.release(lockKey);
        }

        return result;
    }

    async shutdown(): Promise<void> {
        this.isRunning = false;

        for (const [queueId, interval] of this.processingIntervals.entries()) {
            clearInterval(interval);
            this.processingIntervals.delete(queueId);
        }

        console.log('MongoDB queue shut down');
    }

    private setupShutdownHandlers() {
        // Standard process handlers for graceful shutdown
        process.on('SIGINT', async () => await this.shutdown());
        process.on('SIGTERM', async () => await this.shutdown());
        process.on('SIGQUIT', async () => await this.shutdown());
    }
}

export default MongoDBQueue;