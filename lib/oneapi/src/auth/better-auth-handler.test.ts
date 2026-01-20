import {beforeEach, describe, expect, it, mock, spyOn} from 'bun:test';
import type {Auth} from 'better-auth';
import {BetterAuthHandler, BetterAuthSession, SessionCache} from './better-auth-handler.js';

const createMockAuth = (sessionData: any = null) => {
    const getSessionMock = mock(() => Promise.resolve(sessionData));
    return {
        auth: {
            api: {
                getSession: getSessionMock
            }
        } as unknown as Auth,
        getSessionMock
    };
};

const createMockRequest = () => ({
    headers: new Headers({'cookie': 'session=abc123'})
}) as any;

/**
 * Custom cache implementation for testing
 */
class MapBasedCache<T> implements SessionCache<T> {
    private cache = new Map<any, T>();

    get size(): number {
        return this.cache.size;
    }

    get(key: any): T | undefined {
        return this.cache.get(key);
    }

    set(key: any, value: T): void {
        this.cache.set(key, value);
    }

    clear(): void {
        this.cache.clear();
    }
}

describe('BetterAuthHandler', () => {
    beforeEach(() => {
        // Suppress console.error in tests
        spyOn(console, 'error').mockImplementation(() => {
        });
    });

    describe('constructor', () => {
        it('throws if auth instance is null', () => {
            expect(() => new BetterAuthHandler(null as any)).toThrow('requires a valid Better Auth instance');
        });

        it('throws if auth instance is undefined', () => {
            expect(() => new BetterAuthHandler(undefined as any)).toThrow('requires a valid Better Auth instance');
        });

        it('throws if auth.api is missing', () => {
            expect(() => new BetterAuthHandler({} as any)).toThrow('requires a valid Better Auth instance');
        });

        it('throws if auth.api.getSession is missing', () => {
            expect(() => new BetterAuthHandler({api: {}} as any)).toThrow('requires a valid Better Auth instance');
        });

        it('accepts valid auth instance', () => {
            const {auth} = createMockAuth();
            expect(() => new BetterAuthHandler(auth)).not.toThrow();
        });
    });

    describe('getUser', () => {
        it('returns user when authenticated', async () => {
            const mockUser = {id: '1', email: 'test@test.com', name: 'Test User'};
            const {auth} = createMockAuth({user: mockUser, session: {id: 'sess_1'}});
            const handler = new BetterAuthHandler(auth);

            const user = await handler.getUser(createMockRequest());

            expect(user).toEqual(mockUser);
        });

        it('returns null when session is null', async () => {
            const {auth} = createMockAuth(null);
            const handler = new BetterAuthHandler(auth);

            const user = await handler.getUser(createMockRequest());

            expect(user).toBeNull();
        });

        it('returns null when session has no user', async () => {
            const {auth} = createMockAuth({session: {id: 'sess_1'}});
            const handler = new BetterAuthHandler(auth);

            const user = await handler.getUser(createMockRequest());

            expect(user).toBeNull();
        });

        it('returns null on error (graceful degradation)', async () => {
            const auth = {
                api: {
                    getSession: mock(() => Promise.reject(new Error('Network error')))
                }
            } as unknown as Auth;
            const handler = new BetterAuthHandler(auth);

            const user = await handler.getUser(createMockRequest());

            expect(user).toBeNull();
        });
    });

    describe('getSession', () => {
        it('returns full session object when authenticated', async () => {
            const mockSession = {
                user: {id: '1', email: 'test@test.com'},
                session: {id: 'sess_1', expiresAt: new Date()}
            };
            const {auth} = createMockAuth(mockSession);
            const handler = new BetterAuthHandler(auth);

            const session = await handler.getSession(createMockRequest());

            expect(session).toEqual(mockSession);
        });

        it('returns null when not authenticated', async () => {
            const {auth} = createMockAuth(null);
            const handler = new BetterAuthHandler(auth);

            const session = await handler.getSession(createMockRequest());

            expect(session).toBeNull();
        });

        it('returns null on error (graceful degradation)', async () => {
            const auth = {
                api: {
                    getSession: mock(() => Promise.reject(new Error('Database error')))
                }
            } as unknown as Auth;
            const handler = new BetterAuthHandler(auth);

            const session = await handler.getSession(createMockRequest());

            expect(session).toBeNull();
        });
    });

    describe('isAuthenticated', () => {
        it('returns true when user exists', async () => {
            const {auth} = createMockAuth({user: {id: '1'}, session: {}});
            const handler = new BetterAuthHandler(auth);

            const result = await handler.isAuthenticated(createMockRequest());

            expect(result).toBe(true);
        });

        it('returns false when session is null', async () => {
            const {auth} = createMockAuth(null);
            const handler = new BetterAuthHandler(auth);

            const result = await handler.isAuthenticated(createMockRequest());

            expect(result).toBe(false);
        });

        it('returns false when user is null', async () => {
            const {auth} = createMockAuth({user: null, session: {}});
            const handler = new BetterAuthHandler(auth);

            const result = await handler.isAuthenticated(createMockRequest());

            expect(result).toBe(false);
        });

        it('returns false on error (graceful degradation)', async () => {
            const auth = {
                api: {
                    getSession: mock(() => Promise.reject(new Error('Network error')))
                }
            } as unknown as Auth;
            const handler = new BetterAuthHandler(auth);

            const result = await handler.isAuthenticated(createMockRequest());

            expect(result).toBe(false);
        });
    });

    describe('session caching', () => {
        it('caches session for same request object', async () => {
            const {auth, getSessionMock} = createMockAuth({user: {id: '1'}, session: {}});
            const handler = new BetterAuthHandler(auth);
            const request = createMockRequest();

            // Call multiple methods on same request
            await handler.getSession(request);
            await handler.getUser(request);
            await handler.isAuthenticated(request);

            // Should only call Better Auth API once
            expect(getSessionMock).toHaveBeenCalledTimes(1);
        });

        it('makes separate calls for different request objects', async () => {
            const {auth, getSessionMock} = createMockAuth({user: {id: '1'}, session: {}});
            const handler = new BetterAuthHandler(auth);

            // Different request objects
            await handler.getUser(createMockRequest());
            await handler.getUser(createMockRequest());

            // Should call Better Auth API twice (different requests)
            expect(getSessionMock).toHaveBeenCalledTimes(2);
        });

        it('handles concurrent calls to same request', async () => {
            const {auth, getSessionMock} = createMockAuth({user: {id: '1'}, session: {}});
            const handler = new BetterAuthHandler(auth);
            const request = createMockRequest();

            // Concurrent calls
            const [user, session, isAuth] = await Promise.all([
                handler.getUser(request),
                handler.getSession(request),
                handler.isAuthenticated(request)
            ]);

            expect(user).toEqual({id: '1'});
            expect(session).toEqual({user: {id: '1'}, session: {}});
            expect(isAuth).toBe(true);

            // Should only call Better Auth API once despite concurrent calls
            expect(getSessionMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('login', () => {
        it('throws with helpful error message', async () => {
            const {auth} = createMockAuth();
            const handler = new BetterAuthHandler(auth);

            await expect(handler.login(undefined as never, createMockRequest())).rejects.toThrow(
                'BetterAuthHandler does not handle login directly'
            );
            await expect(handler.login(undefined as never, createMockRequest())).rejects.toThrow(
                '/api/auth/sign-in'
            );
        });
    });

    describe('logout', () => {
        it('throws with helpful error message', async () => {
            const {auth} = createMockAuth();
            const handler = new BetterAuthHandler(auth);

            await expect(handler.logout(createMockRequest())).rejects.toThrow(
                'BetterAuthHandler does not handle logout directly'
            );
            await expect(handler.logout(createMockRequest())).rejects.toThrow(
                '/api/auth/sign-out'
            );
        });
    });

    describe('updateUser', () => {
        it('throws with helpful error message', async () => {
            const {auth} = createMockAuth();
            const handler = new BetterAuthHandler(auth);

            await expect(handler.updateUser({id: '1'}, createMockRequest())).rejects.toThrow(
                'BetterAuthHandler does not handle user updates directly'
            );
        });
    });

    describe('cache configuration', () => {
        it('uses default WeakMap cache when no options provided', async () => {
            const {auth, getSessionMock} = createMockAuth({user: {id: '1'}, session: {}});
            const handler = new BetterAuthHandler(auth);
            const request = createMockRequest();

            await handler.getUser(request);
            await handler.getSession(request);

            expect(getSessionMock).toHaveBeenCalledTimes(1);
        });

        it('uses custom cache when provided', async () => {
            const {auth, getSessionMock} = createMockAuth({user: {id: '1'}, session: {}});
            const customCache = new MapBasedCache<Promise<BetterAuthSession | null>>();
            const handler = new BetterAuthHandler(auth, {cache: customCache});
            const request = createMockRequest();

            await handler.getUser(request);
            await handler.getSession(request);

            expect(getSessionMock).toHaveBeenCalledTimes(1);
            expect(customCache.size).toBe(1);
        });

        it('disables caching when cache is null', async () => {
            const {auth, getSessionMock} = createMockAuth({user: {id: '1'}, session: {}});
            const handler = new BetterAuthHandler(auth, {cache: null});
            const request = createMockRequest();

            // Each call should hit the API
            await handler.getUser(request);
            await handler.getSession(request);
            await handler.isAuthenticated(request);

            expect(getSessionMock).toHaveBeenCalledTimes(3);
        });

        it('custom cache is compatible with standard Map-like interface', async () => {
            // This test verifies the SessionCache interface works with common cache patterns
            const {auth} = createMockAuth({user: {id: '1'}, session: {}});

            // Any object with get/set methods works
            const simpleCache: SessionCache<Promise<BetterAuthSession | null>> = {
                get: (key) => undefined,
                set: (key, value) => {
                }
            };

            expect(() => new BetterAuthHandler(auth, {cache: simpleCache})).not.toThrow();
        });
    });
});