import {QueueName} from "./types.js";

/**
 * Gets the current environment from NODE_ENV or defaults to 'development'
 */
function getCurrentEnvironment(): string {
    return process.env.NODE_ENV || 'development';
}

/**
 * Gets the environment-specific queue name
 * This ensures that queues in different environments don't share tasks
 */
export function getEnvironmentQueueName(baseName: QueueName): QueueName {
    const env = getCurrentEnvironment();
    const allParts = (baseName as unknown as string).split('-');
    const isFinal = allParts.at(-1) == env

    if (isFinal) {
        return baseName as unknown as QueueName;
    }

    return `${baseName}-${env}` as unknown as QueueName;
}