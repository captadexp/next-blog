import {CronTask} from "../adapters";

/**
 * Result from processing tasks - specific to TQ (Task Queue) logic
 */
export interface ProcessedTaskResult<ID = any> {
    failedTasks: CronTask<ID>[];
    newTasks: CronTask<ID>[];
    successTasks: CronTask<ID>[];
}
