import {CronTask} from "../../adapters";

interface IBaseExecutor<T> {
    multiple: boolean,
    default_retries?: number
    store_on_failure: boolean
    asyncConfig?: {
        handoffTimeout: number;  // ms before handoff to async (e.g., 5000 for 5 seconds)
        maxConcurrentAsync?: number;  // max concurrent async tasks of this type
    }
}

export type ExecutorActions<PAYLOAD = any, ID = any> = {
    addTasks(task: CronTask<PAYLOAD, ID>[]): void;
    fail(task: CronTask<PAYLOAD, ID>): void;
    success(task: CronTask<PAYLOAD, ID>): void;
}

export interface IMultiTaskExecutor<PAYLOAD, ID = any> extends IBaseExecutor<PAYLOAD> {
    multiple: true;

    onTasks(tasks: CronTask<PAYLOAD, ID>[], action: ExecutorActions<PAYLOAD, ID>): Promise<void>
}

export interface ISingleTaskExecutor<PAYLOAD, ID = any> extends IBaseExecutor<PAYLOAD> {
    parallel: boolean;
    multiple: false;

    onTask(task: CronTask<PAYLOAD, ID>, action: ExecutorActions<PAYLOAD, ID>): Promise<void>;
}

export interface ISingleTaskNonParallel<PAYLOAD, ID = any> extends ISingleTaskExecutor<PAYLOAD, ID> {
    parallel: false;
    multiple: false;
}

export interface ISingleTaskParallel<PAYLOAD, ID = any> extends ISingleTaskExecutor<PAYLOAD, ID> {
    chunkSize: number;
    parallel: true;
    multiple: false;
}

export type TaskExecutor<PAYLOAD, ID = any> =
    | IMultiTaskExecutor<PAYLOAD, ID>
    | ISingleTaskNonParallel<PAYLOAD, ID>
    | ISingleTaskParallel<PAYLOAD, ID>