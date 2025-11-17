import {getEnvironmentQueueName, QueueName} from "@supergrowthai/mq";

/**
 * Gets all queue names for the current environment
 * @returns Array of full queue names including environment suffix
 */
export function getEnabledQueues(): QueueName[] {
    let enabledQueues: QueueName[] = process.env.ENABLED_QUEUES ? JSON.parse(process.env.ENABLED_QUEUES!) : [];

    if (enabledQueues.length === 0) throw new Error('No queues enabled');

    return enabledQueues.map(getEnvironmentQueueName);
}
