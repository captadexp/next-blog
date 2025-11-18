import {beforeEach, describe, expect, it, mock} from 'bun:test';
import {DEFAULT_SETTINGS, generateRssFeed, type RssSettings} from './rss-generator';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';

// Test file using Bun's built-in test runner
// Run with: bun test

describe('RSS Generator', () => {
    const mockSdk = {
        db: {
            blogs: {
                find: mock(() => Promise.resolve([])) as any,
            },
            users: {
                findById: mock(() => Promise.resolve(null)) as any,
            },
            categories: {
                findById: mock(() => Promise.resolve(null)) as any,
            },
            tags: {
                find: mock(() => Promise.resolve([])) as any,
            },
        },
        log: {
            info: mock(() => {
            }),
            error: mock(() => {
            }),
        },
    } as unknown as ServerSDK;

    const siteUrl = 'https://example.com';

    beforeEach(() => {
        // Reset all mocks
        mockSdk.db.blogs.find.mockClear();
        mockSdk.db.users.findById.mockClear();
        mockSdk.db.categories.findById.mockClear();
        mockSdk.db.tags.find.mockClear();
    });

    it('should generate RSS feed with default settings', async () => {
        const mockBlogs = [
            {
                _id: '1',
                title: 'Test Blog Post',
                slug: 'test-blog-post',
                excerpt: 'This is a test excerpt',
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
                                    data: 'Full content here'
                                }
                            ]
                        }
                    ]
                },
                createdAt: new Date('2024-01-01').getTime(),
                userId: 'user1',
                categoryId: 'cat1',
                metadata: {
                    'permalink-manager:permalink': {
                        permalink: '/blog/test-blog-post'
                    }
                }
            }
        ];

        mockSdk.db.blogs.find.mockResolvedValueOnce(mockBlogs);
        mockSdk.db.users.findById.mockResolvedValueOnce({
            name: 'John Doe',
            email: 'john@example.com'
        });
        mockSdk.db.categories.findById.mockResolvedValueOnce({
            name: 'Technology'
        });

        const result = await generateRssFeed(mockSdk, siteUrl, DEFAULT_SETTINGS);

        expect(result.rss['@_version']).toBe('2.0');
        expect(result.rss.channel.title).toBe('');
        expect(result.rss.channel.item).toHaveLength(1);
        expect(result.rss.channel.item[0].title).toBe('Test Blog Post');
        expect(result.rss.channel.item[0].link).toBe('https://example.com/blog/test-blog-post');
    });

    it('should respect content cutoff days', async () => {
        const cutoffSettings: RssSettings = {
            ...DEFAULT_SETTINGS,
            contentCutoffDays: 7
        };

        const oldDate = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
        const recentDate = Date.now() - (5 * 24 * 60 * 60 * 1000); // 5 days ago

        mockSdk.db.blogs.find.mockImplementationOnce((query: any) => {
            // Verify the query includes cutoff filter
            expect(query.createdAt).toBeDefined();
            expect(query.createdAt.$gte).toBeLessThanOrEqual(Date.now());
            return Promise.resolve([]);
        });

        await generateRssFeed(mockSdk, siteUrl, cutoffSettings);

        expect(mockSdk.db.blogs.find).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'published',
                createdAt: expect.objectContaining({
                    $gte: expect.any(Number)
                })
            }),
            expect.any(Object)
        );
    });

    it('should include full content when enabled', async () => {
        const fullContentSettings: RssSettings = {
            ...DEFAULT_SETTINGS,
            includeFullContent: true
        };

        const mockBlogs = [
            {
                _id: '1',
                title: 'Test Blog',
                slug: 'test-blog',
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
                                    data: 'This is the full content of the blog post'
                                }
                            ]
                        }
                    ]
                },
                createdAt: Date.now(),
                metadata: {}
            }
        ];

        mockSdk.db.blogs.find.mockResolvedValueOnce(mockBlogs);

        const result = await generateRssFeed(mockSdk, siteUrl, fullContentSettings);

        expect((result.rss.channel.item[0] as any)['content:encoded']).toBe('This is the full content of the blog post');
    });

    it('should handle missing optional data gracefully', async () => {
        const mockBlogs = [
            {
                _id: '1',
                title: 'Minimal Blog',
                slug: 'minimal-blog',
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
                                    data: 'Content'
                                }
                            ]
                        }
                    ]
                },
                createdAt: Date.now(),
                // No userId, categoryId, excerpt, or permalink metadata
            }
        ];

        mockSdk.db.blogs.find.mockResolvedValueOnce(mockBlogs);

        const result = await generateRssFeed(mockSdk, siteUrl, DEFAULT_SETTINGS);

        expect(result.rss.channel.item[0].link).toBe('https://example.com/blog/minimal-blog');
        expect(result.rss.channel.item[0].description).toBe('Content');
    });
});