import {mock} from 'bun:test';
import type {
    APIClient,
    APIResponse,
    Blog,
    Category,
    ClientPaginationParams,
    ClientSDK,
    Media,
    PaginatedResponse,
    Permission,
    Plugin,
    PluginSettings,
    ServerSDK,
    SettingsEntry,
    Storage,
    Tag,
    User
} from '@supergrowthai/next-blog-types';
import {createBrandedId, mockDataGenerators} from '../shared/mock-data.js';

class MockAPIClient implements APIClient {
    createBlog = mock(async (data: any) => {
        const newBlog = {_id: Date.now().toString(), ...data};
        return this.mockResponse(newBlog);
    });
    updateBlog = mock(async (id: string, data: any) => {
        return this.mockResponse({_id: id, ...data});
    });
    deleteBlog = mock(async (_id: string) => {
        return this.mockResponse(null);
    });
    createUser = mock(async (data: any) => {
        return this.mockResponse({_id: Date.now().toString(), ...data});
    });
    updateUser = mock(async (id: string, data: any) => {
        return this.mockResponse({_id: id, ...data});
    });
    deleteUser = mock(async (_id: string) => {
        return this.mockResponse(null);
    });
    createCategory = mock(async (data: any) => {
        return this.mockResponse({_id: Date.now().toString(), ...data});
    });
    updateCategory = mock(async (id: string, data: any) => {
        return this.mockResponse({_id: id, ...data});
    });
    deleteCategory = mock(async (_id: string) => {
        return this.mockResponse(null);
    });
    createTag = mock(async (data: any) => {
        return this.mockResponse({_id: Date.now().toString(), ...data});
    });
    updateTag = mock(async (id: string, data: any) => {
        return this.mockResponse({_id: id, ...data});
    });
    deleteTag = mock(async (_id: string) => {
        return this.mockResponse(null);
    });
    // Settings
    getSettings = mock(async (params?: ClientPaginationParams) => {
        return this.mockResponse(this.mockPaginatedResponse([], params));
    });
    getSetting = mock(async (id: string) => {
        const setting: SettingsEntry = {
            _id: createBrandedId.settingsEntry(id),
            key: 'setting',
            value: 'value',
            ownerId: createBrandedId.user('1'),
            ownerType: 'user',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return this.mockResponse(setting);
    });
    createSetting = mock(async (data: any) => {
        return this.mockResponse({_id: Date.now().toString(), ...data});
    });
    updateSetting = mock(async (id: string, data: any) => {
        return this.mockResponse({_id: id, ...data});
    });
    deleteSetting = mock(async (_id: string) => {
        return this.mockResponse(null);
    });
    // Plugins
    getPlugins = mock(async (params?: ClientPaginationParams) => {
        return this.mockResponse(this.mockPaginatedResponse([], params));
    });
    getPlugin = mock(async (id: string) => {
        const plugin: Plugin = {
            _id: createBrandedId.plugin(id),
            id: id,
            name: 'Plugin',
            description: 'Mock plugin description',
            version: '1.0.0',
            author: 'Mock Author',
            url: 'https://example.com',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return this.mockResponse(plugin);
    });
    createPlugin = mock(async (data: any) => {
        return this.mockResponse({_id: Date.now().toString(), ...data});
    });
    updatePlugin = mock(async (id: string, data: any) => {
        return this.mockResponse({_id: id, ...data});
    });
    deletePlugin = mock(async (_id: string) => {
        return this.mockResponse(null);
    });
    reinstallPlugin = mock(async (_id: string) => {
        return this.mockResponse({clearCache: true});
    });
    getPluginHookMappings = mock(async (_params?: any) => {
        return this.mockResponse([]);
    });
    callPluginHook = mock(<TPayload = any, TResponse = any>(hookName: string, payload: TPayload): Promise<TResponse> => {
        return Promise.resolve({success: true, hookName, received: payload} as any);
    }) as <TPayload = any, TResponse = any>(hookName: string, payload: TPayload) => Promise<TResponse>;
    callPluginRPC = mock(<TPayload = any, TResponse = any>(hookName: string, payload: TPayload): Promise<TResponse> => {
        return Promise.resolve({success: true, hookName, received: payload} as any);
    }) as <TPayload = any, TResponse = any>(hookName: string, payload: TPayload) => Promise<TResponse>;
    // Auth APIs
    login = mock(async (username: string, _password: string) => {
        const user: User = {
            _id: createBrandedId.user('1'),
            username,
            email: `${username}@example.com`,
            password: 'hashed',
            name: username,
            slug: username.toLowerCase().replace(/\s+/g, '-'),
            bio: 'Login user bio',
            permissions: [] as Permission[],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return this.mockResponse(user);
    });
    logout = mock(async () => {
        return this.mockResponse(null);
    });
    checkPermission = mock(async (_permission: any) => {
        return this.mockResponse(true);
    });
    getAllPermissions = mock(async () => {
        return this.mockResponse<Permission[]>(['blogs:all', 'users:read']);
    });
    getConfig = mock(async () => {
        return this.mockResponse({branding: {name: 'Mock Blog'}});
    });
    createMedia = mock(async (data: any) => {
        return this.mockResponse({_id: createBrandedId.media(Date.now().toString()), ...data});
    });
    updateMedia = mock(async (id: string, data: any) => {
        return this.mockResponse({_id: createBrandedId.media(id), ...data});
    });
    deleteMedia = mock(async (_id: string) => {
        return this.mockResponse(null);
    });
    uploadMediaFile = mock(async (mediaId: string, file: File) => {
        const mockMedia: Media = {
            _id: createBrandedId.media(mediaId),
            filename: file.name,
            url: URL.createObjectURL(file),
            mimeType: file.type,
            metadata: {size: file.size},
            userId: createBrandedId.user('user-1'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return this.mockResponse(mockMedia);
    });
    setToken = mock((token: string) => {
        console.log('[Mock Client API] Token set:', token);
    });
    clearToken = mock(() => {
        console.log('[Mock Client API] Token cleared');
    });
    private mockData = {
        '/api/users': mockDataGenerators.users(),
        '/api/categories': mockDataGenerators.categories(),
        '/api/tags': mockDataGenerators.tags(),
        '/api/media': mockDataGenerators.media(),
        '/api/blogs': mockDataGenerators.blogs()
    };
    // Blog APIs
    getBlogs = mock(async (params?: ClientPaginationParams) => {
        return this.mockResponse(this.mockPaginatedResponse<Blog>(this.mockData['/api/blogs'] || [], params));
    });
    getBlog = mock(async (id: string) => {
        const blogs: Blog[] = this.mockData['/api/blogs'] || [];
        return this.mockResponse<Blog>(blogs.find((b: any) => b._id === id)!);
    });
    // User APIs
    getUsers = mock(async (params?: ClientPaginationParams) => {
        return this.mockResponse(this.mockPaginatedResponse<User>(this.mockData['/api/users'] || [], params));
    });
    getUser = mock(async (id: string) => {
        const users = this.mockData['/api/users'] || [];
        const user = users.find((u: any) => u._id === id);
        return this.mockResponse(user!);
    });
    getCurrentUser = mock(async () => {
        return this.mockResponse<User>(this.mockData['/api/users']?.[0]);
    });
    // Categories
    getCategories = mock(async (params?: ClientPaginationParams) => {
        return this.mockResponse(this.mockPaginatedResponse<Category>(this.mockData['/api/categories'] || [], params));
    });
    getCategory = mock(async (id: string) => {
        const categories: Category[] = this.mockData['/api/categories'] || [];
        const category = categories.find((c: any) => c._id === id);
        return this.mockResponse(category!);
    });
    // Tags
    getTags = mock(async (params?: ClientPaginationParams) => {
        return this.mockResponse(this.mockPaginatedResponse<Tag>(this.mockData['/api/tags'] || [], params));
    });
    getTag = mock(async (id: string) => {
        const tags: Tag[] = this.mockData['/api/tags'] || [];
        const tag = tags.find((t: any) => t._id === id);
        return this.mockResponse(tag!);
    });
    // Media APIs
    getMedia = mock(async (params?: ClientPaginationParams) => {
        return this.mockResponse(this.mockPaginatedResponse<Media>(this.mockData['/api/media'] || [], params));
    });
    getMediaById = mock(async (id: string) => {
        const media: Media[] = this.mockData['/api/media'] || [];
        const mediaItem = media.find((m: any) => m._id === id);
        return this.mockResponse(mediaItem!);
    });

    private async mockResponse<T = any>(data: T): Promise<APIResponse<T>> {
        return {code: 0, message: 'Success', payload: data};
    }

    private mockPaginatedResponse<T>(data: T[], params?: ClientPaginationParams): PaginatedResponse<T> {
        return {
            data,
            page: params?.page || 1,
            limit: params?.limit || 10
        };
    }
}

class MockStorage implements Storage {
    get = mock((_key: string): any => {
        return null; // Simple mock
    });

    set = mock((_key: string, _value: any): void => {
        // No-op for mock
    });

    remove = mock((_key: string): void => {
        // No-op for mock
    });

    clear = mock((): void => {
        // No-op for mock
    });
}

class MockClientSettings implements PluginSettings {
    get = mock(<T = any>(_key: string): T | null => {
        return null;
    });
    set = mock(<T = any>(_key: string, _value: T): void => {
        // No-op for mock
    });
    getGlobal = mock(<T = any>(_key: string): T | null => {
        return null;
    });
    setGlobal = mock(<T = any>(_key: string, _value: T): void => {
        // No-op for mock
    });
    getFromPlugin = mock(<T = any>(_targetPluginId: string, _key: string): T | null => {
        return null;
    });

    constructor(_pluginId: string) {
    }
}

export function createMockClientSDK(options: {
    user?: User | null;
    settings?: Record<string, any>;
    serverSdk?: ServerSDK;
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
        pluginId: 'mock-plugin',
        settings: new MockClientSettings('mock-plugin'),

        notify: mock((message: string, status?: 'success' | 'error' | 'info' | 'warning') => {
            console.log(`[${status?.toUpperCase() || 'INFO'}] ${message}`);
        }),

        refresh: mock(() => {
            console.log('[Mock Client SDK] Refresh requested');
        }),

        startIntent: mock(async <T, R>(_intentType: string, _payload: T): Promise<R> => {
            return null as R;
        }) as <T, R>(intentType: string, payload: T) => Promise<R>,

        callHook: mock(async (id, payload) => {
            return {success: true, hookId: id, received: payload} as any;
        }),

        callRPC: mock(async (id, payload) => {
            if (options.serverSdk) {
                return options.serverSdk.callRPC(id, payload);
            }
            return {success: true, rpcId: id, received: payload} as any;
        }),

        storage: new MockStorage(),

        navigate: mock((path: string) => {
            console.log('[Mock Client SDK] Navigate to:', path);
        }),

        system: {
            version: '2.0.0-mock',
            buildTime: new Date().toISOString(),
            buildMode: 'development'
        },
    };
}