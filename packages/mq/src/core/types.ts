export interface QueueRegistry {
    "lib-mq-example": "lib-mq-example-do-no-use";
}

/**
 * This type automatically derives the union of all allowed task values
 * from the TaskRegistry interface (including augmentations).
 */
export type QueueName = QueueRegistry[keyof QueueRegistry];
