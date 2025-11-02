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
        if (!config.instanceId) {
            throw new Error('KinesisMessageProcessor requires instanceId in config');
        }
        if (!config.textDecoder) {
            throw new Error('KinesisMessageProcessor requires textDecoder in config');
        }

        this.timeoutMs = config.timeoutMs || PROCESSOR_TIMEOUT_MS;
        this.textDecoder = config.textDecoder;
    }

    /**
     * Process messages - simple passthrough to processor
     */
    async processMessages(
        queueId: string,
        messages: BaseMessage<PAYLOAD, ID>[],
        processor: MessageConsumer<PAYLOAD, ID, any>
    ): Promise<void> {
        if (!queueId) {
            throw new Error('queueId is required');
        }
        if (!Array.isArray(messages)) {
            throw new Error('messages must be an array');
        }
        if (!processor) {
            throw new Error('processor function is required');
        }
        if (!messages.length) {
            throw new Error('Empty messages array provided - this should not happen');
        }

        logger.debug(`Processing ${messages.length} messages from ${queueId}`);

        // Simple passthrough to processor
        await processor(queueId, messages);
    }


    /**
     * Parse raw Kinesis records into messages - fail fast on parse errors
     */
    parseMessages(records: any[]): BaseMessage<PAYLOAD, ID>[] {
        if (!records || !Array.isArray(records)) {
            throw new Error('Invalid records array provided to parseMessages');
        }

        return records.map((record, index) => {
            if (!record || !record.Data) {
                throw new Error(`Record at index ${index} missing required Data field`);
            }

            if (!record.SequenceNumber) {
                throw new Error(`Record at index ${index} missing required SequenceNumber`);
            }

            try {
                const data = this.textDecoder.decode(record.Data);
                const parsed = EJSON.parse(data);
                return transformTask(parsed);
            } catch (error: any) {
                throw new Error(`Failed to parse record ${record.SequenceNumber}: ${error.message}`);
            }
        });
    }

    /**
     * Process a batch of records
     */
    async processBatch(
        records: Required<GetRecordsCommandOutput>["Records"][],
        processor: MessageConsumer<PAYLOAD, ID, any>,
        queueId: string
    ): Promise<void> {
        if (!records || !Array.isArray(records)) {
            throw new Error('Invalid records array provided to processBatch');
        }
        if (!processor) {
            throw new Error('processor function is required');
        }
        if (!queueId) {
            throw new Error('queueId is required');
        }

        if (!records.length) {
            return;
        }

        const messages = this.parseMessages(records);

        if (messages.length === 0) {
            throw new Error(`Failed to parse any messages from ${records.length} records - this indicates data corruption`);
        }

        // Process all messages
        return await this.processMessages(queueId, messages, processor);
    }

}