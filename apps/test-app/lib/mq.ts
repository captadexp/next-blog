import {InMemoryQueue} from '@supergrowthai/mq';

declare module '@supergrowthai/mq' {
    interface QueueRegistry {
        "test-app-mq": "test-queue-mq";
        "test-app-tq": "test-queue-tq";
    }

    interface MessagePayloadRegistry {
        "example-task": { message?: string, action?: string };
    }
}

export const messageQueue = new InMemoryQueue();
messageQueue.register("test-queue-mq");

