import Logger, {LogLevel} from "./Logger";
import {BaseCacheProvider} from "memoose-js";

class LockManager {
    private readonly prefix: string;
    private defaultTimeout: number;
    private acquireLocks: Map<string, Promise<any>> = new Map();
    private readonly logger = new Logger('MetricsCollector', LogLevel.INFO)

    constructor(private cacheProvider: BaseCacheProvider<string>, options?: {
        prefix?: string;
        defaultTimeout?: number; // in seconds
        debugLogs?: boolean
    }) {
        this.cacheProvider = cacheProvider;
        this.prefix = options?.prefix || 'lock:';
        this.defaultTimeout = options?.defaultTimeout || 30 * 60; // 30 minutes default
        if (options?.debugLogs)
            this.logger.setLogLevel(LogLevel.INFO)
    }

    /**
     * Check if a resource is locked
     */
    async isLocked(resourceId: string): Promise<boolean> {
        this.logger.debug("isLocked" + resourceId);
        const exists = await this.cacheProvider.get(this.getKey(resourceId)); //fixme provider can declare a a function exists(): Promise<boolean>
        return !!exists;
    }

    /**
     * Filter out locked resources from an array
     */
    async filterLocked<T>(resources: T[], getResourceId: (resource: T) => string): Promise<T[]> {
        if (!resources.length) return [];

        const lockChecks = resources.map((resource) => this.isLocked(getResourceId(resource)));

        const lockResults = await Promise.all(lockChecks);
        return resources.filter((_, index) => !lockResults[index]);
    }

    /**
     * Acquire a lock
     * @returns true if lock was acquired, false if already locked
     */

    async acquire(resourceId: string, timeout: number = this.defaultTimeout): Promise<boolean> {
        this.logger.debug("Acquire" + resourceId);
        // Wait for any ongoing acquire operation
        const existingLock = this.acquireLocks.get(resourceId);
        if (existingLock) {
            await existingLock;
            return false; // If there's an existing operation, return false
        }

        const lockPromise = this.acquireInternal(resourceId, timeout);
        this.acquireLocks.set(resourceId, lockPromise);

        try {
            return await lockPromise;
        } finally {
            // Cleanup after completion
            this.acquireLocks.delete(resourceId);
        }
    }

    /**
     * Release a lock
     */
    async release(resourceId: string): Promise<void> {
        this.logger.debug("Release" + resourceId);
        const key = this.getKey(resourceId);
        await this.cacheProvider.del(key);
    }

    private async acquireInternal(resourceId: string, timeout: number): Promise<boolean> {
        if (await this.isLocked(resourceId)) return false;
        const key = this.getKey(resourceId);
        const result = await this.cacheProvider.set(key, '1', timeout);
        return result === 'OK' || result === '1' || result === 1;
    }

    private getKey(resourceId: string): string {
        return `${this.prefix}${resourceId}`;
    }
}

export default LockManager