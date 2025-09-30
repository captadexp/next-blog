import type {Logger, PluginSettings, ServerSDK, User} from '@supergrowthai/types';
import {createId} from "@supergrowthai/types/server";

// Mock database implementation - simplified version
// In real implementation, would use the full DatabaseAdapter interface from @supergrowthai/types
class MockDatabase {
    // Simplified mock methods - in real implementation would match DatabaseAdapter interface
    blogs = this.createCollectionMethods('blogs');
    users = this.createCollectionMethods('users');
    categories = this.createCollectionMethods('categories');
    tags = this.createCollectionMethods('tags');
    settings = this.createCollectionMethods('settings');
    plugins = this.createCollectionMethods('plugins');
    pluginHookMappings = this.createCollectionMethods('pluginHookMappings');
    comments = this.createCollectionMethods('comments');
    revisions = this.createCollectionMethods('revisions');
    media = this.createCollectionMethods('media');
    generated = {
        getDetailedBlogObject: async () => null,
        getHydratedBlog: async () => null
    };
    private data: Record<string, any[]> = {
        users: [
            {
                _id: '1',
                username: 'johndoe',
                email: 'john@example.com',
                name: 'John Doe',
                slug: 'john-doe',
                bio: 'Admin user',
                permissions: ['all:all']
            },
            {
                _id: '2',
                username: 'janesmith',
                email: 'jane@example.com',
                name: 'Jane Smith',
                slug: 'jane-smith',
                bio: 'Editor',
                permissions: ['blogs:all']
            }
        ],
        blogs: [
            {
                _id: '1',
                title: 'First Post',
                slug: 'first-post',
                content: 'Content here',
                category: 'general',
                tags: [],
                userId: '1',
                status: 'published'
            },
            {
                _id: '2',
                title: 'Draft Post',
                slug: 'draft-post',
                content: 'Draft content',
                category: 'general',
                tags: [],
                userId: '2',
                status: 'draft'
            }
        ]
    };

    private createCollectionMethods(collection: string) {
        return {
            find: async (filter: any, _options?: any) => {
                console.log(`[Mock DB] Find in ${collection}:`, filter);
                const items = this.data[collection] || [];
                if (!filter || Object.keys(filter).length === 0) {
                    return items;
                }
                return items.filter(item =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
            },
            findOne: async (filter: any) => {
                const results = await this.createCollectionMethods(collection).find(filter);
                return results[0] || null;
            },
            findById: async (id: string) => {
                const results = await this.createCollectionMethods(collection).find({_id: id});
                return results[0] || null;
            },
            create: async (data: any) => {
                console.log(`[Mock DB] Create in ${collection}:`, data);
                const newItem = {_id: Date.now().toString(), createdAt: Date.now(), updatedAt: Date.now(), ...data};
                if (!this.data[collection]) {
                    this.data[collection] = [];
                }
                this.data[collection].push(newItem);
                return newItem;
            },
            updateOne: async (filter: any, update: any) => {
                console.log(`[Mock DB] Update in ${collection}:`, filter, update);
                const item = await this.createCollectionMethods(collection).findOne(filter);
                if (item) {
                    Object.assign(item, update, {updatedAt: Date.now()});
                    return item;
                }
                return null;
            },
            deleteOne: async (filter: any) => {
                console.log(`[Mock DB] Delete from ${collection}:`, filter);
                const index = this.data[collection]?.findIndex(item =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                if (index !== undefined && index >= 0) {
                    const deleted = this.data[collection][index];
                    this.data[collection].splice(index, 1);
                    return deleted;
                }
                return null;
            },
            delete: async (filter: any) => {
                console.log(`[Mock DB] Delete many from ${collection}:`, filter);
                const items = this.data[collection] || [];
                const toDelete = items.filter(item =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                this.data[collection] = items.filter(item =>
                    !Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                return toDelete.length;
            }
        };
    }
}

// Mock server-side settings helper - throws not implemented
class MockServerSettings implements PluginSettings {
    constructor(private readonly pluginId: string) {
    }

    async get<T = any>(_key: string): Promise<T | null> {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    }

    async set<T = any>(_key: string, _value: T): Promise<void> {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    }

    async getGlobal<T = any>(_key: string): Promise<T | null> {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    }

    async getFromPlugin<T = any>(_targetPluginId: string, _key: string): Promise<T | null> {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    }
}

class MockLogger implements Logger {
    debug(...args: any[]): void {
        console.log('[DEBUG]', ...args);
    }

    info(...args: any[]): void {
        console.log('[INFO]', ...args);
    }

    warn(...args: any[]): void {
        console.warn('[WARN]', ...args);
    }

    error(...args: any[]): void {
        console.error('[ERROR]', ...args);
    }
}

export function createMockServerSDK(options: {
    user?: User | null;
    config?: Record<string, any>;
} = {}): ServerSDK {
    const mockUser: User | null = options.user !== undefined ? options.user : {
        _id: createId.user('server-user-123'),
        username: 'server',
        email: 'server@example.com',
        password: 'hashed',
        name: 'Server User',
        slug: 'server',
        bio: 'System user',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const mockConfig = options.config || {
        environment: 'development',
        debug: true,
        features: {
            caching: false,
            logging: true
        }
    };

    return {
        log: new MockLogger(),
        db: new MockDatabase(),
        executionContext: mockUser,
        config: mockConfig,
        pluginId: 'mock-plugin',
        settings: new MockServerSettings('mock-plugin'),

        callHook: async <T, R>(id: string, payload: T): Promise<R> => {
            console.log('[Mock Server SDK] Hook called:', id, payload);
            return {success: true, hookId: id, received: payload} as any;
        }
    };
}