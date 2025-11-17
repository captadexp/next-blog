import {QueueName} from "../types.js";

/**
 * Queue event notification interface for library consumers
 */
export interface QueueNotifier {
    /**
     * Called when the queue is shutting down
     * @param instanceId - The instance identifier
     * @param stats - Queue statistics (messages produced, processed, etc.)
     */
    onShutdown?(instanceId: string, stats: QueueStats): Promise<void>;

    /**
     * Called when an error occurs
     * @param error - The error that occurred
     * @param context - Additional context about where the error occurred
     */
    onError?(error: Error, context: ErrorContext): Promise<void>;
}

export interface QueueStats {
    queueName?: QueueName;
    messagesProduced: number;
    messagesProcessed: number;
    startTime?: Date;
    endTime?: Date;
    [key: string]: unknown; // Allow additional stats
}

export interface ErrorContext {
    queueName?: QueueName;
    operation: string;
    instanceId?: string;
    [key: string]: unknown; // Allow additional context
}