import {CronTask} from "../../adapters/types.js";

export type ExecutorActions<T> = {
    addTasks(task: CronTask<any>[]): void;
    fail(task: CronTask<T>): void;
    success(task: CronTask<T>): void;
}


interface IBaseExecutor<T> {
    multiple: boolean,
    default_retries?: number
    store_on_failure: boolean
    asyncConfig?: {
        handoffTimeout: number;  // ms before handoff to async (e.g., 5000 for 5 seconds)
        maxConcurrentAsync?: number;  // max concurrent async tasks of this type
    }
}

export interface IMultiTaskExecutor<T> extends IBaseExecutor<T> {
    multiple: true;

    onTasks(tasks: CronTask<T>[], action: ExecutorActions<T>): Promise<void>
}

export interface ISingleTaskExecutor<T> extends IBaseExecutor<T> {
    parallel: boolean;
    multiple: false;

    onTask(task: CronTask<T>, action: ExecutorActions<T>): Promise<void>;
}

export interface ISingleTaskNonParallel<T> extends ISingleTaskExecutor<T> {
    parallel: false;
    multiple: false;
}

export interface ISingleTaskParallel<T> extends ISingleTaskExecutor<T> {
    chunkSize: number;
    parallel: true;
    multiple: false;
}

export type TaskExecutor<T> = IMultiTaskExecutor<T> | ISingleTaskNonParallel<T> | ISingleTaskParallel<T>