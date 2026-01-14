/**
 * Console Health Provider - Reference Implementation
 *
 * A simple health provider that logs all lifecycle events to console.
 * This can be used as a starting point for custom health providers.
 *
 * Usage:
 * ```typescript
 * import { ConsoleHealthProvider } from '@supergrowthai/tq/providers';
 *
 * const healthProvider = new ConsoleHealthProvider();
 *
 * const taskHandler = new TaskHandler(
 *     messageQueue,
 *     taskQueuesManager,
 *     databaseAdapter,
 *     cacheProvider,
 *     asyncTaskManager,
 *     notificationProvider,
 *     {
 *         lifecycleProvider: healthProvider,
 *         workerProvider: healthProvider,
 *         lifecycle: {
 *             mode: 'async',
 *             heartbeat_interval_ms: 5000
 *         }
 *     }
 * );
 * ```
 */

import type {
    ITaskLifecycleProvider,
    IWorkerLifecycleProvider,
    TaskContext,
    TaskTiming,
    WorkerInfo,
    WorkerStats
} from "../core/lifecycle.js";

export class ConsoleHealthProvider implements ITaskLifecycleProvider, IWorkerLifecycleProvider {
    private readonly prefix: string;

    constructor(prefix: string = '[Health]') {
        this.prefix = prefix;
    }

    // ============ Task Lifecycle ============

    onTaskScheduled(ctx: TaskContext): void {
        console.log(`${this.prefix} Task scheduled: ${ctx.task_type} (${ctx.task_id}) in queue ${ctx.queue_id}`);
    }

    onTaskStarted(ctx: TaskContext & { started_at: Date; queued_duration_ms: number }): void {
        console.log(`${this.prefix} Task started: ${ctx.task_type} (${ctx.task_id}) - queued for ${ctx.queued_duration_ms}ms`);
    }

    onTaskCompleted(ctx: TaskContext & { timing: TaskTiming; result?: unknown }): void {
        console.log(
            `${this.prefix} Task completed: ${ctx.task_type} (${ctx.task_id}) - ` +
            `processing: ${ctx.timing.processing_duration_ms}ms, total: ${ctx.timing.total_duration_ms}ms`
        );
    }

    onTaskFailed(ctx: TaskContext & {
        timing: TaskTiming;
        error: Error;
        will_retry: boolean;
        next_attempt_at?: Date
    }): void {
        console.log(
            `${this.prefix} Task failed: ${ctx.task_type} (${ctx.task_id}) - ` +
            `error: ${ctx.error.message}, will_retry: ${ctx.will_retry}`
        );
    }

    onTaskExhausted(ctx: TaskContext & { timing: TaskTiming; error: Error; total_attempts: number }): void {
        console.log(
            `${this.prefix} Task exhausted: ${ctx.task_type} (${ctx.task_id}) - ` +
            `total attempts: ${ctx.total_attempts}, error: ${ctx.error.message}`
        );
    }

    onTaskCancelled(ctx: TaskContext & { reason: string }): void {
        console.log(`${this.prefix} Task cancelled: ${ctx.task_type} (${ctx.task_id}) - reason: ${ctx.reason}`);
    }

    // ============ Worker Lifecycle ============

    onWorkerStarted(info: WorkerInfo): void {
        console.log(
            `${this.prefix} Worker started: ${info.worker_id} on ${info.hostname} (PID: ${info.pid}) - ` +
            `queues: [${info.enabled_queues.join(', ')}]`
        );
    }

    onWorkerHeartbeat(info: WorkerInfo & { stats: WorkerStats; memory_usage_mb: number }): void {
        console.log(
            `${this.prefix} Worker heartbeat: ${info.worker_id} - ` +
            `processed: ${info.stats.tasks_processed}, success: ${info.stats.tasks_succeeded}, ` +
            `failed: ${info.stats.tasks_failed}, avg: ${info.stats.avg_processing_ms.toFixed(2)}ms, ` +
            `memory: ${info.memory_usage_mb.toFixed(2)}MB`
        );
    }

    onWorkerStopped(info: WorkerInfo & {
        reason: 'shutdown' | 'error' | 'idle_timeout';
        final_stats: WorkerStats
    }): void {
        console.log(
            `${this.prefix} Worker stopped: ${info.worker_id} - reason: ${info.reason} - ` +
            `final stats: ${info.final_stats.tasks_processed} processed, ` +
            `${info.final_stats.tasks_succeeded} succeeded, ${info.final_stats.tasks_failed} failed`
        );
    }

    onBatchStarted(info: WorkerInfo & { batch_size: number; task_types: string[] }): void {
        console.log(
            `${this.prefix} Batch started: ${info.batch_size} tasks - types: [${info.task_types.join(', ')}]`
        );
    }

    onBatchCompleted(info: WorkerInfo & {
        batch_size: number;
        succeeded: number;
        failed: number;
        duration_ms: number
    }): void {
        console.log(
            `${this.prefix} Batch completed: ${info.batch_size} tasks in ${info.duration_ms}ms - ` +
            `succeeded: ${info.succeeded}, failed: ${info.failed}`
        );
    }
}
