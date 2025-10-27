import {getEnvironmentQueueName, QueueName} from "@supergrowthai/mq";
import taskQueue from "../index.js";

/**
 * Gets all queue names for the current environment
 * @returns Array of full queue names including environment suffix
 */
export function getEnabledQueues(): QueueName[] {
    let enabledQueues: QueueName[] = process.env.ENABLED_QUEUES ? JSON.parse(process.env.ENABLED_QUEUES!) : ['queue-all'];

    if (enabledQueues.length === 0) throw new Error('No queues enabled');
    enabledQueues = enabledQueues.map(getEnvironmentQueueName)

    const queues = taskQueue.getQueues().filter((queue: QueueName) => enabledQueues.includes(queue));

    return queues.map(getEnvironmentQueueName);
}
