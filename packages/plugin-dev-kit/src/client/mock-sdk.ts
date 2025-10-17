import type {
    APIClient,
    APIResponse,
    Blog,
    BrandedId,
    ClientSDK,
    Media,
    PaginatedResponse,
    PaginationParams,
    PluginSettings,
    Storage,
    User
} from '@supergrowthai/next-blog-types';

// Import createId for creating branded IDs
const createBrandedId = {
    blog: (id: string) => id as any,
    user: (id: string) => id as any,
    category: (id: string) => id as any,
    tag: (id: string) => id as any,
    media: (id: string) => id as any,
    comment: (id: string) => id as any,
    revision: (id: string) => id as any,
    plugin: (id: string) => id as any,
    pluginHookMapping: (id: string) => id as any,
    settingsEntry: (id: string) => id as any,
};

class MockAPIClient implements APIClient {
    private mockData: Record<string, any> = {
        '/api/users': [
            {_id: '1', name: 'John Doe', email: 'john@example.com', username: 'john'},
            {_id: '2', name: 'Jane Smith', email: 'jane@example.com', username: 'jane'}
        ],
        '/api/blogs': [
            {
                _id: '1',
                title: 'First Post',
                content: 'Content here',
                status: 'published',
                slug: 'first-post',
                category: 'general',
                tags: [],
                userId: '1'
            },
            {
                _id: '2',
                title: 'Draft Post',
                content: 'Draft content',
                status: 'draft',
                slug: 'draft-post',
                category: 'general',
                tags: [],
                userId: '2'
            }
        ]
    };

    // Blog APIs
    async getBlogs(params?: PaginationParams) {
        console.log('[Mock Client API] getBlogs');
        const blogs: Blog[] = this.mockData['/api/blogs'] || [];
        return this.mockResponse(this.mockPaginatedResponse(blogs, params));
    }

    async getBlog(id: string) {
        console.log('[Mock Client API] getBlog', id);
        const blogs = this.mockData['/api/blogs'] || [];
        return this.mockResponse(blogs.find((b: any) => b._id === id));
    }

    async createBlog(data: any) {
        console.log('[Mock Client API] createBlog', data);
        const newBlog = {_id: Date.now().toString(), ...data, createdAt: Date.now(), updatedAt: Date.now()};
        this.mockData['/api/blogs'] = [...(this.mockData['/api/blogs'] || []), newBlog];
        return this.mockResponse(newBlog);
    }

    async updateBlog(id: string, data: any) {
        console.log('[Mock Client API] updateBlog', id, data);
        return this.mockResponse({_id: id, ...data});
    }

    async updateBlogMetadata(id: string, metadata: Record<string, any>) {
        console.log('[Mock Client API] updateBlogMetadata', id, metadata);
        const blogs = this.mockData['/api/blogs'] || [];
        const blog = blogs.find((b: any) => b._id === id);
        const updatedBlog = blog ? {...blog, metadata, updatedAt: Date.now()} : {
            _id: id,
            title: 'Blog',
            slug: 'blog',
            content: 'Content',
            category: 'general',
            tags: [],
            userId: '1',
            metadata,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return this.mockResponse(updatedBlog);
    }

    async deleteBlog(id: string) {
        console.log('[Mock Client API] deleteBlog', id);
        return this.mockResponse(null);
    }

    // User APIs
    async getUsers(params?: PaginationParams) {
        console.log('[Mock Client API] getUsers');
        const users: User[] = this.mockData['/api/users'] || [];
        return this.mockResponse(this.mockPaginatedResponse(users, params));
    }

    async getUser(id: string) {
        console.log('[Mock Client API] getUser', id);
        const users = this.mockData['/api/users'] || [];
        return this.mockResponse(users.find((u: any) => u._id === id));
    }

    async getCurrentUser() {
        console.log('[Mock Client API] getCurrentUser');
        return this.mockResponse(this.mockData['/api/users']?.[0]);
    }

    async createUser(data: any) {
        console.log('[Mock Client API] createUser', data);
        return this.mockResponse({_id: Date.now().toString(), ...data});
    }

    async updateUser(id: string, data: any) {
        console.log('[Mock Client API] updateUser', id, data);
        return this.mockResponse({_id: id, ...data});
    }

    async deleteUser(id: string) {
        console.log('[Mock Client API] deleteUser', id);
        return this.mockResponse(null);
    }

    // Category APIs
    async getCategories(params?: PaginationParams) {
        console.log('[Mock Client API] getCategories');
        const categories = [
            {
                _id: createBrandedId.category('1'),
                name: 'General',
                slug: 'general',
                description: 'General category',
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {
                _id: createBrandedId.category('2'),
                name: 'Tech',
                slug: 'tech',
                description: 'Technology',
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        ];
        return this.mockResponse(this.mockPaginatedResponse(categories, params));
    }

    async getCategory(id: string) {
        console.log('[Mock Client API] getCategory', id);
        return this.mockResponse({
            _id: createBrandedId.category(id),
            name: 'Category',
            slug: 'category',
            description: 'A category',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async createCategory(data: any) {
        console.log('[Mock Client API] createCategory', data);
        return this.mockResponse({_id: Date.now().toString(), ...data});
    }

    async updateCategory(id: string, data: any) {
        console.log('[Mock Client API] updateCategory', id, data);
        return this.mockResponse({_id: id, ...data});
    }

    async deleteCategory(id: string) {
        console.log('[Mock Client API] deleteCategory', id);
        return this.mockResponse(null);
    }

    // Tag APIs
    async getTags(params?: PaginationParams) {
        console.log('[Mock Client API] getTags');
        const tags = [
            {
                _id: createBrandedId.tag('1'),
                name: 'JavaScript',
                slug: 'javascript',
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {_id: createBrandedId.tag('2'), name: 'React', slug: 'react', createdAt: Date.now(), updatedAt: Date.now()}
        ];
        return this.mockResponse(this.mockPaginatedResponse(tags, params));
    }

    async getTag(id: string) {
        console.log('[Mock Client API] getTag', id);
        return this.mockResponse({
            _id: createBrandedId.tag(id),
            name: 'Tag',
            slug: 'tag',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async createTag(data: any) {
        console.log('[Mock Client API] createTag', data);
        return this.mockResponse({_id: Date.now().toString(), ...data});
    }

    async updateTag(id: string, data: any) {
        console.log('[Mock Client API] updateTag', id, data);
        return this.mockResponse({_id: id, ...data});
    }

    async deleteTag(id: string) {
        console.log('[Mock Client API] deleteTag', id);
        return this.mockResponse(null);
    }

    // Settings APIs
    async getSettings(params?: PaginationParams) {
        console.log('[Mock Client API] getSettings');
        const settings: any[] = [];
        return this.mockResponse(this.mockPaginatedResponse(settings, params));
    }

    async getSetting(id: string) {
        console.log('[Mock Client API] getSetting', id);
        return this.mockResponse({
            _id: createBrandedId.settingsEntry(id),
            key: 'setting',
            value: 'value',
            ownerId: createBrandedId.user('system'),
            ownerType: 'user' as const,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async createSetting(data: any) {
        console.log('[Mock Client API] createSetting', data);
        return this.mockResponse({_id: Date.now().toString(), ...data});
    }

    async updateSetting(id: string, data: any) {
        console.log('[Mock Client API] updateSetting', id, data);
        return this.mockResponse({_id: id, ...data});
    }

    async deleteSetting(id: string) {
        console.log('[Mock Client API] deleteSetting', id);
        return this.mockResponse(null);
    }

    // Plugin APIs
    async getPlugins(params?: PaginationParams) {
        console.log('[Mock Client API] getPlugins');
        const plugins: any[] = [];
        return this.mockResponse(this.mockPaginatedResponse(plugins, params));
    }

    async getPlugin(id: BrandedId<"Plugin">) {
        console.log('[Mock Client API] getPlugin', id);
        return this.mockResponse({
            _id: id,
            id: 'mock-plugin-id',
            name: 'Plugin',
            version: '1.0.0',
            description: 'A plugin',
            author: 'Author',
            url: 'http://example.com',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async createPlugin(data: any) {
        console.log('[Mock Client API] createPlugin', data);
        return this.mockResponse({_id: Date.now().toString(), ...data});
    }

    async updatePlugin(id: string, data: any) {
        console.log('[Mock Client API] updatePlugin', id, data);
        return this.mockResponse({_id: id, ...data});
    }

    async deletePlugin(id: string) {
        console.log('[Mock Client API] deletePlugin', id);
        return this.mockResponse(null);
    }

    async reinstallPlugin(id: string) {
        console.log('[Mock Client API] reinstallPlugin', id);
        return this.mockResponse({clearCache: true});
    }

    async getPluginHookMappings(params?: any) {
        console.log('[Mock Client API] getPluginHookMappings', params);
        return this.mockResponse([]);
    }

    async callPluginHook<T, R>(hookName: string, payload: T): Promise<R> {
        console.log('[Mock Client API] callPluginHook', hookName, payload);
        return {success: true, hookName, received: payload} as any;
    }

    async callPluginRPC<T, R>(hookName: string, payload: T): Promise<R> {
        console.log('[Mock Client API] callPluginHook', hookName, payload);
        return {success: true, hookName, received: payload} as any;
    }

    // Auth APIs
    async login(username: string, _password: string) {
        console.log('[Mock Client API] login', username);
        return this.mockResponse({
            _id: createBrandedId.user('1'),
            username,
            email: `${username}@example.com`,
            name: username,
            slug: username,
            bio: 'Mock user',
            permissions: [],
            password: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async logout() {
        console.log('[Mock Client API] logout');
        return this.mockResponse(null);
    }

    async checkPermission(permission: any) {
        console.log('[Mock Client API] checkPermission', permission);
        return this.mockResponse(true);
    }

    async getAllPermissions() {
        console.log('[Mock Client API] getAllPermissions');
        // Return properly typed Permission values
        const permissions: Array<import('@supergrowthai/next-blog-types').Permission> = ['blogs:all', 'users:read', 'categories:list', 'tags:list'];
        return this.mockResponse(permissions);
    }

    // Config API
    async getConfig() {
        console.log('[Mock Client API] getConfig');
        return this.mockResponse({
            branding: {name: 'Mock Blog'},
            features: {comments: true, search: true}
        });
    }

    // Media APIs
    async getMedia(params?: PaginationParams & {
        mimeType?: string;
        userId?: string;
    }) {
        console.log('[Mock Client API] getMedia', params);
        const media: any[] = [];
        return this.mockResponse(this.mockPaginatedResponse(media, params));
    }

    async getMediaById(id: string) {
        console.log('[Mock Client API] getMediaById', id);
        return this.mockResponse({
            _id: createBrandedId.media(id),
            filename: 'mock-image.jpg',
            url: 'http://example.com/image.jpg',
            mimeType: 'image/jpeg',
            userId: createBrandedId.user('1'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async createMedia(data: any) {
        console.log('[Mock Client API] createMedia', data);
        return this.mockResponse({
            _id: createBrandedId.media(Date.now().toString()),
            ...data,
            userId: createBrandedId.user('1'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    }

    async updateMedia(id: string, data: any) {
        console.log('[Mock Client API] updateMedia', id, data);
        return this.mockResponse({
            _id: createBrandedId.media(id),
            ...data,
            updatedAt: Date.now()
        });
    }

    async deleteMedia(id: string) {
        console.log('[Mock Client API] deleteMedia', id);
        return this.mockResponse(null);
    }

    async uploadMediaFile(mediaId: string, file: File) {
        console.log('[Mock Client API] uploadMediaFile', mediaId, file.name);
        const mockMedia: Media = {
            _id: createBrandedId.media(mediaId),
            filename: file.name,
            url: URL.createObjectURL(file),
            mimeType: file.type,
            metadata: {
                size: file.size
            },
            userId: createBrandedId.user('user-1'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return this.mockResponse(mockMedia);
    }

    // Token management
    setToken(token: string) {
        console.log('[Mock Client API] Token set:', token);
    }

    clearToken() {
        console.log('[Mock Client API] Token cleared');
    }

    private async mockResponse<T = any>(data: T): Promise<APIResponse<T>> {
        return {
            code: 0,
            message: 'Success',
            payload: data
        };
    }

    private mockPaginatedResponse<T>(data: T[], params?: PaginationParams): PaginatedResponse<T> {
        const page = params?.page || 1;
        const limit = params?.limit || 10;

        return {
            data,
            page,
            limit
        };
    }
}

class MockStorage implements Storage {
    private prefix = 'plugin_dev_';

    get(key: string): any {
        const value = localStorage.getItem(this.prefix + key);
        try {
            return value ? JSON.parse(value) : null;
        } catch {
            return value;
        }
    }

    set(key: string, value: any): void {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
    }

    remove(key: string): void {
        localStorage.removeItem(this.prefix + key);
    }

    clear(): void {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => localStorage.removeItem(key));
    }
}

// Mock client-side settings helper using localStorage
class MockClientSettings implements PluginSettings {
    private readonly prefix: string;

    constructor(pluginId: string) {
        this.prefix = `mock_plugin_${pluginId}_`;
    }

    get<T = any>(key: string): T | null {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value ? JSON.parse(value) : null;
        } catch {
            return null;
        }
    }

    set<T = any>(key: string, value: T): void {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set mock setting ${key}:`, error);
        }
    }

    getGlobal<T = any>(key: string): T | null {
        try {
            const value = localStorage.getItem(`mock_global_${key}`);
            return value ? JSON.parse(value) : null;
        } catch {
            return null;
        }
    }

    setGlobal<T = any>(key: string, value: T): void {
        try {
            localStorage.setItem(`mock_global_${key}`, JSON.stringify(value));
        } catch (error) {
            console.error(`Failed to set mock global setting ${key}:`, error);
        }
    }

    getFromPlugin<T = any>(targetPluginId: string, key: string): T | null {
        try {
            const value = localStorage.getItem(`mock_plugin_${targetPluginId}_${key}`);
            return value ? JSON.parse(value) : null;
        } catch {
            return null;
        }
    }
}

export function createMockClientSDK(options: {
    user?: User | null;
    settings?: Record<string, any>;
} = {}): ClientSDK {
    const mockUser: User | null = options.user !== undefined ? options.user : {
        _id: createBrandedId.user('dev-user-123'),
        username: 'developer',
        email: 'dev@example.com',
        password: 'hashed',
        name: 'Developer',
        slug: 'developer',
        bio: 'Development user',
        permissions: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    return {
        // @ts-ignore
        log: null,
        apis: new MockAPIClient(),
        user: mockUser,
        executionContext: mockUser,
        pluginId: 'mock-plugin',
        settings: new MockClientSettings('mock-plugin'),

        notify: (message: string, status?: 'success' | 'error' | 'info' | 'warning') => {
            const style = {
                success: 'background: #10b981; color: white;',
                error: 'background: #ef4444; color: white;',
                info: 'background: #3b82f6; color: white;',
                warning: 'background: #f59e0b; color: white;'
            }[status || 'info'] || 'background: #6b7280; color: white;';

            console.log(`%c[${status?.toUpperCase() || 'INFO'}] ${message}`, style + ' padding: 4px 8px; border-radius: 4px;');
        },

        refresh: () => {
            console.log('[Mock Client SDK] Refresh requested');
        },

        startIntent: async <T, R>(intentType: string, payload: T): Promise<R> => {
            console.log('[Mock Client SDK] Intent started:', intentType, payload);
            // Mock implementation - returns null for cancelled intents
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log('[Mock Client SDK] Intent resolved:', intentType);
                    resolve(null as R);
                }, 100);
            });
        },

        callHook: async (id, payload) => {
            console.log('[Mock Client SDK] Hook called:', id, payload);
            return {success: true, hookId: id, received: payload} as any;
        },

        callRPC: async (id, payload) => {
            console.log('[Mock Client SDK] RPC called:', id, payload);
            return {success: true, rpcId: id, received: payload} as any;
        },

        storage: new MockStorage(),

        navigate: (path: string) => {
            console.log('[Mock Client SDK] Navigate to:', path);
            window.history.pushState({}, '', path);
        },

        system: {
            version: '2.0.0-mock',
            buildTime: new Date().toISOString(),
            buildMode: 'development'
        },
    };
}