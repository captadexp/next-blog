import moment from "moment";
import {BaseMessage} from "../../../core";

/**
 * Transform JSON task to CronTask (preserving original logic from KinesisQueue)
 */
export function transformTask(jsonTask: any): BaseMessage<any> {
    return {
        ...jsonTask,
        _id: jsonTask._id,
        created_at: moment(jsonTask.created_at).toDate(),
        execute_at: moment(jsonTask.execute_at).toDate(),
        updated_at: moment(jsonTask.updated_at).toDate(),
        processing_started_at: jsonTask.processing_started_at
            ? moment(jsonTask.processing_started_at).toDate()
            : undefined
    };
}