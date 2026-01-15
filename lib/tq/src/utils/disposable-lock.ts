import {LockManager} from "@supergrowthai/utils";

/**
 * A batch of locks that implements AsyncDisposable for use with `await using`.
 * Automatically releases all acquired locks when the scope exits, even on error.
 *
 * @example
 * ```typescript
 * await using locks = new DisposableLockBatch(lockManager);
 * await locks.acquire('task-1');
 * await locks.acquire('task-2');
 * // ... do work ...
 * // locks automatically released here, even if an error is thrown
 * ```
 *
 * @since Node.js 22+ (Explicit Resource Management)
 */
export class DisposableLockBatch implements AsyncDisposable {
    private readonly lockIds: string[] = [];
    private disposed = false;

    constructor(
        private readonly lockManager: LockManager,
        private readonly onError?: (lockId: string, error: unknown) => void
    ) {
    }

    /**
     * Get the list of currently held lock IDs
     */
    get heldLocks(): readonly string[] {
        return this.lockIds;
    }

    /**
     * Number of locks currently held
     */
    get size(): number {
        return this.lockIds.length;
    }

    /**
     * Acquire a lock and track it for automatic release
     */
    async acquire(lockId: string, timeout?: number): Promise<boolean> {
        if (this.disposed) {
            throw new Error('Cannot acquire lock on disposed DisposableLockBatch');
        }

        const acquired = await this.lockManager.acquire(lockId, timeout);
        if (acquired) {
            this.lockIds.push(lockId);
        }
        return acquired;
    }

    /**
     * AsyncDisposable implementation - releases all locks
     */
    async [Symbol.asyncDispose](): Promise<void> {
        if (this.disposed) return;
        this.disposed = true;

        await Promise.all(
            this.lockIds.map(lockId =>
                this.lockManager.release(lockId).catch(err => {
                    if (this.onError) {
                        this.onError(lockId, err);
                    }
                })
            )
        );
    }
}
