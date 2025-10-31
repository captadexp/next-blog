import {InMemoryQueue} from '@supergrowthai/mq';

declare module '@supergrowthai/mq' {
    interface QueueRegistry {
        "test-app-mq": "test-queue-mq";
        "test-app-tq": "test-queue-tq";
    }
}

export const messageQueue = new InMemoryQueue();
messageQueue.register("test-queue-mq");

