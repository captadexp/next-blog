import {mock} from 'bun:test';
import type {DatabaseAdapter, Logger, PluginSettings, ServerSDK, User} from '@supergrowthai/next-blog-types';

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

    private data: Record<string, any[]> = {
        users: [
            {
                _id: 'user-1',
                name: 'Alice Johnson',
                email: 'alice@example.com',
                username: 'alice',
                password: 'hashed',
                slug: 'alice-johnson',
                bio: 'Frontend developer passionate about React and TypeScript',
                permissions: ['blogs:write', 'media:write'],
                createdAt: Date.now() - 86400000 * 30,
                updatedAt: Date.now() - 86400000 * 5
            },
            {
                _id: 'user-2',
                name: 'Bob Smith',
                email: 'bob@example.com',
                username: 'bob',
                password: 'hashed',
                slug: 'bob-smith',
                bio: 'Backend engineer with expertise in Node.js and databases',
                permissions: ['blogs:all', 'users:read', 'categories:write'],
                createdAt: Date.now() - 86400000 * 25,
                updatedAt: Date.now() - 86400000 * 3
            },
            {
                _id: 'user-3',
                name: 'Carol Davis',
                email: 'carol@example.com',
                username: 'carol',
                password: 'hashed',
                slug: 'carol-davis',
                bio: 'Tech writer and content strategist',
                permissions: ['blogs:write', 'tags:write'],
                createdAt: Date.now() - 86400000 * 20,
                updatedAt: Date.now() - 86400000 * 2
            },
            {
                _id: 'user-4',
                name: 'David Wilson',
                email: 'david@example.com',
                username: 'david',
                password: 'hashed',
                slug: 'david-wilson',
                bio: 'DevOps engineer focused on scalable infrastructure',
                permissions: ['blogs:read', 'media:read'],
                createdAt: Date.now() - 86400000 * 15,
                updatedAt: Date.now() - 86400000 * 1
            },
            {
                _id: 'user-5',
                name: 'Emma Taylor',
                email: 'emma@example.com',
                username: 'emma',
                password: 'hashed',
                slug: 'emma-taylor',
                bio: 'UX designer with a passion for user-centered design',
                permissions: ['blogs:write', 'media:write', 'categories:read'],
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now()
            }
        ],
        categories: [
            {
                _id: 'cat-1',
                name: 'Technology',
                slug: 'technology',
                description: 'Articles about the latest in technology trends, programming, and software development',
                createdAt: Date.now() - 86400000 * 30,
                updatedAt: Date.now() - 86400000 * 10
            },
            {
                _id: 'cat-2',
                name: 'Design',
                slug: 'design',
                description: 'User experience, user interface, and visual design insights',
                createdAt: Date.now() - 86400000 * 28,
                updatedAt: Date.now() - 86400000 * 8
            },
            {
                _id: 'cat-3',
                name: 'DevOps',
                slug: 'devops',
                description: 'Infrastructure, deployment, monitoring, and operational excellence',
                createdAt: Date.now() - 86400000 * 25,
                updatedAt: Date.now() - 86400000 * 5
            }
        ],
        tags: [
            {
                _id: 'tag-1',
                name: 'JavaScript',
                slug: 'javascript',
                description: 'JavaScript programming language and ecosystem',
                createdAt: Date.now() - 86400000 * 30,
                updatedAt: Date.now() - 86400000 * 5
            },
            {
                _id: 'tag-2',
                name: 'React',
                slug: 'react',
                description: 'React library for building user interfaces',
                createdAt: Date.now() - 86400000 * 29,
                updatedAt: Date.now() - 86400000 * 4
            },
            {
                _id: 'tag-3',
                name: 'TypeScript',
                slug: 'typescript',
                description: 'TypeScript language and type safety',
                createdAt: Date.now() - 86400000 * 28,
                updatedAt: Date.now() - 86400000 * 3
            },
            {
                _id: 'tag-4',
                name: 'Node.js',
                slug: 'nodejs',
                description: 'Server-side JavaScript runtime',
                createdAt: Date.now() - 86400000 * 27,
                updatedAt: Date.now() - 86400000 * 2
            },
            {
                _id: 'tag-5',
                name: 'Docker',
                slug: 'docker',
                description: 'Containerization and deployment',
                createdAt: Date.now() - 86400000 * 26,
                updatedAt: Date.now() - 86400000 * 1
            },
            {
                _id: 'tag-6',
                name: 'Kubernetes',
                slug: 'kubernetes',
                description: 'Container orchestration platform',
                createdAt: Date.now() - 86400000 * 25,
                updatedAt: Date.now()
            },
            {
                _id: 'tag-7',
                name: 'AWS',
                slug: 'aws',
                description: 'Amazon Web Services cloud platform',
                createdAt: Date.now() - 86400000 * 24,
                updatedAt: Date.now()
            },
            {
                _id: 'tag-8',
                name: 'Figma',
                slug: 'figma',
                description: 'Design and prototyping tool',
                createdAt: Date.now() - 86400000 * 23,
                updatedAt: Date.now()
            },
            {
                _id: 'tag-9',
                name: 'UI/UX',
                slug: 'ui-ux',
                description: 'User interface and user experience design',
                createdAt: Date.now() - 86400000 * 22,
                updatedAt: Date.now()
            },
            {
                _id: 'tag-10',
                name: 'API Design',
                slug: 'api-design',
                description: 'REST API and GraphQL design principles',
                createdAt: Date.now() - 86400000 * 21,
                updatedAt: Date.now()
            }
        ],
        media: [
            {
                _id: 'media-1',
                filename: 'react-hooks-diagram.png',
                url: 'https://example.com/media/react-hooks-diagram.png',
                mimeType: 'image/png',
                metadata: {size: 245760, width: 1200, height: 800},
                userId: 'user-1',
                createdAt: Date.now() - 86400000 * 20,
                updatedAt: Date.now() - 86400000 * 20
            },
            {
                _id: 'media-2',
                filename: 'nodejs-architecture.jpg',
                url: 'https://example.com/media/nodejs-architecture.jpg',
                mimeType: 'image/jpeg',
                metadata: {size: 189440, width: 1000, height: 600},
                userId: 'user-2',
                createdAt: Date.now() - 86400000 * 18,
                updatedAt: Date.now() - 86400000 * 18
            },
            {
                _id: 'media-3',
                filename: 'docker-containers.svg',
                url: 'https://example.com/media/docker-containers.svg',
                mimeType: 'image/svg+xml',
                metadata: {size: 15360},
                userId: 'user-4',
                createdAt: Date.now() - 86400000 * 15,
                updatedAt: Date.now() - 86400000 * 15
            },
            {
                _id: 'media-4',
                filename: 'ux-wireframe.png',
                url: 'https://example.com/media/ux-wireframe.png',
                mimeType: 'image/png',
                metadata: {size: 512000, width: 1920, height: 1080},
                userId: 'user-5',
                createdAt: Date.now() - 86400000 * 12,
                updatedAt: Date.now() - 86400000 * 12
            },
            {
                _id: 'media-5',
                filename: 'api-documentation.pdf',
                url: 'https://example.com/media/api-documentation.pdf',
                mimeType: 'application/pdf',
                metadata: {size: 1048576},
                userId: 'user-3',
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 10
            }
        ],
        blogs: [
            {
                _id: 'blog-1',
                title: 'Getting Started with React Hooks',
                content: {
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                type: 'text',
                                text: 'React Hooks revolutionized how we write React components...'
                            }]
                        }
                    ],
                    version: 1
                },
                status: 'published',
                slug: 'getting-started-with-react-hooks',
                excerpt: 'Learn the fundamentals of React Hooks and how they can simplify your component logic.',
                featuredImage: 'media-1',
                categoryId: 'cat-1',
                tagIds: ['tag-1', 'tag-2'],
                userId: 'user-1',
                createdAt: Date.now() - 86400000 * 20,
                updatedAt: Date.now() - 86400000 * 10
            },
            {
                _id: 'blog-2',
                title: 'Building Scalable Node.js Applications',
                content: {
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                type: 'text',
                                text: 'Scaling Node.js applications requires careful consideration of architecture patterns...'
                            }]
                        }
                    ],
                    version: 1
                },
                status: 'published',
                slug: 'building-scalable-nodejs-applications',
                excerpt: 'Best practices for architecting Node.js applications that can handle millions of users.',
                featuredImage: 'media-2',
                categoryId: 'cat-1',
                tagIds: ['tag-4', 'tag-3', 'tag-10'],
                userId: 'user-2',
                createdAt: Date.now() - 86400000 * 18,
                updatedAt: Date.now() - 86400000 * 8
            },
            {
                _id: 'blog-3',
                title: 'Docker Best Practices for Production',
                content: {
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                type: 'text',
                                text: 'Containerizing applications with Docker requires following production-ready practices...'
                            }]
                        }
                    ],
                    version: 1
                },
                status: 'published',
                slug: 'docker-best-practices-for-production',
                excerpt: 'Essential Docker practices for secure, efficient, and maintainable containerized applications.',
                featuredImage: 'media-3',
                categoryId: 'cat-3',
                tagIds: ['tag-5', 'tag-6', 'tag-7'],
                userId: 'user-4',
                createdAt: Date.now() - 86400000 * 15,
                updatedAt: Date.now() - 86400000 * 6
            },
            {
                _id: 'blog-4',
                title: 'Modern UI/UX Design Principles',
                content: {
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                type: 'text',
                                text: 'Creating intuitive user experiences requires understanding core design principles...'
                            }]
                        }
                    ],
                    version: 1
                },
                status: 'published',
                slug: 'modern-ui-ux-design-principles',
                excerpt: 'Explore the fundamental principles that drive exceptional user interface and experience design.',
                featuredImage: 'media-4',
                categoryId: 'cat-2',
                tagIds: ['tag-8', 'tag-9'],
                userId: 'user-5',
                createdAt: Date.now() - 86400000 * 12,
                updatedAt: Date.now() - 86400000 * 4
            },
            {
                _id: 'blog-5',
                title: 'TypeScript Advanced Patterns',
                content: {
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                type: 'text',
                                text: 'Advanced TypeScript patterns can help you write more maintainable and type-safe code...'
                            }]
                        }
                    ],
                    version: 1
                },
                status: 'draft',
                slug: 'typescript-advanced-patterns',
                excerpt: 'Deep dive into advanced TypeScript patterns for better code organization and type safety.',
                featuredImage: 'media-5',
                categoryId: 'cat-1',
                tagIds: ['tag-3', 'tag-1', 'tag-10'],
                userId: 'user-3',
                createdAt: Date.now() - 86400000 * 10,
                updatedAt: Date.now() - 86400000 * 2
            }
        ]
    };

    private createCollectionMethods(collection: string) {
        return {
            find: mock(async (filter: any, _options?: any) => {
                console.log(`[Mock DB] Find in ${collection}:`, filter);
                const items = this.data[collection] || [];
                if (!filter || Object.keys(filter).length === 0) {
                    return items;
                }
                return items.filter(item =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
            }),
            findOne: mock(async (filter: any) => {
                const items = this.data[collection] || [];
                if (!filter || Object.keys(filter).length === 0) {
                    return items[0] || null;
                }
                const filtered = items.filter(item =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                return filtered[0] || null;
            }),
            findById: mock(async (id: string) => {
                const items = this.data[collection] || [];
                return items.find(item => item._id === id) || null;
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
                const itemIndex = items.findIndex(item =>
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
                const index = items.findIndex(item =>
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
                const toDelete = items.filter(item =>
                    Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                this.data[collection] = items.filter(item =>
                    !Object.entries(filter).every(([key, value]) => item[key] === value)
                );
                return toDelete.length;
            }),
            count: mock(async (filter: any) => {
                console.log(`[Mock DB] Count in ${collection}:`, filter);
                const items = this.data[collection] || [];
                if (!filter || Object.keys(filter).length === 0) {
                    return items.length;
                }
                const filtered = items.filter(item =>
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