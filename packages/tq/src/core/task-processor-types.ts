import {CronTask} from "../adapters/index.js";

/**
 * Result from processing tasks - specific to TQ (Task Queue) logic
 */
export interface ProcessedTaskResult<PAYLOAD = any, ID = any> {
    failedTasks: CronTask<PAYLOAD, ID>[];
    newTasks: CronTask<PAYLOAD, ID>[];
    successTasks: CronTask<PAYLOAD, ID>[];
}

/**
 * Task processor function type that returns task execution results
 * This is different from MQ's MessageProcessor which just consumes messages
 */
export type TaskProcessor<PAYLOAD = any, ID = any> = (
    queueId: string,
    tasks: CronTask<PAYLOAD, ID>[]
) => Promise<ProcessedTaskResult<PAYLOAD, ID>>;