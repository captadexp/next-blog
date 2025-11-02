import {Logger, LogLevel} from "@supergrowthai/utils";
import {EJSON} from "bson";
import {GetRecordsCommandOutput} from "@aws-sdk/client-kinesis";
import {PROCESSOR_TIMEOUT_MS} from "./constants.js";
import {transformTask} from "./task-transformer.js";
import * as NodeUtils from 'node:util';
import {BaseMessage, MessageConsumer} from "../../../core";

const logger = new Logger('KinesisMessageProcessor', LogLevel.INFO);

interface ProcessorConfig {
    timeoutMs?: number;
    textDecoder: NodeUtils.TextDecoder;
    instanceId: string;
    maxAsyncTasks?: number;
}

/**
 * Handles task processing from Kinesis records
 * Simple processor - async handling is done at tq layer
 */
export class KinesisMessageProcessor<PAYLOAD, ID> {
    private readonly timeoutMs: number;
    private readonly textDecoder: NodeUtils.TextDecoder;

    constructor(config: ProcessorConfig) {
        this.timeoutMs = config.timeoutMs || PROCESSOR_TIMEOUT_MS;
        this.textDecoder = config.textDecoder;
    }

    /**
     * Process messages - simple passthrough to processor
     */
    async processMessages(
        queueId: string,
        messages: BaseMessage<PAYLOAD, ID>[],
        processor: MessageConsumer<PAYLOAD, ID, unknown>
    ): Promise<void> {
        logger.debug(`Processing ${messages.length} messages from ${queueId}`);
        await processor(queueId, messages);
    }


    /**
     * Parse raw Kinesis records into messages - fail fast on parse errors
     */
    parseMessages(records: unknown[]): BaseMessage<PAYLOAD, ID>[] {

        return records.map((record) => {
            const rec = record as {Data: Uint8Array};
            const data = this.textDecoder.decode(rec.Data);
            const parsed = EJSON.parse(data);
            return transformTask(parsed);
        });
    }

    /**
     * Process a batch of records
     */
    async processBatch(
        records: NonNullable<GetRecordsCommandOutput["Records"]>,
        processor: MessageConsumer<PAYLOAD, ID, unknown>,
        queueId: string
    ): Promise<void> {
        if (!records.length) {
            return;
        }

        const messages = this.parseMessages(records);

        await this.processMessages(queueId, messages, processor);
    }

}