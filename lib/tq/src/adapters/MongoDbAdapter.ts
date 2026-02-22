import {Collection, ObjectId} from "mongodb";
import {ITaskStorageAdapter, TaskStorageLifecycleConfig} from "./ITaskStorageAdapter.js";
import {CronTask} from "./types.js";
import {Logger, LogLevel} from "@supergrowthai/utils";
import type {ITaskLifecycleProvider} from "../core/lifecycle.js";

const logger = new Logger('MongoDbAdapter', LogLevel.INFO);

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Convert MongoDB document with _id to CronTask with id
 */
function toPublicTask<T>({_id, ...rest}: Omit<CronTask<T>, 'id'> & { _id: T }): CronTask<T> {
    return {...rest, id: _id} as CronTask<T>;
}

/**
 * MongoDB task storage adapter for @supergrowthai/tq.
 *
 * @description Persists scheduled tasks to MongoDB collection with status tracking.
 * Uses application-level locking designed for single-instance deployments.
 *
 * @use-case Single-instance production deployments
 * @multi-instance NOT SAFE - designed for single-instance use.
 *   For multi-instance deployments, implement a distributed locking strategy
 *   or use a Kinesis-based solution with Redis lock provider.
 * @persistence Full - tasks stored in MongoDB until processed/expired
 * @requires MongoDB connection via abstract `collection` getter
 *
 * @features
 * - Stale task recovery: tasks stuck in 'processing' for >2 days are reset
 * - Bulk operations for efficiency
 * - Task expiration cleanup
 *
 * @example
 * ```typescript
 * class MyTaskStorage extends MongoDbAdapter {
 *   get collection() { return db.collection('scheduled_tasks'); }
 * }
 * const adapter = new MyTaskStorage();
 * ```
 */
export abstract class MongoDbAdapter implements ITaskStorageAdapter<ObjectId> {
    private lifecycleProvider?: ITaskLifecycleProvider;
    private lifecycleMode: 'sync' | 'async' = 'async';

    protected constructor() {
    }

    setLifecycleConfig(config: TaskStorageLifecycleConfig): void {
        this.lifecycleProvider = config.lifecycleProvider;
        this.lifecycleMode = config.mode || 'async';
    }

    private emitLifecycleEvent<T>(
        callback: ((ctx: T) => void | Promise<void>) | undefined,
        ctx: T
    ): void {
        if (!callback) return;
        try {
            const result = callback(ctx);
            if (result instanceof Promise) {
                result.catch(err => logger.error(`[TQ] Lifecycle callback error: ${err}`));
            }
        } catch (err) {
            logger.error(`[TQ] Lifecycle callback error: ${err}`);
        }
    }

    abstract get collection(): Promise<Collection<Omit<CronTask<ObjectId>, 'id'> & { _id?: ObjectId; }>> ;

    async addTasksToScheduled(tasks: CronTask<ObjectId>[]): Promise<CronTask<ObjectId>[]> {
        if (!tasks.length) return [];

        const collection = await this.collection;

        const transformedTasks = tasks.map((task) => ({
            _id: task.id,
            type: task.type,
            payload: task.payload,
            execute_at: task.execute_at,
            status: task.status || 'scheduled',
            retries: task.retries || 0,
            created_at: task.created_at || new Date(),
            updated_at: new Date(),
            queue_id: task.queue_id,
            processing_started_at: task.processing_started_at || new Date(),
            expires_at: task.expires_at,
            task_group: task.task_group,
            task_hash: task.task_hash,
            retry_after: task.retry_after,
            execution_stats: task.execution_stats,
            force_store: task.force_store
        }));

        try {
            await collection.insertMany(transformedTasks, {ordered: false});
            return transformedTasks.map(toPublicTask);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'writeErrors' in error) {
                const mongoError = error as { writeErrors: Array<{ index: number }> };
                const successfulTasks = transformedTasks.filter((_, index) =>
                    !mongoError.writeErrors.some((e) => e.index === index)
                );
                return successfulTasks.map(toPublicTask);
            }
            throw error;
        }
    }

    // TODO(P3): Use findOneAndUpdate for atomic claim instead of find() + update().
    //   Multiple workers can pick up the same tasks. Dedup via cache is best-effort.
    async getMatureTasks(timestamp: number): Promise<CronTask<ObjectId>[]> {
        const collection = await this.collection;

        // Phase 1: Reset stale processing tasks
        const staleTimestamp = Date.now() - TWO_DAYS_MS;
        await collection.updateMany(
            {
                status: 'processing',
                processing_started_at: {$lt: new Date(staleTimestamp)}
            },
            {
                $set: {status: 'scheduled'}
            }
        );

        // Phase 2: Fetch and mark mature tasks
        const filter = {
            status: 'scheduled' as const,
            execute_at: {$lte: new Date(timestamp)}
        };

        const tasks = await collection
            .find(filter)
            .limit(1000)
            .toArray();

        if (tasks.length > 0) {
            const taskIds = tasks.map(t => t._id);
            await collection.updateMany(
                {_id: {$in: taskIds}},
                {
                    $set: {
                        status: 'processing',
                        processing_started_at: new Date()
                    }
                }
            );
        }

        return tasks.map(toPublicTask);
    }

    async markTasksAsProcessing(tasks: CronTask<ObjectId>[], processingStartedAt: Date): Promise<void> {
        const collection = await this.collection;
        const taskIds = tasks.map(t => t.id).filter(Boolean) as ObjectId[];

        await collection.updateMany(
            {_id: {$in: taskIds}},
            {
                $set: {
                    status: 'processing',
                    processing_started_at: processingStartedAt,
                    updated_at: new Date()
                }
            }
        );
    }

    async markTasksAsExecuted(tasks: CronTask<ObjectId>[]): Promise<void> {
        const collection = await this.collection;
        const now = new Date();

        // Split: tasks with results need per-task ops, rest use efficient batch updateMany
        const withResults: CronTask<ObjectId>[] = [];
        const withoutResultIds: ObjectId[] = [];

        for (const t of tasks) {
            if (!t.id) continue;
            if (t.execution_result !== undefined) {
                withResults.push(t);
            } else {
                withoutResultIds.push(t.id);
            }
        }

        // Fast path: single updateMany for all tasks without results
        if (withoutResultIds.length > 0) {
            await collection.updateMany(
                {_id: {$in: withoutResultIds}},
                {$set: {status: 'executed', updated_at: now}}
            );
        }

        // Slow path: bulkWrite only for tasks that carry a result
        if (withResults.length > 0) {
            const bulkOps = withResults.map(t => ({
                updateOne: {
                    filter: {_id: t.id!},
                    update: {
                        $set: {
                            status: 'executed' as const,
                            updated_at: now,
                            execution_result: t.execution_result
                        }
                    }
                }
            }));
            await collection.bulkWrite(bulkOps, {ordered: false});
        }
    }

    async markTasksAsFailed(tasks: CronTask<ObjectId>[]): Promise<void> {
        const collection = await this.collection;
        const taskIds = tasks.map(t => t.id).filter(Boolean) as ObjectId[];


        await collection.updateMany(
            {_id: {$in: taskIds}},
            {
                $set: {
                    status: 'failed',
                    updated_at: new Date()
                }
            }
        );
    }

    async getTasksByIds(taskIds: ObjectId[]): Promise<CronTask<ObjectId>[]> {
        const collection = await this.collection;

        return collection
            .find({_id: {$in: taskIds}})
            .toArray()
            .then(result => result.map(toPublicTask));
    }

    async getCleanupStats(): Promise<{ orphanedTasks: number; expiredTasks: number }> {
        const collection = await this.collection;

        const orphanedBefore = new Date(Date.now() - TWO_DAYS_MS);
        const orphanedTasks = await collection.countDocuments({
            status: 'processing',
            processing_started_at: {$lt: orphanedBefore}
        });

        const expiredTasks = await collection.countDocuments({
            expires_at: {$lt: new Date()}
        });

        return {orphanedTasks, expiredTasks};
    }

    async cleanupTasks(orphanedBefore: Date, expiredBefore: Date): Promise<void> {
        const collection = await this.collection;

        // Clean up orphaned tasks
        await collection.deleteMany({
            status: 'processing',
            processing_started_at: {$lt: orphanedBefore}
        });

        // Clean up expired tasks
        await collection.deleteMany({
            expires_at: {$lt: expiredBefore}
        });
    }

    async updateTasks(updates: Array<{ id: ObjectId; updates: Partial<CronTask<ObjectId>> }>): Promise<void> {
        const collection = await this.collection;

        const bulkOps = updates.map(({id, updates}) => ({
            updateOne: {
                filter: {_id: id},
                update: {
                    $set: {
                        ...updates,
                        updated_at: new Date()
                    }
                }
            }
        }));

        if (bulkOps.length > 0) {
            // ordered: false allows remaining ops to continue if one fails (e.g., duplicate key)
            await collection.bulkWrite(bulkOps, {ordered: false});
        }
    }

    async upsertTasks(tasks: CronTask<ObjectId>[]): Promise<void> {
        if (!tasks.length) return;
        const collection = await this.collection;
        const now = new Date();

        const bulkOps = tasks.map(task => {
            const id = task.id || this.generateId();
            const {id: _id, status, execute_at, execution_stats, updated_at, ...rest} = task;
            return {
                updateOne: {
                    filter: {_id: id},
                    update: {
                        $set: {
                            status: task.status,
                            execute_at: task.execute_at,
                            execution_stats: task.execution_stats,
                            updated_at: now
                        },
                        $setOnInsert: {
                            ...rest,
                            created_at: task.created_at || now,
                            processing_started_at: task.processing_started_at || now
                        }
                    },
                    upsert: true
                }
            };
        });

        // ordered: false allows remaining ops to continue if one fails
        await collection.bulkWrite(bulkOps, {ordered: false});
    }

    generateId() {
        return new ObjectId();
    }

    async close() {
    }

    async initialize() {
    }

    async markTasksAsIgnored(tasks: CronTask<ObjectId>[]): Promise<void> {
        const collection = await this.collection;
        const taskIds = tasks.map(t => t.id).filter(Boolean) as ObjectId[];


        await collection.updateMany(
            {_id: {$in: taskIds}},
            {
                $set: {
                    status: 'ignored',
                    //update execution_stats
                    updated_at: new Date()
                },
            }
        );
    }
}