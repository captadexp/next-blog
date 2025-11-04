import {getEnvironmentQueueName, IMessageQueue, QueueName} from "@supergrowthai/mq";
import {TaskExecutor} from "./base/interfaces";

class TaskQueuesManager<ID> {
    queueTaskExecutorMap: Map<QueueName, Map<string, TaskExecutor<ID>>> = new Map();

    constructor(private messageQueue: IMessageQueue<ID>) {
    }

    /**
     * Registers a task executor with a message queue and queue name
     * @param queueName The name of the queue
     * @param taskType The type of task
     * @param executor The executor for the task
     */
    register(
        queueName: QueueName,
        taskType: string,
        executor: TaskExecutor<ID>
    ): void {
        queueName = getEnvironmentQueueName(queueName)
        // Ensure the queue is registered with the message queue
        this.messageQueue.register(queueName);

        // Initialize the map for this queue if it doesn't exist
        if (!this.queueTaskExecutorMap.has(queueName)) {
            this.queueTaskExecutorMap.set(queueName, new Map());
        }

        // Register the executor for this task type
        const queueMap = this.queueTaskExecutorMap.get(queueName)!;
        queueMap.set(taskType, executor);

        console.log(`Registered task executor for ${taskType} on queue ${queueName}`);
    }

    /**
     * Gets the task executor for a specific queue and task type
     * @param queueName The name of the queue
     * @param taskType The type of task
     * @returns The executor for the task
     */
    getExecutor(queueName: QueueName, taskType: string): TaskExecutor<ID> | undefined {
        queueName = getEnvironmentQueueName(queueName)
        const queueMap = this.queueTaskExecutorMap.get(queueName);
        if (!queueMap) {
            return undefined;
        }
        return queueMap.get(taskType);
    }

    /**
     * Gets all registered queues
     * @returns Array of queue names
     */
    getQueues(): QueueName[] {
        return Array.from(this.queueTaskExecutorMap.keys());
    }

    /**
     * Gets all task types for a specific queue
     * @param queueName The name of the queue
     * @returns Array of task types
     */
    getTaskTypesForQueue(queueName: QueueName): string[] {
        queueName = getEnvironmentQueueName(queueName)
        const queueMap = this.queueTaskExecutorMap.get(queueName);
        if (!queueMap) {
            return [];
        }
        return Array.from(queueMap.keys());
    }
}

export {TaskQueuesManager}