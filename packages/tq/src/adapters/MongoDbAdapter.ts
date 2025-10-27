import {Collection, Db, MongoClient, ObjectId} from "mongodb";
import {IDatabaseAdapter} from "./IDatabaseAdapter.js";
import {CronTask} from "./CronTasksAdapter.js";
import {Logger, LogLevel} from "@supergrowthai/utils";

const logger = new Logger('MongoDbAdapter', LogLevel.INFO);

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * MongoDB implementation of IDatabaseAdapter
 */
export class MongoDbAdapter implements IDatabaseAdapter {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private tasksCollection: Collection<any> | null = null;
    private readonly uri: string;
    private readonly dbName: string;
    private readonly collectionName: string;

    constructor(
        uri: string = process.env.MONGODB_URI || 'mongodb://localhost:27017',
        dbName: string = process.env.DB_NAME || 'taskqueue',
        collectionName: string = 'scheduled'
    ) {
        this.uri = uri;
        this.dbName = dbName;
        this.collectionName = collectionName;
    }

    async initialize(): Promise<void> {
        if (this.db) return;

        this.client = new MongoClient(this.uri);
        await this.client.connect();
        this.db = this.client.db(this.dbName);
        this.tasksCollection = this.db.collection<CronTask<any>>(this.collectionName);

        // Create indexes
        await this.tasksCollection.createIndex({execute_at: 1, status: 1});
        await this.tasksCollection.createIndex({status: 1, processing_started_at: 1});
        await this.tasksCollection.createIndex({expires_at: 1}, {sparse: true});

        logger.info(`Connected to MongoDB at ${this.uri}/${this.dbName}`);
    }

    async addTasksToScheduled(tasks: CronTask<any>[]): Promise<CronTask<any>[]> {
        if (!tasks.length) return [];

        const collection = await this.ensureConnection();

        const transformedTasks: CronTask<any>[] = tasks.map((task) => ({
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

    async getMatureTasks(timestamp: number): Promise<CronTask<any>[]> {
        const collection = await this.ensureConnection();

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
        const collection = await this.ensureConnection();

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
        const collection = await this.ensureConnection();

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
        const collection = await this.ensureConnection();

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

    async getTasksByIds(taskIds: ObjectId[]): Promise<CronTask<any>[]> {
        const collection = await this.ensureConnection();

        return collection
            .find({_id: {$in: taskIds}})
            .toArray();
    }

    async updateTasks(updates: Array<{ id: ObjectId; updates: Partial<CronTask<any>> }>): Promise<void> {
        const collection = await this.ensureConnection();

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
        const collection = await this.ensureConnection();

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
        const collection = await this.ensureConnection();

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

    async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.tasksCollection = null;
            logger.info('Disconnected from MongoDB');
        }
    }

    private async ensureConnection(): Promise<Collection<any>> {
        if (!this.tasksCollection) {
            await this.initialize();
        }
        return this.tasksCollection!;
    }
}