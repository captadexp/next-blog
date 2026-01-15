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

    private get delegate(): PrismaClient[K] {
        return this.config.prismaClient[this.config.messageModel];
    }

    async addTasksToScheduled(tasks: CronTask<TId>[]): Promise<CronTask<TId>[]> {
        if (!tasks.length) return [];

        try {
            await this.delegate.createMany({
                data: tasks.map(task => ({
                    ...task,
                    id: task.id || this.generateId(),
                    status: task.status || 'scheduled',
                    retries: task.retries || 0,
                    created_at: task.created_at || new Date(),
                    updated_at: new Date(),
                    processing_started_at: task.processing_started_at || new Date()
                })),
                skipDuplicates: true
            });
            return tasks;
        } catch (error: unknown) {
            logger.warn(`Some tasks skipped due to duplicates: ${error}`);
            return tasks;
        }
    }

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