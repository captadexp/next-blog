import {mock} from 'bun:test';
import type {
    APIClient,
    APIResponse,
    Blog,
    Category,
    ClientPaginationParams,
    ClientSDK,
    ContentObject,
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

// Create branded IDs for testing
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
        '/api/users': [
            {
                _id: createBrandedId.user('user-1'),
                name: 'Alice Johnson',
                email: 'alice@example.com',
                username: 'alice',
                password: 'hashed',
                slug: 'alice-johnson',
                bio: 'Frontend developer passionate about React and TypeScript',
                permissions: ['blogs:write', 'media:create'] as Permission[],
                createdAt: Date.now() - 86400000 * 30,
                updatedAt: Date.now() - 86400000 * 5
            },
            {
                _id: createBrandedId.user('user-2'),
                name: 'Bob Smith',
                email: 'bob@example.com',
                username: 'bob',
                password: 'hashed',
                slug: 'bob-smith',
                bio: 'Backend engineer with expertise in Node.js and databases',
                permissions: ['blogs:all', 'users:read', 'categories:write'] as Permission[],
                createdAt: Date.now() - 86400000 * 25,
                updatedAt: Date.now() - 86400000 * 3
            },
            {
                _id: createBrandedId.user('user-3'),
                name: 'Carol Davis',
                email: 'carol@example.com',
                username: 'carol',
                password: 'hashed',
                slug: 'carol-davis',
                bio: 'Tech writer and content strategist',
                permissions: ['blogs:write', 'tags:create'] as Permission[],
                createdAt: Date.now() - 86400000 * 20,
                updatedAt: Date.now() - 86400000 * 2
            },
            {
                _id: createBrandedId.user('user-4'),
                name: 'David Wilson',
                email: 'david@example.com',
                username: 'david',
                password: 'hashed',
                slug: 'david-wilson',
                bio: 'DevOps engineer focused on scalable infrastructure',
                permissions: ['blogs:read', 'media:read'] as Permission[],
                createdAt: Date.now() - 86400000 * 15,
                updatedAt: Date.now() - 86400000 * 1
            },
            {
                _id: createBrandedId.user('user-5'),
                name: 'Emma Taylor',
                email: 'emma@example.com',
                username: 'emma',
                password: 'hashed',
                slug: 'emma-taylor',
                bio: 'UX designer with a passion for user-centered design',
                permissions: ['blogs:write', 'media:write', 'categories:read'] as Permission[],
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now()
            }
        ],
        '/api/categories': [
            {
                _id: createBrandedId.category('cat-1'),
                name: 'Technology',
                slug: 'technology',
                description: 'Articles about the latest in technology trends, programming, and software development',
                createdAt: Date.now() - 86400000 * 30,
                updatedAt: Date.now() - 86400000 * 10
            },
            {
                _id: createBrandedId.category('cat-2'),
                name: 'Design',
                slug: 'design',
                description: 'User experience, user interface, and visual design insights',
                createdAt: Date.now() - 86400000 * 28,
                updatedAt: Date.now() - 86400000 * 8
            },
            {
                _id: createBrandedId.category('cat-3'),
                name: 'DevOps',
                slug: 'devops',
                description: 'Infrastructure, deployment, monitoring, and operational excellence',
                createdAt: Date.now() - 86400000 * 25,
                updatedAt: Date.now() - 86400000 * 5
            }
        ],
        '/api/tags': [
            {
                _id: createBrandedId.tag('tag-1'),
                name: 'JavaScript',
                slug: 'javascript',
                description: 'JavaScript programming language and ecosystem',
                createdAt: Date.now() - 86400000 * 30,
                updatedAt: Date.now() - 86400000 * 5
            },
            {
                _id: createBrandedId.tag('tag-2'),
                name: 'React',
                slug: 'react',
                description: 'React library for building user interfaces',
                createdAt: Date.now() - 86400000 * 29,
                updatedAt: Date.now() - 86400000 * 4
            },
            {
                _id: createBrandedId.tag('tag-3'),
                name: 'TypeScript',
                slug: 'typescript',
                description: 'TypeScript language and type safety',
                createdAt: Date.now() - 86400000 * 28,
                updatedAt: Date.now() - 86400000 * 3
            },
            {
                _id: createBrandedId.tag('tag-4'),
                name: 'Node.js',
                slug: 'nodejs',
                description: 'Server-side JavaScript runtime',
                createdAt: Date.now() - 86400000 * 27,
                updatedAt: Date.now() - 86400000 * 2
            },
            {
                _id: createBrandedId.tag('tag-5'),
                name: 'Docker',
                slug: 'docker',
                description: 'Containerization and deployment',
                createdAt: Date.now() - 86400000 * 26,
                updatedAt: Date.now() - 86400000 * 1
            },
            {
                _id: createBrandedId.tag('tag-6'),
                name: 'Kubernetes',
                slug: 'kubernetes',
                description: 'Container orchestration platform',
                createdAt: Date.now() - 86400000 * 25,
                updatedAt: Date.now()
            },
            {
                _id: createBrandedId.tag('tag-7'),
                name: 'AWS',
                slug: 'aws',
                description: 'Amazon Web Services cloud platform',
                createdAt: Date.now() - 86400000 * 24,
                updatedAt: Date.now()
            },
            {
                _id: createBrandedId.tag('tag-8'),
                name: 'Figma',
                slug: 'figma',
                description: 'Design and prototyping tool',
                createdAt: Date.now() - 86400000 * 23,
                updatedAt: Date.now()
            },
            {
                _id: createBrandedId.tag('tag-9'),
                name: 'UI/UX',
                slug: 'ui-ux',
                description: 'User interface and user experience design',
                createdAt: Date.now() - 86400000 * 22,
                updatedAt: Date.now()
            },
            {
                _id: createBrandedId.tag('tag-10'),
                name: 'API Design',
                slug: 'api-design',
                description: 'REST API and GraphQL design principles',
                createdAt: Date.now() - 86400000 * 21,
                updatedAt: Date.now()
            }
        ],
        '/api/media': [
            {
                _id: createBrandedId.media('media-1'),
                filename: 'react-hooks-diagram.png',
                url: 'https://example.com/media/react-hooks-diagram.png',
                mimeType: 'image/png',
                metadata: {size: 245760, width: 1200, height: 800},
                userId: createBrandedId.user('user-1'),
                createdAt: Date.now() - 86400000 * 20,
                updatedAt: Date.now() - 86400000 * 20
            },
            {
                _id: createBrandedId.media('media-2'),
                filename: 'nodejs-architecture.jpg',
                url: 'https://example.com/media/nodejs-architecture.jpg',
                mimeType: 'image/jpeg',
                metadata: {size: 189440, width: 1000, height: 600},
                userId: createBrandedId.user('user-2'),
                createdAt: Date.now() - 86400000 * 18,
                updatedAt: Date.now() - 86400000 * 18
            },
            {
                _id: createBrandedId.media('media-3'),
                filename: 'docker-containers.svg',
                url: 'https://example.com/media/docker-containers.svg',
                mimeType: 'image/svg+xml',
                metadata: {size: 15360},
                userId: createBrandedId.user('user-4'),
                createdAt: Date.now() - 86400000 * 15,
                updatedAt: Date.now() - 86400000 * 15
            },
            {
                _id: createBrandedId.media('media-4'),
                filename: 'ux-wireframe.png',
                url: 'https://example.com/media/ux-wireframe.png',
                mimeType: 'image/png',
                metadata: {size: 512000, width: 1920, height: 1080},
                userId: createBrandedId.user('user-5'),
                createdAt: Date.now() - 86400000 * 12,
                updatedAt: Date.now() - 86400000 * 12
            },
            {
                _id: createBrandedId.media('media-5'),
                filename: 'api-documentation.pdf',
                url: 'https://example.com/media/api-documentation.pdf',
                mimeType: 'application/pdf',
                metadata: {size: 1048576},
                userId: createBrandedId.user('user-3'),
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10
            }
        ],
        '/api/blogs': [
            {
                _id: createBrandedId.blog('blog-1'),
                title: 'Getting Started with React Hooks',
                content: {
                    version: 1,
                    content: [
                        {
                            name: 'Paragraph',
                            version: 1,
                            data: [
                                {
                                    name: 'Text',
                                    version: 1,
                                    data: 'React Hooks revolutionized how we write React components...'
                                }
                            ]
                        }
                    ]
                } as ContentObject,
                status: 'published' as const,
                slug: 'getting-started-with-react-hooks',
                excerpt: 'Learn the fundamentals of React Hooks and how they can simplify your component logic.',
                featuredMediaId: createBrandedId.media('media-1'),
                categoryId: createBrandedId.category('cat-1'),
                tagIds: [createBrandedId.tag('tag-1'), createBrandedId.tag('tag-2')],
                userId: createBrandedId.user('user-1'),
                createdAt: Date.now() - 86400000 * 20,
                updatedAt: Date.now() - 86400000 * 10
            },
            {
                _id: createBrandedId.blog('blog-2'),
                title: 'Building Scalable Node.js Applications',
                content: {
                    version: 1,
                    content: [
                        {
                            name: 'Paragraph',
                            version: 1,
                            data: [
                                {
                                    name: 'Text',
                                    version: 1,
                                    data: 'Scaling Node.js applications requires careful consideration of architecture patterns...'
                                }
                            ]
                        }
                    ]
                } as ContentObject,
                status: 'published' as const,
                slug: 'building-scalable-nodejs-applications',
                excerpt: 'Best practices for architecting Node.js applications that can handle millions of users.',
                featuredMediaId: createBrandedId.media('media-2'),
                categoryId: createBrandedId.category('cat-1'),
                tagIds: [createBrandedId.tag('tag-4'), createBrandedId.tag('tag-3'), createBrandedId.tag('tag-10')],
                userId: createBrandedId.user('user-2'),
                createdAt: Date.now() - 86400000 * 18,
                updatedAt: Date.now() - 86400000 * 8
            },
            {
                _id: createBrandedId.blog('blog-3'),
                title: 'Docker Best Practices for Production',
                content: {
                    version: 1,
                    content: [
                        {
                            name: 'Paragraph',
                            version: 1,
                            data: [
                                {
                                    name: 'Text',
                                    version: 1,
                                    data: 'Containerizing applications with Docker requires following production-ready practices...'
                                }
                            ]
                        }
                    ]
                },
                status: 'published' as const,
                slug: 'docker-best-practices-for-production',
                excerpt: 'Essential Docker practices for secure, efficient, and maintainable containerized applications.',
                featuredMediaId: createBrandedId.media('media-3'),
                categoryId: createBrandedId.category('cat-3'),
                tagIds: [createBrandedId.tag('tag-5'), createBrandedId.tag('tag-6'), createBrandedId.tag('tag-7')],
                userId: createBrandedId.user('user-4'),
                createdAt: Date.now() - 86400000 * 15,
                updatedAt: Date.now() - 86400000 * 6
            },
            {
                _id: createBrandedId.blog('blog-4'),
                title: 'Modern UI/UX Design Principles',
                content: {
                    version: 1,
                    content: [
                        {
                            name: 'Paragraph',
                            version: 1,
                            data: [
                                {
                                    name: 'Text',
                                    version: 1,
                                    data: 'Creating intuitive user experiences requires understanding core design principles...'
                                }
                            ]
                        }
                    ]
                },
                status: 'published' as const,
                slug: 'modern-ui-ux-design-principles',
                excerpt: 'Explore the fundamental principles that drive exceptional user interface and experience design.',
                featuredMediaId: createBrandedId.media('media-4'),
                categoryId: createBrandedId.category('cat-2'),
                tagIds: [createBrandedId.tag('tag-8'), createBrandedId.tag('tag-9')],
                userId: createBrandedId.user('user-5'),
                createdAt: Date.now() - 86400000 * 12,
                updatedAt: Date.now() - 86400000 * 4
            },
            {
                _id: createBrandedId.blog('blog-5'),
                title: 'TypeScript Advanced Patterns',
                content: {
                    version: 1,
                    content: [
                        {
                            name: 'Paragraph',
                            version: 1,
                            data: [
                                {
                                    name: 'Text',
                                    version: 1,
                                    data: 'Advanced TypeScript patterns can help you write more maintainable and type-safe code...'
                                }
                            ]
                        }
                    ]
                },
                status: 'draft' as const,
                slug: 'typescript-advanced-patterns',
                excerpt: 'Deep dive into advanced TypeScript patterns for better code organization and type safety.',
                featuredMediaId: createBrandedId.media('media-5'),
                categoryId: createBrandedId.category('cat-1'),
                tagIds: [createBrandedId.tag('tag-3'), createBrandedId.tag('tag-1'), createBrandedId.tag('tag-10')],
                userId: createBrandedId.user('user-3'),
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 2
            }
        ] as Blog[]
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