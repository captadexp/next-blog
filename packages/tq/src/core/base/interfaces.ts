import {CronTask} from "../../adapters";

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

export interface IMultiTaskExecutor<ID = any> extends IBaseExecutor {
    multiple: true;

    onTasks(tasks: CronTask<ID>[], action: ExecutorActions<ID>): Promise<void>
}

export interface ISingleTaskExecutor<ID = any> extends IBaseExecutor {
    parallel: boolean;
    multiple: false;

    onTask(task: CronTask<ID>, action: ExecutorActions<ID>): Promise<void>;
}

export interface ISingleTaskNonParallel<ID = any> extends ISingleTaskExecutor<ID> {
    parallel: false;
    multiple: false;
}

export interface ISingleTaskParallel<ID = any> extends ISingleTaskExecutor<ID> {
    chunkSize: number;
    parallel: true;
    multiple: false;
}

export type TaskExecutor<ID = any> =
    | IMultiTaskExecutor<ID>
    | ISingleTaskNonParallel<ID>
    | ISingleTaskParallel<ID>