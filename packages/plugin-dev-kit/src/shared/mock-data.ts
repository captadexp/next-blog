import type {Blog, Category, ContentObject, Media, Permission, Tag, User} from '@supergrowthai/next-blog-types';

export const createBrandedId = {
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

export const mockUsers: () => User[] = () => [
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
];

export const mockCategories: () => Category[] = () => [
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
];

export const mockTags: () => Tag[] = () => [
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
];

export const mockMedia: () => Media[] = () => [
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
];

export const mockBlogs: () => Blog[] = () => [
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
];

export const mockDataGenerators = {
    users: mockUsers,
    categories: mockCategories,
    tags: mockTags,
    media: mockMedia,
    blogs: mockBlogs
};