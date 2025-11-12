function objectCacheForDev<T>(id: string, factory: () => T): T {
    if (process.env.NODE_ENV === 'development') {
        const globalCache = (global as any).__devCache || ((global as any).__devCache = {});
        if (!globalCache[id]) {
            globalCache[id] = factory();
        }
        return globalCache[id];
    }
    return factory();
}


export default objectCacheForDev