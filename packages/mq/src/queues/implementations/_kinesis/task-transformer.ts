import moment from "moment";
import {BaseMessage} from "../../../core";

interface RawMessage {
    _id: string;
    created_at: string | Date;
    execute_at: string | Date;
    updated_at: string | Date;
    processing_started_at?: string | Date;

    [key: string]: unknown;
}

/**
 * Transform raw JSON message to typed BaseMessage
 */
export function transformTask<ID>(rawMessage: RawMessage): BaseMessage<ID> {
    if (!rawMessage.created_at) {
        throw new Error("Message missing required created_at field");
    }
    if (!rawMessage.execute_at) {
        throw new Error("Message missing required execute_at field");
    }
    if (!rawMessage.updated_at) {
        throw new Error("Message missing required updated_at field");
    }

    return {
        ...rawMessage,
        _id: rawMessage._id as ID | undefined,
        created_at: moment(rawMessage.created_at).toDate(),
        execute_at: moment(rawMessage.execute_at).toDate(),
        updated_at: moment(rawMessage.updated_at).toDate(),
        processing_started_at: rawMessage.processing_started_at
            ? moment(rawMessage.processing_started_at).toDate()
            : undefined
    } as BaseMessage<ID>;
}