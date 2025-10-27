export interface TaskRegistry {
    "lib-mq-example": "lib-mq-example-do-no-use";
}

/**
 * This type automatically derives the union of all allowed task values
 * from the TaskRegistry interface (including augmentations).
 */
export type QueueName = TaskRegistry[keyof TaskRegistry];

/**
 * Optional: Export core constants if they exist.
 * Keep this separate from the interface used for type augmentation.
 */
export const CoreTasks = {} as const;
