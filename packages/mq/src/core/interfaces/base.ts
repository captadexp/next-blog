import {QueueName} from "../types.js";

/**
 * Base message structure required by the message queue system
 */
export interface BaseMessage<PAYLOAD = any, ID = any> {
    _id: ID;
    type: string;
    payload: PAYLOAD;
    execute_at: Date;
    status: 'scheduled' | 'processing' | 'executed' | 'failed' | 'expired' | 'ignored';
    created_at: Date;
    updated_at: Date;
    queue_id: QueueName;

    retries: number;
    retry_after?: number;
    expires_at?: Date;


    processing_started_at?: Date;
    force_store?: boolean;
    execution_stats?: Record<string, unknown>;
}

/**
 * Message processor function type - can optionally return a value
 */
export type MessageConsumer<PAYLOAD, ID, R = void> = (queueId: string, messages: BaseMessage<PAYLOAD, ID>[]) => Promise<R>;

