import {ITaskStorageAdapter, TaskStorageLifecycleConfig} from "./ITaskStorageAdapter.js";
import {CronTask} from "./types.js";
import {Logger, LogLevel} from "@supergrowthai/utils";
import {PrismaClient} from "@prisma/client/extension";
import type {ITaskLifecycleProvider} from "../core/lifecycle.js";

const logger = new Logger('PrismaAdapter', LogLevel.INFO);
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;


// ---- Type utilities ----

/** A Prisma client that is guaranteed to have model delegate K. */
export type ClientWithModel<K extends keyof PrismaClient> =
    Pick<PrismaClient, K>;

/** Extract the entity (row) type from a model delegate. */
type EntityOf<D> =
    D extends { findUnique(args: any): Promise<infer U | null> } ? U :
        D extends { findFirst(args: any): Promise<infer U | null> } ? U :
            D extends { findMany(args?: any): Promise<(infer U)[]> } ? U :
                never;

/** Compile-time guard: model's entity must be compatible with the shape you require. */
type EnsureModelShape<Delegate, Needed> =
    EntityOf<Delegate> extends Needed ? unknown : never;

/**
 * Prisma task storage adapter for @supergrowthai/tq.
 *
 * @description Persists scheduled tasks to any Prisma model with status tracking.
 * Uses application-level locking designed for single-instance deployments.
 *
 * @use-case Single-instance production deployments with Prisma ORM
 * @multi-instance NOT SAFE - designed for single-instance use.
 *   For multi-instance deployments, implement a distributed locking strategy
 *   or use a Kinesis-based solution with Redis lock provider.
 * @persistence Full - tasks stored in database until processed/expired
 * @requires Prisma client with a model matching CronTask structure
 *
 * @features
 * - Stale task recovery: tasks stuck in 'processing' for >2 days are reset
 * - Transaction support for batch updates
 * - Task expiration cleanup
 *
 * @typeParam TId - The ID type (string, number, etc.)
 * @typeParam K - The Prisma model key (e.g. 'scheduledTask')
 * @typeParam Msg - The task type extending CronTask<TId>
 *
 * @example
 * ```typescript
 * const adapter = new PrismaAdapter({
 *   prismaClient: prisma,
 *   messageModel: 'scheduledTask'
 * });
 * ```
 */
export class PrismaAdapter<
    TId = any,
    K extends keyof PrismaClient = never,
    Msg extends CronTask<TId> = CronTask<TId>
> implements ITaskStorageAdapter<TId> {
    private lifecycleProvider?: ITaskLifecycleProvider;
    private lifecycleMode: 'sync' | 'async' = 'async';

    constructor(
        private config: {
            prismaClient: ClientWithModel<K>;
            messageModel: K;
            /**
             * Phantom type param that enforces:
             *  - client has model K
             *  - entity type of client[K] extends Msg (which extends BaseMessage<TId>)
             * Do not pass at runtime.
             */
            _shapeCheck?: EnsureModelShape<PrismaClient[K], Msg> & (Msg extends CronTask<TId> & {
                id: TId
            } ? unknown : never);
        }
    ) {
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

    get prismaClient(): PrismaClient {
        return this.config.prismaClient;
    }

    get taskTableName(): string {
        return String(this.config.messageModel);
    }

    protected get delegate(): PrismaClient[K] {
        return this.config.prismaClient[this.config.messageModel];
    }

    /**
     * Persist tasks to the database as scheduled.
     *
     * **Default implementation:** Uses individual creates with duplicate detection
     * for maximum database compatibility (SQLite, Postgres, MySQL, etc.).
     *
     * **Performance note:** This is O(n) database round-trips. For high-throughput
     * scenarios (100+ tasks/batch), override this method with a batch implementation:
     *
     * @example PostgreSQL/MySQL optimization:
     * ```typescript
     * class OptimizedPrismaAdapter extends PrismaAdapter {
     *   async addTasksToScheduled(tasks) {
     *     if (!tasks.length) return [];
     *     await this.delegate.createMany({
     *       data: tasks.map(t => ({ ...t, id: t.id || this.generateId() })),
     *       skipDuplicates: true
     *     });
     *     return tasks;
     *   }
     * }
     * ```
     */
    async addTasksToScheduled(tasks: CronTask<TId>[]): Promise<CronTask<TId>[]> {
        if (!tasks.length) return [];

        // Performance hint for high-throughput scenarios
        if (tasks.length > 50) {
            logger.warn(`[PrismaAdapter] Processing ${tasks.length} tasks sequentially (O(n) round-trips). For Postgres/MySQL, override addTasksToScheduled with createMany for better performance.`);
        }

        // Sequential creates for broad DB compatibility (SQLite, CockroachDB, etc.)
        // Override this method for batch optimization on Postgres/MySQL
        const results: CronTask<TId>[] = [];
        for (const task of tasks) {
            try {
                await this.delegate.create({
                    data: {
                        ...task,
                        id: task.id || this.generateId(),
                        status: task.status || 'scheduled',
                        retries: task.retries || 0,
                        created_at: task.created_at || new Date(),
                        updated_at: new Date(),
                        processing_started_at: task.processing_started_at || new Date()
                    }
                });
                results.push(task);
            } catch (error: unknown) {
                logger.warn(`Task skipped (likely duplicate): ${error}`);
            }
        }
        return results;
    }

    // TODO(P3): Use UPDATE ... RETURNING for atomic claim instead of find() + update().
    //   Multiple workers can pick up the same tasks. Dedup via cache is best-effort.
    async getMatureTasks(timestamp: number): Promise<CronTask<TId>[]> {
        const staleTimestamp = Date.now() - TWO_DAYS_MS;

        await this.delegate.updateMany({
            where: {
                status: 'processing',
                processing_started_at: {lt: new Date(staleTimestamp)}
            },
            data: {status: 'scheduled'}
        });

        const tasks = await this.delegate.findMany({
            where: {
                status: 'scheduled',
                execute_at: {lte: new Date(timestamp)}
            },
            take: 1000,
            orderBy: {execute_at: 'asc'}
        });

        if (tasks.length > 0) {
            const taskIds = tasks.map((t: any) => t.id);
            await this.delegate.updateMany({
                where: {id: {in: taskIds}},
                data: {
                    status: 'processing',
                    processing_started_at: new Date()
                }
            });
        }

        return tasks;
    }

    async markTasksAsProcessing(tasks: CronTask<TId>[], processingStartedAt: Date): Promise<void> {
        const taskIds = tasks.map(t => t.id).filter(Boolean);
        if (!taskIds.length) return;

        await this.delegate.updateMany({
            where: {id: {in: taskIds}},
            data: {
                status: 'processing',
                processing_started_at: processingStartedAt,
                updated_at: new Date()
            }
        });
    }

    async markTasksAsExecuted(tasks: CronTask<TId>[]): Promise<void> {
        const taskIds = tasks.map(t => t.id).filter(Boolean);
        if (!taskIds.length) return;

        await this.delegate.updateMany({
            where: {id: {in: taskIds}},
            data: {status: 'executed', updated_at: new Date()}
        });
    }

    async markTasksAsFailed(tasks: CronTask<TId>[]): Promise<void> {
        const taskIds = tasks.map(t => t.id).filter(Boolean);
        if (!taskIds.length) return;

        await this.delegate.updateMany({
            where: {id: {in: taskIds}},
            data: {status: 'failed', updated_at: new Date()}
        });
    }

    async markTasksAsIgnored(tasks: CronTask<TId>[]): Promise<void> {
        const taskIds = tasks.map(t => t.id).filter(Boolean);
        if (!taskIds.length) return;

        await this.delegate.updateMany({
            where: {id: {in: taskIds}},
            data: {status: 'ignored', updated_at: new Date()}
        });
    }

    async getTasksByIds(taskIds: TId[]): Promise<CronTask<TId>[]> {
        if (!taskIds.length) return [];

        return this.delegate.findMany({
            where: {id: {in: taskIds}}
        });
    }

    async updateTasks(updatesList: Array<{ id: TId; updates: Partial<CronTask<TId>> }>): Promise<void> {
        //fixme do we need a transaction. good but defo ?
        await this.prismaClient
            .$transaction(async (prisma) => {
                for (const {id, updates} of updatesList) {
                    await (prisma as any)[this.taskTableName]
                        .update({
                            where: {id: id},
                            data: {...updates, updated_at: new Date()}
                        });
                }
            });
    }

    async upsertTasks(tasks: CronTask<TId>[]): Promise<void> {
        if (!tasks.length) return;

        const now = new Date();
        const delegate = this.delegate;

        // Each task may have different status/execute_at/execution_stats,
        // so per-task upsert is unavoidable. Wrapped in a transaction for atomicity.
        await this.prismaClient
            .$transaction(
                tasks.map(task => delegate.upsert({
                    where: {id: task.id},
                    create: {
                        ...task,
                        created_at: task.created_at || now,
                        updated_at: now,
                        processing_started_at: task.processing_started_at || now
                    },
                    update: {
                        status: task.status,
                        execute_at: task.execute_at,
                        execution_stats: task.execution_stats,
                        updated_at: now
                    }
                }))
            );
    }

    async getCleanupStats(): Promise<{ orphanedTasks: number; expiredTasks: number }> {
        const orphanedBefore = new Date(Date.now() - TWO_DAYS_MS);

        const [orphanedTasks, expiredTasks] = await Promise.all([
            this.delegate.count({
                where: {
                    status: 'processing',
                    processing_started_at: {lt: orphanedBefore}
                }
            }),
            this.delegate.count({
                where: {expires_at: {lt: new Date()}}
            })
        ]);

        return {orphanedTasks, expiredTasks};
    }

    async cleanupTasks(orphanedBefore: Date, expiredBefore: Date): Promise<void> {
        await Promise.all([
            this.delegate.deleteMany({
                where: {
                    status: 'processing',
                    processing_started_at: {lt: orphanedBefore}
                }
            }),
            this.delegate.deleteMany({
                where: {expires_at: {lt: expiredBefore}}
            })
        ]);
    }

    generateId(): TId {
        //needs to be overriden when prisma client is of mongodb
        return crypto.randomUUID() as TId;
    }

    async initialize(): Promise<void> {
    }

    async close(): Promise<void> {
    }
}