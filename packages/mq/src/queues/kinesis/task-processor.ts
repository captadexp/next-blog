import {Logger, LogLevel} from "@supergrowthai/utils";
import {EJSON} from "bson";
import {GetRecordsCommandOutput} from "@aws-sdk/client-kinesis";
import {PROCESSOR_TIMEOUT_MS} from "./constants.js";
import {transformTask} from "./task-transformer.js";
import * as NodeUtils from 'node:util';
import {BaseTask, ProcessedTaskResult} from "../../adapters/index.js";
import {Processor} from "../IMessageQueue.js";

const logger = new Logger('TaskProcessor', LogLevel.INFO);

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
export class TaskProcessor {
    private readonly timeoutMs: number;
    private readonly textDecoder: NodeUtils.TextDecoder;

    constructor(config: ProcessorConfig) {
        if (!config.instanceId) {
            throw new Error('TaskProcessor requires instanceId in config');
        }
        if (!config.textDecoder) {
            throw new Error('TaskProcessor requires textDecoder in config');
        }

        this.timeoutMs = config.timeoutMs || PROCESSOR_TIMEOUT_MS;
        this.textDecoder = config.textDecoder;
    }

    /**
     * Process tasks - simple passthrough to processor
     */
    async processTasks(
        queueId: string,
        tasks: BaseTask<any>[],
        processor: Processor
    ): Promise<ProcessedTaskResult> {
        if (!queueId) {
            throw new Error('queueId is required');
        }
        if (!Array.isArray(tasks)) {
            throw new Error('tasks must be an array');
        }
        if (!processor) {
            throw new Error('processor function is required');
        }
        if (!tasks.length) {
            throw new Error('Empty tasks array provided - this should not happen');
        }

        logger.debug(`Processing ${tasks.length} tasks from ${queueId}`);

        // Simple passthrough to processor
        const result = await processor(queueId, tasks);

        if (!result) {
            throw new Error('Processor returned null result');
        }

        return result;
    }


    /**
     * Parse raw Kinesis records into tasks - fail fast on parse errors
     */
    parseTasks(records: any[]): BaseTask<any>[] {
        if (!records || !Array.isArray(records)) {
            throw new Error('Invalid records array provided to parseTasks');
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
        processor: Processor,
        queueId: string
    ): Promise<ProcessedTaskResult> {
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
            return {
                failedTasks: [],
                newTasks: [],
                successTasks: []
            };
        }

        const tasks = this.parseTasks(records);

        if (tasks.length === 0) {
            throw new Error(`Failed to parse any tasks from ${records.length} records - this indicates data corruption`);
        }

        // Process all tasks
        return await this.processTasks(queueId, tasks, processor);
    }

}

/**
 * Custom error for processor timeouts
 */
export class ProcessorTimeoutError extends Error {
    constructor(
        public readonly queueId: string,
        public readonly timeoutMs: number
    ) {
        super(`Processor timed out after ${timeoutMs}ms for queue ${queueId}`);
        this.name = 'ProcessorTimeoutError';
    }
}