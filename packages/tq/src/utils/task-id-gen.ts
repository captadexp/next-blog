import {CronTask} from "../adapters";
import {CacheKeyGenerator} from "memoose-js";

const taskIdCacheKeyGen = new CacheKeyGenerator("task-id-gen", false);

export function tId<T>(task: CronTask<T>) {
    if (task.id) return task.id.toString();
    if (task.task_hash) return task.task_hash;

    return taskIdCacheKeyGen.for(task.type, task.queue_id, task.created_at, task.payload);
}

