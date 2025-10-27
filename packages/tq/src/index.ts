// Core types and utilities
export * from "./types.js";

// Adapters
export * from "./adapters/index.js";

// Core modules
export {default as TaskStore} from "./core/task-store.js";
export {default as taskHandler} from "./core/task-handler.js";
export {default as taskRunner} from "./core/task-runner.js";
export {getEnabledQueues} from "./core/environment.js";

// Actions
export {Actions} from "./core/actions/Actions.js";
export {AsyncActions} from "./core/actions/AsyncActions.js";

// Async task management
export {AsyncTaskManager} from "./core/async/AsyncTaskManager.js";

// Base interfaces
export * from "./core/base/interfaces.js";

// Task registry
export * from "./task-registry.js";

// Utilities
export {default as tId} from "./utils/task-id-gen.js";

import {getEnvironmentQueueName, IMessageQueue, QueueName} from "@supergrowthai/mq";
import {TaskExecutor} from "./core/base/interfaces.js";

class TaskQueue {
    queueTaskExecutorMap: Map<QueueName, Map<string, TaskExecutor<any>>> = new Map();

    /**
     * Registers a task executor with a message queue and queue name
     * @param messageQueue The message queue to register with
     * @param queueName The name of the queue
     * @param taskType The type of task
     * @param executor The executor for the task
     */
    register(
        messageQueue: IMessageQueue,
        queueName: QueueName,
        taskType: string,
        executor: TaskExecutor<any>
    ): void {
        queueName = getEnvironmentQueueName(queueName)
        // Ensure the queue is registered with the message queue
        messageQueue.register(queueName);

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
    getExecutor(queueName: QueueName, taskType: string): TaskExecutor<any> | undefined {
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
    getTasksForQueue(queueName: QueueName): string[] {
        queueName = getEnvironmentQueueName(queueName)
        const queueMap = this.queueTaskExecutorMap.get(queueName);
        if (!queueMap) {
            return [];
        }
        return Array.from(queueMap.keys());
    }
}

// Create a singleton instance of the task queue
const taskQueue = new TaskQueue();

// Task queue management
export {TaskQueue};
export default taskQueue;