import type {Auth} from 'better-auth';
import {AuthResult, IAuthHandler, OneApiRequest, OneApiResponse} from '../types.js';

/**
 * Session structure returned by Better Auth.
 * Generic types allow customization for different Better Auth configurations.
 */
export interface BetterAuthSession<TUser = unknown, TSession = unknown> {
    user: TUser | null;
    session: TSession | null;
}

/**
 * Cache interface for session caching.
 *
 * Compatible with memoose-js CacheProvider signature - any cache implementing
 * `get(key)` and `set(key, value)` will work, including:
 * - MemoryCacheProvider from memoose-js
 * - RedisCacheProvider from memoose-js
 * - Custom implementations
 *
 * Note: For per-request deduplication (default), use WeakMapSessionCache.
 * For cross-request caching, use a string-keyed cache with a key extractor.
 */
export interface SessionCache<T, K = any> {
    /**
     * Get cached value.
     * @returns Value, null, undefined, or Promise resolving to value/null
     */
    get(key: K): T | null | undefined | Promise<T | null | undefined>;

    /**
     * Set cached value.
     * @returns void or Promise (return value ignored)
     */
    set(key: K, value: T, ttl?: number): void | Promise<any>;
}

/**
 * Default in-memory cache using WeakMap.
 * Entries are automatically garbage collected when request is done.
 * Uses Request object as key for per-request deduplication.
 */
export class WeakMapSessionCache<T> implements SessionCache<T, OneApiRequest> {
    private cache = new WeakMap<OneApiRequest, T>();

    get(key: OneApiRequest): T | undefined {
        return this.cache.get(key);
    }

    set(key: OneApiRequest, value: T): void {
        this.cache.set(key, value);
    }
}

/**
 * Configuration options for BetterAuthHandler.
 */
export interface BetterAuthHandlerOptions<USER> {
    /**
     * Custom session cache implementation.
     * - undefined (default): Uses WeakMap-based in-memory cache
     * - null: Disables caching (each method call hits Better Auth API)
     * - SessionCache instance: Uses provided cache implementation
     */
    cache?: SessionCache<Promise<BetterAuthSession<USER> | null>> | null;
}

/**
 * Better Auth based authentication handler.
 *
 * Unlike iron-session handlers, login/logout are handled by Better Auth's
 * own routes (/api/auth/sign-in, /api/auth/sign-out). This handler only
 * provides session retrieval for the OneAPI router.
 *
 * Features:
 * - Configurable session caching (in-memory, Redis, or disabled)
 * - Graceful error handling with sanitized error messages
 * - Type-safe session and user access
 *
 * @example
 * ```typescript
 * import { betterAuth } from 'better-auth';
 * import { BetterAuthHandler } from '@supergrowthai/oneapi';
 *
 * const auth = betterAuth({ ... });
 *
 * // Mount Better Auth routes
 * app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
 *
 * // Use with OneAPI router (default in-memory cache)
 * const router = new GenericRouter(paths, {
 *   authHandler: new BetterAuthHandler(auth)
 * });
 *
 * // Or with custom cache
 * const router = new GenericRouter(paths, {
 *   authHandler: new BetterAuthHandler(auth, { cache: myRedisCache })
 * });
 *
 * // Or with caching disabled
 * const router = new GenericRouter(paths, {
 *   authHandler: new BetterAuthHandler(auth, { cache: null })
 * });
 * ```
 */
export class BetterAuthHandler<USER = unknown, SESSION = BetterAuthSession<USER>>
    implements IAuthHandler<never, USER, SESSION> {

    private readonly sessionCache: SessionCache<Promise<BetterAuthSession<USER> | null>> | null;

    constructor(
        private auth: Auth,
        options?: BetterAuthHandlerOptions<USER>
    ) {
        // Runtime validation - fail fast if Better Auth instance is invalid
        if (!auth?.api?.getSession) {
            throw new Error(
                'BetterAuthHandler requires a valid Better Auth instance. ' +
                'Ensure better-auth is installed and properly configured.'
            );
        }

        // Set up cache: undefined = default WeakMap, null = no cache, or custom
        if (options?.cache === null) {
            this.sessionCache = null;
        } else if (options?.cache !== undefined) {
            this.sessionCache = options.cache;
        } else {
            this.sessionCache = new WeakMapSessionCache();
        }
    }

    async getUser(req: OneApiRequest, _res?: OneApiResponse | null): Promise<USER | null> {
        const session = await this.getCachedSession(req);
        return (session?.user as USER) ?? null;
    }

    async getSession(req: OneApiRequest, _res?: OneApiResponse | null): Promise<SESSION> {
        const session = await this.getCachedSession(req);
        return session as SESSION;
    }

    async isAuthenticated(req: OneApiRequest, _res?: OneApiResponse | null): Promise<boolean> {
        const session = await this.getCachedSession(req);
        return !!session?.user;
    }

    async login(_credentials: never, _req: OneApiRequest, _res?: OneApiResponse | null): Promise<AuthResult<USER>> {
        throw new Error(
            'BetterAuthHandler does not handle login directly. ' +
            'Use Better Auth routes instead (e.g., POST /api/auth/sign-in/email).'
        );
    }

    async logout(_req: OneApiRequest, _res?: OneApiResponse | null): Promise<void> {
        throw new Error(
            'BetterAuthHandler does not handle logout directly. ' +
            'Use Better Auth routes instead (e.g., POST /api/auth/sign-out).'
        );
    }

    async updateUser(_user: USER, _req: OneApiRequest, _res?: OneApiResponse | null): Promise<void> {
        throw new Error(
            'BetterAuthHandler does not handle user updates directly. ' +
            'Use Better Auth API methods instead.'
        );
    }

    /**
     * Internal method to get session with optional caching.
     * Ensures only one Better Auth API call per request even if
     * getUser, getSession, and isAuthenticated are all called.
     *
     * Supports both sync (WeakMap) and async (memoose-js) cache providers.
     */
    private async getCachedSession(req: OneApiRequest): Promise<BetterAuthSession<USER> | null> {
        // If caching is disabled, always fetch fresh
        if (!this.sessionCache) {
            return this.fetchSession(req);
        }

        // Check cache first - get the raw result (might be sync or Promise)
        // We store Promise<Session> in cache, so cache.get() returns Promise<Session> or undefined
        const cachedResult = this.sessionCache.get(req);

        // Cache hit - return the cached Promise (handles both sync and async cache.get())
        if (cachedResult != null) {
            // Await handles both: direct Promise values (from sync cache) and
            // Promise<Promise<Session>> (from async cache that returns Promise)
            const result = await cachedResult;
            // Normalize undefined to null for consistent return type
            return result ?? null;
        }

        // Cache miss - fetch fresh and cache the Promise immediately for deduplication
        const sessionPromise = this.fetchSession(req);
        this.sessionCache.set(req, sessionPromise);

        return sessionPromise;
    }

    /**
     * Fetch session from Better Auth API.
     */
    private async fetchSession(req: OneApiRequest): Promise<BetterAuthSession<USER> | null> {
        try {
            const result = await this.auth.api.getSession({headers: req.headers});
            return result as BetterAuthSession<USER> | null;
        } catch (error) {
            // Log the actual error for debugging but don't expose internals
            // In production, you might want to use a proper logger here
            console.error('[BetterAuthHandler] Session fetch failed:', error);
            return null;
        }
    }
}
