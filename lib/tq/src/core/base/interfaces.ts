import {CronTask} from "../../adapters";
import {MessageType, TypedMessage} from "@supergrowthai/mq";

/**
 * Type helper to extract the correct CronTask type based on message type
 */
export type TypedCronTask<ID, T extends MessageType> = CronTask<ID> & TypedMessage<T>;

interface IBaseExecutor {
    multiple: boolean,
    default_retries?: number
    store_on_failure: boolean
    asyncConfig?: {
        handoffTimeout: number;  // ms before handoff to async (e.g., 5000 for 5 seconds)
        maxConcurrentAsync?: number;  // max concurrent async tasks of this type
    }
}

export type ExecutorActions<ID = any> = {
    addTasks(task: CronTask<ID>[]): void;
    fail(task: CronTask<ID>): void;
    success(task: CronTask<ID>): void;
}

export interface IMultiTaskExecutor<ID = any, T extends MessageType = MessageType> extends IBaseExecutor {
    multiple: true;

    onTasks(tasks: T extends MessageType ? TypedCronTask<ID, T>[] : CronTask<ID>[], action: ExecutorActions<ID>): Promise<void>
}

export interface ISingleTaskExecutor<ID = any, T extends MessageType = MessageType> extends IBaseExecutor {
    parallel: boolean;
    multiple: false;

    onTask(task: T extends MessageType ? TypedCronTask<ID, T> : CronTask<ID>, action: ExecutorActions<ID>): Promise<void>;
}

export interface ISingleTaskNonParallel<ID = any, T extends MessageType = MessageType> extends ISingleTaskExecutor<ID, T> {
    parallel: false;
    multiple: false;
}

export interface ISingleTaskParallel<ID = any, T extends MessageType = MessageType> extends ISingleTaskExecutor<ID, T> {
    chunkSize: number;
    parallel: true;
    multiple: false;
}

export type TaskExecutor<ID = any, T extends MessageType = MessageType> =
    | IMultiTaskExecutor<ID, T>
    | ISingleTaskNonParallel<ID, T>
    | ISingleTaskParallel<ID, T>