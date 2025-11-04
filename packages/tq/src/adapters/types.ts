import {BaseMessage} from "@supergrowthai/mq";

/**
 * Extended task structure for cron tasks with additional fields
 */
export type CronTask<ID = any> = BaseMessage<ID> & {
    _id: ID;
    task_group?: string
    task_hash?: string
}
