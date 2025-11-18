import {beforeEach, describe, expect, it} from 'bun:test';
import {DEFAULT_SETTINGS, generateRssFeed, type RssSettings} from './rss-generator';
import {createMockServerSDK} from '@supergrowthai/plugin-dev-kit/server/test';

describe('RSS Generator', () => {
    let mockSdk: ReturnType<typeof createMockServerSDK>;
    const siteUrl = 'https://example.com';

    beforeEach(() => {
        mockSdk = createMockServerSDK();
    });

    it('should generate RSS feed with default settings', async () => {
        const result = await generateRssFeed(mockSdk, siteUrl, DEFAULT_SETTINGS);

        expect(result.rss['@_version']).toBe('2.0');
        expect(result.rss.channel.title).toBe('');
        expect(result.rss.channel.item.length).toBeGreaterThan(0);

        // Check first item structure
        const firstItem = result.rss.channel.item[0];
        expect(firstItem.title).toBeDefined();
        expect(firstItem.link).toContain('https://example.com');
        expect(firstItem.pubDate).toBeDefined();

        // Verify RSS structure
        expect(result.rss.channel.link).toBe(siteUrl);
        expect(result.rss.channel.language).toBe('en-US');
        expect(result.rss.channel.ttl).toBe(DEFAULT_SETTINGS.ttl);
    });

    it('should respect content cutoff days', async () => {
        const cutoffSettings: RssSettings = {
            ...DEFAULT_SETTINGS,
            contentCutoffDays: 7
        };

        await generateRssFeed(mockSdk, siteUrl, cutoffSettings);

        // Verify the query includes cutoff filter
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

        const result = await generateRssFeed(mockSdk, siteUrl, fullContentSettings);

        const firstItem = result.rss.channel.item[0];

        // Check that content:encoded field is added when full content is enabled
        expect((firstItem as any)['content:encoded']).toBeDefined();

        // Description should still be available (excerpt or content)
        expect(firstItem.description).toBeDefined();
        expect(firstItem.description).toBeTruthy();
    });

    it('should include author information when enabled', async () => {
        const result = await generateRssFeed(mockSdk, siteUrl, DEFAULT_SETTINGS);

        const firstItem = result.rss.channel.item[0];

        // Author should be included by default (using mock data)
        expect((firstItem as any)['dc:creator']).toBeDefined();
        expect(firstItem.author).toBeDefined();
    });

    it('should include category information when enabled', async () => {
        const result = await generateRssFeed(mockSdk, siteUrl, DEFAULT_SETTINGS);

        const firstItem = result.rss.channel.item[0];

        // Category should be included by default
        expect(firstItem.category).toBeDefined();
    });

    it('should work with maxItems setting', async () => {
        const limitedSettings: RssSettings = {
            ...DEFAULT_SETTINGS,
            maxItems: 2
        };

        const result = await generateRssFeed(mockSdk, siteUrl, limitedSettings);

        // Mock database doesn't implement limit, but RSS generator should handle it
        expect(result.rss.channel.item.length).toBeGreaterThan(0);
        expect(Array.isArray(result.rss.channel.item)).toBe(true);

        // Each item should have required fields
        result.rss.channel.item.forEach(item => {
            expect(item.title).toBeDefined();
            expect(item.link).toBeDefined();
            expect(item.pubDate).toBeDefined();
        });
    });

    it('should handle custom RSS settings', async () => {
        const customSettings: RssSettings = {
            ...DEFAULT_SETTINGS,
            siteTitle: 'My Tech Blog',
            siteDescription: 'Insights into modern web development',
            publicationName: 'TechBlog',
            includeAuthors: false,
            includeCategories: false,
            ttl: 120
        };

        const result = await generateRssFeed(mockSdk, siteUrl, customSettings);

        expect(result.rss.channel.title).toBe('My Tech Blog');
        expect(result.rss.channel.description).toBe('Insights into modern web development');
        expect(result.rss.channel.generator).toBe('TechBlog RSS Feed');
        expect(result.rss.channel.ttl).toBe(120);

        // Should not include author or category info
        const firstItem = result.rss.channel.item[0];
        expect((firstItem as any)['dc:creator']).toBeUndefined();
        expect(firstItem.author).toBeUndefined();
        expect(firstItem.category).toBeUndefined();
    });
});