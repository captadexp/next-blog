/**
 * Registry for all queue names in the system.
 */
export interface QueueRegistry {
    // Augmented by library users
}

/**
 * Registry for all message payload types in the system.
 * Key = message type, Value = payload type
 */
export interface MessagePayloadRegistry {
    // Augmented by library users
}

export type QueueName = keyof QueueRegistry extends never ? string : QueueRegistry[keyof QueueRegistry];

export type MessageType = keyof MessagePayloadRegistry extends never ? string : keyof MessagePayloadRegistry;

export type MessagePayloadType = keyof MessagePayloadRegistry extends never ? unknown : MessagePayloadRegistry[keyof MessagePayloadRegistry];

/**
 * Type-safe message that enforces correct payload for each message type
 */
export type TypedMessage<T extends MessageType = MessageType> =
    keyof MessagePayloadRegistry extends never
        ? { type: T; payload: unknown }
        : T extends keyof MessagePayloadRegistry
            ? { type: T; payload: MessagePayloadRegistry[T] }
            : never;
