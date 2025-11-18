import {mock} from 'bun:test';
import type {
    Comment,
    DatabaseAdapter,
    Logger,
    Plugin,
    PluginHookMapping,
    PluginSettings,
    Revision,
    ServerSDK,
    SettingsEntry,
    User
} from '@supergrowthai/next-blog-types';
import {mockDataGenerators} from '../shared/mock-data.js';

class MockDatabase implements DatabaseAdapter {
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
        getHydratedBlog: mock(async () => null),
        getHydratedBlogs: mock(async () => []),
        getRecentBlogs: mock(async () => []),
        getRelatedBlogs: mock(async () => []),
        getHydratedAuthor: mock(async () => null),
        getAuthorBlogs: mock(async () => []),
        getHydratedCategories: mock(async () => []),
        getCategoryWithBlogs: mock(async () => ({category: null, blogs: []})),
        getHydratedTags: mock(async () => []),
        getTagWithBlogs: mock(async () => ({tag: null, blogs: []})),
        getBlogsByTag: mock(async () => []),
        getBlogsByCategory: mock(async () => []),
    };

    private data = (({
        users: mockDataGenerators.users(),
        categories: mockDataGenerators.categories(),
        tags: mockDataGenerators.tags(),
        media: mockDataGenerators.media(),
        blogs: mockDataGenerators.blogs(),
        comments: [] as Comment[],
        settings: [] as SettingsEntry[],
        plugins: [] as Plugin[],
        pluginHookMappings: [] as PluginHookMapping[],
        revisions: [] as Revision[],
    }));

    private createCollectionMethods(collection: keyof typeof this.data): any {
        return {
            find: mock(async (filter: any, _options?: any) => {
                console.log(`[Mock DB] Find in ${collection}:`, filter);
                const items = this.data[collection] || [];
                if (!filter || Object.keys(filter).length === 0) {
                    return items;
                }
                return items.filter((item: any) =>
                    Object.entries(filter).every(([key, value]: any[]) => {
                        if (key === 'createdAt' && typeof value === 'object' && value.$gte) {
                            return item[key] >= value.$gte;
                        }
                        return item[key] === value;
                    })
                );
            }),
            findOne: mock(async (filter: any) => {
                const items = this.data[collection] || [];
                if (!filter || Object.keys(filter).length === 0) {
                    return items[0] || null;
                }
                const filtered = items.filter((item: any) =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                return filtered[0] || null;
            }),
            findById: mock(async (id: string) => {
                const items = this.data[collection] || [];
                return items.find((item: any) => item._id === id) || null;
            }),
            create: mock(async (data: any) => {
                console.log(`[Mock DB] Create in ${collection}:`, data);
                const newItem = {_id: Date.now().toString(), createdAt: Date.now(), updatedAt: Date.now(), ...data};
                if (!this.data[collection]) {
                    this.data[collection] = [];
                }
                this.data[collection].push(newItem);
                return newItem;
            }),
            updateOne: mock(async (filter: any, update: any) => {
                console.log(`[Mock DB] Update in ${collection}:`, filter, update);
                const items = this.data[collection] || [];
                const itemIndex = items.findIndex((item: any) =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                if (itemIndex >= 0) {
                    Object.assign(items[itemIndex], update, {updatedAt: Date.now()});
                    return items[itemIndex];
                }
                return null;
            }),
            deleteOne: mock(async (filter: any) => {
                console.log(`[Mock DB] Delete from ${collection}:`, filter);
                const items = this.data[collection] || [];
                const index = items.findIndex((item: any) =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                if (index >= 0) {
                    const deleted = items[index];
                    items.splice(index, 1);
                    return deleted;
                }
                return null;
            }),
            delete: mock(async (filter: any) => {
                console.log(`[Mock DB] Delete many from ${collection}:`, filter);
                const items = this.data[collection] || [];
                const toDelete = items.filter((item: any) =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                this.data[collection] = items.filter((item: any) =>
                    !Object.entries(filter).every(([key, value]) => item[key] === value)
                ) as any;
                return toDelete.length;
            }),
            count: mock(async (filter: any) => {
                console.log(`[Mock DB] Count in ${collection}:`, filter);
                const items = this.data[collection] || [];
                if (!filter || Object.keys(filter).length === 0) {
                    return items.length;
                }
                const filtered = items.filter((item: any) =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                return filtered.length;
            })
        };
    }
}

class MockServerSettings implements PluginSettings {
    get = mock(async <T = any>(_key: string): Promise<T | null> => {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    });
    set = mock(async <T = any>(_key: string, _value: T): Promise<void> => {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    });
    getGlobal = mock(async <T = any>(_key: string): Promise<T | null> => {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    });
    setGlobal = mock(async <T = any>(_key: string, _value: T): Promise<void> => {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    });
    getFromPlugin = mock(async <T = any>(_targetPluginId: string, _key: string): Promise<T | null> => {
        throw new Error(`Server-side settings not implemented yet. Plugin: ${this.pluginId}`);
    });

    constructor(private readonly pluginId: string) {
    }
}

class MockLogger implements Logger {
    debug = mock((...args: any[]): void => {
        console.log('[DEBUG]', ...args);
    });

    info = mock((...args: any[]): void => {
        console.log('[INFO]', ...args);
    });

    warn = mock((...args: any[]): void => {
        console.warn('[WARN]', ...args);
    });

    error = mock((...args: any[]): void => {
        console.error('[ERROR]', ...args);
    });
}

export function createMockServerSDK(_options: {
    user?: User | null;
} = {}): ServerSDK {
    return {
        log: new MockLogger(),
        db: new MockDatabase(),
        system: {
            version: '2.0.0-mock',
            buildTime: new Date().toISOString(),
            buildMode: 'development'
        },
        pluginId: 'mock-plugin',
        settings: new MockServerSettings('mock-plugin'),
        callHook: mock(async (id, payload) => {
            console.log('[Mock Server SDK] Hook called:', id, payload);
            return {success: true, hookId: id, received: payload} as any;
        }),
        callRPC: mock(async (id, payload) => {
            console.log('[Mock Server SDK] RPC called:', id, payload);
            return {success: true, rpcId: id, received: payload} as any;
        })
    };
}