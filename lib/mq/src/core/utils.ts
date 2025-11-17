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
    const nameStr = String(baseName);

    // Check if already has environment suffix
    if (nameStr.endsWith(`-${env}`)) {
        return baseName;
    }

    return `${nameStr}-${env}` as QueueName;
}