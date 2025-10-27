import {getCacheKeyGenerator} from "@supergrowthai/cache";
import {CronTask} from "../adapters";

const taskIdCacheKeyGen = getCacheKeyGenerator("task-id-gen")

function tId<T>(task: CronTask<T>) {
    if (task._id) return task._id.toString();
    if (task.task_hash) return task.task_hash;
    return taskIdCacheKeyGen.for(task.type, task.queue_id, task.created_at, task.payload);
}

export default tId