import {messageQueue} from "./mq";
import {AsyncTaskManager, InMemoryAdapter, TaskHandler, TaskQueuesManager} from "@supergrowthai/tq";
import {MemoryCacheProvider} from "memoose-js";

const asyncTaskManager = new AsyncTaskManager(50);
const databaseAdapter = new InMemoryAdapter();
const cacheAdapter = new MemoryCacheProvider();
const taskQueuesManager = new TaskQueuesManager(messageQueue);

taskQueuesManager.register("test-queue-tq", "example-task", {
    multiple: false,
    parallel: false,
    store_on_failure: false,
    onTask: async (task, action) => {
        console.log(JSON.stringify(task));
        action.success(task);
    }
});

export const taskHandler = new TaskHandler(
    messageQueue,
    taskQueuesManager,
    databaseAdapter,
    cacheAdapter,
    asyncTaskManager
);

taskHandler.taskProcessServer();