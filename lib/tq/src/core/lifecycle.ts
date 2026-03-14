/**
 * Task Queue Lifecycle Types
 * Provides interfaces for task and worker lifecycle callbacks
 */
import type {EntityProjectionConfig, IEntityProjectionProvider} from "./entity/IEntityProjectionProvider.js";

// ============ Task Lifecycle Types ============

export interface TaskContext {
    /** Unique task identifier */
    task_id: string;
    /** Optional hash for deduplication */
    task_hash?: string;
    /** Task type identifier */
    task_type: string;
    /** Queue this task belongs to */
    queue_id: string;
    /** Task payload (empty if include_payload is false) */
    payload: Record<string, unknown>;
    /** Current retry attempt (1-based) */
    attempt: number;
    /** Maximum retries allowed */
    max_retries: number;
    /** When task was scheduled */
    scheduled_at: Date;
    /** Worker/server processing this task (hostname-pid-timestamp) */
    worker_id?: string;
    /** Consumer stream identity (provider:queue or shard ID) — distinguishes M consumers on same worker */
    consumer_id?: string;
    /** User-provided log correlation context (RFC-005) */
    log_context?: Record<string, string>;
}

export interface TaskTiming {
    /** Time spent waiting in queue (ms) */
    queued_duration_ms: number;
    /** Time spent executing (ms) */
    processing_duration_ms: number;
    /** End-to-end duration (ms) */
    total_duration_ms: number;
}

export interface ITaskLifecycleProvider {
    /** Called when a task is added to the queue */
    onTaskScheduled?(ctx: TaskContext): void | Promise<void>;

    /** Called when a worker picks up a task for processing */
    onTaskStarted?(ctx: TaskContext & {
        started_at: Date;
        queued_duration_ms: number;
    }): void | Promise<void>;

    /** Called when a task completes successfully */
    onTaskCompleted?(ctx: TaskContext & {
        timing: TaskTiming;
        result?: unknown;
    }): void | Promise<void>;

    /** Called when a task fails (before retry decision) */
    onTaskFailed?(ctx: TaskContext & {
        timing: TaskTiming;
        error: Error;
        will_retry: boolean;
        next_attempt_at?: Date;
    }): void | Promise<void>;

    /** Called when a task exhausts all retries */
    onTaskExhausted?(ctx: TaskContext & {
        timing: TaskTiming;
        error: Error;
        total_attempts: number;
    }): void | Promise<void>;

    /** Called when a task is manually cancelled/discarded */
    onTaskCancelled?(ctx: TaskContext & {
        reason: string;
    }): void | Promise<void>;

    /** Called when a multi-task (batch) executor starts processing a task group */
    onTaskBatchStarted?(ctx: {
        task_type: string;
        queue_id: string;
        tasks: TaskContext[];
        worker_id: string;
        consumer_id?: string;
        started_at: Date;
    }): void | Promise<void>;

    /** Called when a multi-task (batch) executor finishes processing a task group */
    onTaskBatchCompleted?(ctx: {
        task_type: string;
        queue_id: string;
        tasks: TaskContext[];
        worker_id: string;
        consumer_id?: string;
        succeeded: string[];   // task_ids that succeeded
        failed: string[];      // task_ids that failed
        duration_ms: number;
    }): void | Promise<void>;
}

// ============ Worker Lifecycle Types ============

export interface WorkerInfo {
    /** Unique worker identifier */
    worker_id: string;
    /** Hostname of the machine */
    hostname: string;
    /** Process ID */
    pid: number;
    /** When worker started */
    started_at: Date;
    /** Queues this worker is consuming */
    enabled_queues: string[];
}

export interface WorkerStats {
    /** Total tasks processed */
    tasks_processed: number;
    /** Successfully completed tasks */
    tasks_succeeded: number;
    /** Failed tasks */
    tasks_failed: number;
    /** Average processing time (ms) */
    avg_processing_ms: number;
    /** Currently processing task info */
    current_task?: {
        task_type: string;
        started_at: Date;
    };
}

export interface ConsumerInfo {
    /** Consumer stream identity (provider:queue or shard ID) */
    consumer_id: string;
    /** Queue this consumer is bound to */
    queue_id: string;
    /** Worker/server hosting this consumer (hostname-pid-timestamp) */
    worker_id: string;
    /** When this consumer was first seen (first batch arrival) */
    started_at: Date;
}

export interface ConsumerStats {
    /** Consumer stream identity */
    consumer_id: string;
    /** Queue this consumer is bound to */
    queue_id: string;
    /** Total tasks processed by this consumer */
    tasks_processed: number;
    /** Successfully completed tasks */
    tasks_succeeded: number;
    /** Failed tasks */
    tasks_failed: number;
    /** When the last task was processed */
    last_task_at?: Date;
}

export interface IWorkerLifecycleProvider {
    /** Called when a worker starts consuming tasks */
    onWorkerStarted?(info: WorkerInfo): void | Promise<void>;

    /** Called periodically with worker stats */
    onWorkerHeartbeat?(info: WorkerInfo & {
        stats: WorkerStats;
        memory_usage_mb: number;
        cpu_percent?: number;
        /** Per-consumer stats for SRE dashboard — identifies all active consumers on this worker */
        active_consumers: ConsumerStats[];
    }): void | Promise<void>;

    /** Called when a worker stops */
    onWorkerStopped?(info: WorkerInfo & {
        reason: 'shutdown' | 'error' | 'idle_timeout';
        final_stats: WorkerStats;
    }): void | Promise<void>;

    /** Called when worker starts processing a batch */
    onBatchStarted?(info: WorkerInfo & {
        batch_size: number;
        task_types: string[];
    }): void | Promise<void>;

    /** Called when worker finishes processing a batch */
    onBatchCompleted?(info: WorkerInfo & {
        batch_size: number;
        succeeded: number;
        failed: number;
        duration_ms: number;
    }): void | Promise<void>;

    /** Called lazily on first batch arrival for a consumer — use for SRE consumer→worker mapping */
    onConsumerStarted?(info: ConsumerInfo): void | Promise<void>;

    /** Called when a consumer stops (worker shutdown) */
    onConsumerStopped?(info: ConsumerInfo & {
        reason: 'shutdown' | 'error' | 'idle_timeout';
        stats: ConsumerStats;
    }): void | Promise<void>;
}

// ============ Flow Lifecycle Types ============

export interface FlowContext {
    flow_id: string;
    total_steps: number;
    join: { type: string; queue_id: string };
    failure_policy: 'continue' | 'abort';
    entity?: { id: string; type: string };
    /** Worker/server that emitted this event — for SRE dashboard correlation */
    worker_id: string;
    /** Consumer stream identity — for multi-consumer-per-worker setups */
    consumer_id?: string;
}

export interface IFlowLifecycleProvider {
    onFlowStarted?(ctx: FlowContext & { started_at: Date; step_types: string[] }): void | Promise<void>;
    onFlowCompleted?(ctx: FlowContext & { duration_ms: number; steps_succeeded: number; steps_failed: number }): void | Promise<void>;
    onFlowAborted?(ctx: FlowContext & { duration_ms: number; steps_completed: number; trigger_step_index: number }): void | Promise<void>;
    onFlowTimedOut?(ctx: FlowContext & { duration_ms: number; steps_completed: number }): void | Promise<void>;
}

// ============ Configuration Types ============

export interface TaskHandlerLifecycleConfig {
    /** Callback execution mode: 'sync' blocks, 'async' is fire-and-forget */
    mode?: 'sync' | 'async';
    /** Heartbeat interval in ms (default: 5000) */
    heartbeat_interval_ms?: number;
    /** Include payload in task context (default: false for performance) */
    include_payload?: boolean;
}

export interface TaskHandlerConfig {
    /** Task lifecycle event provider */
    lifecycleProvider?: ITaskLifecycleProvider;
    /** Worker lifecycle event provider */
    workerProvider?: IWorkerLifecycleProvider;
    /** Lifecycle callback configuration */
    lifecycle?: TaskHandlerLifecycleConfig;
    /** RFC-003: Entity-task projection provider */
    entityProjection?: IEntityProjectionProvider;
    /** RFC-003: Entity projection configuration */
    entityProjectionConfig?: EntityProjectionConfig;
    /** RFC-002: Flow middleware for fan-out/fan-in orchestration */
    flowMiddleware?: import("./flow/FlowMiddleware.js").FlowMiddleware<any>;
    /** Flow lifecycle event provider */
    flowLifecycleProvider?: IFlowLifecycleProvider;
}
