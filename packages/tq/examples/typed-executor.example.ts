import type {ISingleTaskNonParallel} from "../core/base/interfaces.js";

// Augment the message registry for testing
declare module "@supergrowthai/mq" {
    interface MessagePayloadRegistry {
        "journal": { entryId: string; content: string };
        "email": { to: string; subject: string; body: string };
    }
}

// Example 1: Typed executor with compile-time type safety
const journalExecutor: ISingleTaskNonParallel<string, "journal"> = {
    multiple: false,
    parallel: false,
    store_on_failure: true,

    async onTask(task, actions) {
        // task.type is typed as "journal"
        // task.payload is typed as { entryId: string; content: string }
        console.log(task.type); // "journal"
        console.log(task.payload.entryId); // ✅ Works
        console.log(task.payload.content); // ✅ Works

        // @ts-expect-error - Property 'to' does not exist on journal payload
        console.log(task.payload.to);

        actions.success(task);
    }
};

// Example 2: Another typed executor with different message type
const emailExecutor: ISingleTaskNonParallel<string, "email"> = {
    multiple: false,
    parallel: false,
    store_on_failure: true,

    async onTask(task, actions) {
        // task.type is typed as "email"
        // task.payload is typed as { to: string; subject: string; body: string }
        console.log(task.type); // "email"
        console.log(task.payload.to); // ✅ Works
        console.log(task.payload.subject); // ✅ Works
        console.log(task.payload.body); // ✅ Works

        // @ts-expect-error - Property 'entryId' does not exist on email payload
        console.log(task.payload.entryId);

        actions.success(task);
    }
};

// Example 3: Classic untyped executor (backward compatible)
const genericExecutor: ISingleTaskNonParallel<string> = {
    multiple: false,
    parallel: false,
    store_on_failure: true,

    async onTask(task, actions) {
        // task is CronTask<string> - payload type determined at runtime
        console.log(task.type); // string
        console.log(task.payload); // unknown

        // Runtime type checking needed
        if (task.type === "journal") {
            const payload = task.payload as { entryId: string; content: string };
            console.log(payload.entryId);
        }

        actions.success(task);
    }
};

export {journalExecutor, emailExecutor, genericExecutor};