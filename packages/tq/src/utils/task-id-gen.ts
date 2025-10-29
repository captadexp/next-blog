import {CronTask} from "../adapters/index.js";
import type {CacheKeyGenerator} from "memoose-js";
import crypto from "crypto";

let taskIdCacheKeyGen: CacheKeyGenerator | null = null;

export function tId<T>(task: CronTask<T>) {
    if (task._id) return task._id.toString();
    if (task.task_hash) return task.task_hash;

    if (!taskIdCacheKeyGen) {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify({
            type: task.type,
            queue_id: task.queue_id,
            created_at: task.created_at,
            payload: task.payload
        }));
        return `task-id-gen:${hash.digest('hex')}`;
    }

    return taskIdCacheKeyGen.for(task.type, task.queue_id, task.created_at, task.payload);
}

export function setKeyGenerator(generator: CacheKeyGenerator) {
    taskIdCacheKeyGen = generator;
}

