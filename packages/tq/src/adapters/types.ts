import {BaseMessage} from "@supergrowthai/mq";

/**
 * Extended task structure for cron tasks with additional fields
 */
export interface CronTask<ID = any> extends BaseMessage<ID> {
    _id: ID;
    task_group?: string
    task_hash?: string
}
