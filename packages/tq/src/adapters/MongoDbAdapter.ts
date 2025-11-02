import {Collection, ObjectId} from "mongodb";
import {ITaskStorageAdapter} from "./ITaskStorageAdapter.js";
import {CronTask} from "./types.js";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('MongoDbAdapter', LogLevel.INFO);

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * MongoDB implementation of IDatabaseAdapter
 */
export abstract class MongoDbAdapter<PAYLOAD = any> implements ITaskStorageAdapter<PAYLOAD, ObjectId> {

    protected constructor() {
    }

    async addTasksToScheduled(tasks: CronTask<PAYLOAD, ObjectId>[]): Promise<CronTask<PAYLOAD, ObjectId>[]> {
        if (!tasks.length) return [];

        const collection = await this.collection;

        const transformedTasks: CronTask<PAYLOAD>[] = tasks.map((task) => ({
            _id: task._id,
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
            return transformedTasks;
        } catch (error: any) {
            if (error.writeErrors) {
                const successfulTasks = transformedTasks.filter((_, index) =>
                    !error.writeErrors.some((e: any) => e.index === index)
                );
                return successfulTasks;
            }
            throw error;
        }
    }

    async getMatureTasks(timestamp: number): Promise<CronTask<PAYLOAD, ObjectId>[]> {
        const collection = await this.collection;

        // Phase 1: Reset stale processing tasks
        const staleTimestamp = Date.now() - TWO_DAYS_MS;
        await collection.updateMany(
            {
                status: 'processing',
                processing_started_at: {$lt: new Date(staleTimestamp)}
            },
            {
                $set: {status: 'scheduled'},
                $inc: {retries: 1}
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

        return tasks;
    }

    async markTasksAsProcessing(taskIds: ObjectId[], processingStartedAt: Date): Promise<void> {
        const collection = await this.collection;

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

    async markTasksAsExecuted(taskIds: ObjectId[]): Promise<void> {
        const collection = await this.collection;

        await collection.updateMany(
            {_id: {$in: taskIds}},
            {
                $set: {
                    status: 'executed',
                    updated_at: new Date()
                }
            }
        );
    }

    async markTasksAsFailed(taskIds: ObjectId[]): Promise<void> {
        const collection = await this.collection;

        await collection.updateMany(
            {_id: {$in: taskIds}},
            {
                $set: {
                    status: 'failed',
                    updated_at: new Date()
                },
                $inc: {retries: 1}
            }
        );
    }

    async getTasksByIds(taskIds: ObjectId[]): Promise<CronTask<PAYLOAD, ObjectId>[]> {
        const collection = await this.collection;

        return collection
            .find({_id: {$in: taskIds}})
            .toArray();
    }

    async updateTasks(updates: Array<{ id: ObjectId; updates: Partial<CronTask<PAYLOAD, ObjectId>> }>): Promise<void> {
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
            await collection.bulkWrite(bulkOps);
        }
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

    abstract get collection(): Promise<Collection<CronTask<PAYLOAD, ObjectId>>>;

    generateId() {
        return new ObjectId();
    }

    async close() {
    }

    async initialize() {
    }

    async markTasksAsIgnored(taskIds: ObjectId[]): Promise<void> {
        const collection = await this.collection;

        await collection.updateMany(
            {_id: {$in: taskIds}},
            {
                $set: {
                    status: 'ignored',
                    //update execution_stats
                    updated_at: new Date()
                },
            },
            {upsert: true} // Always upsert ignored tasks to ensure they're recorded
        );
    }
}