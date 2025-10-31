import {QueueName} from "../../core/types.js";

/**
 * Base message structure required by the message queue system
 */
export interface BaseMessage<PAYLOAD = any, ID = any> {
    _id: ID;
    type: string;
    payload: PAYLOAD;
    execute_at: Date;
    status: 'scheduled' | 'processing' | 'executed' | 'failed';
    retries: number;
    created_at: Date;
    updated_at: Date;
    queue_id: QueueName;

    processing_started_at?: Date;
    expires_at?: Date;
    message_group?: string;
    message_hash?: string;
    retry_after?: number;
    execution_stats?: Record<string, unknown>;
    force_store?: boolean;
}

/**
 * Message processor function type - can optionally return a value
 */
export type MessageConsumer<PAYLOAD = any, ID = any, R = void> = (queueId: string, messages: BaseMessage<PAYLOAD, ID>[]) => Promise<R>;

