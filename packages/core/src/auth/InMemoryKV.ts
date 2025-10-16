export class InMemoryKV {
    private store = new Map<string, any>();
    private timers = new Map<string, NodeJS.Timeout>();

    async get<T = any>(key: string): Promise<T | null> {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    async set<T = any>(key: string, value: T, opts?: { ttlMs?: number }): Promise<void> {
        // clear any existing TTL
        const existing = this.timers.get(key);
        if (existing) clearTimeout(existing);

        this.store.set(key, value);

        // handle TTL expiry
        if (opts?.ttlMs) {
            const timer = setTimeout(() => {
                this.store.delete(key);
                this.timers.delete(key);
            }, opts.ttlMs);
            this.timers.set(key, timer);
        }
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
        const existing = this.timers.get(key);
        if (existing) clearTimeout(existing);
        this.timers.delete(key);
    }

    async keys(): Promise<string[]> {
        return Array.from(this.store.keys());
    }

    async clear(): Promise<void> {
        this.store.clear();
        for (const t of this.timers.values()) clearTimeout(t);
        this.timers.clear();
    }

    async size(): Promise<number> {
        return this.store.size;
    }
}
