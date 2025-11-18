import type {RssData, RssItem, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import {contentObjectToPlainText} from "@supergrowthai/plugin-dev-kit/content";

export interface RssSettings {
    // Feed metadata - can be overridden or use JSON-LD defaults
    useJsonLdDefaults: boolean; // If true, use JSON-LD config for site info
    siteTitle: string; // Override or fallback
    siteDescription: string; // Override or fallback
    publicationName: string; // Override or fallback

    // Content settings
    maxItems: number;
    contentCutoffDays: number; // 0 = no cutoff
    includeFullContent: boolean;

    // Include options
    includeAuthors: boolean;
    includeCategories: boolean;
    includeTags: boolean;
    includeImages: boolean;

    // Advanced
    ttl: number; // Time to live in minutes
}

export const DEFAULT_SETTINGS: RssSettings = {
    useJsonLdDefaults: true,
    siteTitle: '',
    siteDescription: '',
    publicationName: '',
    maxItems: 20,
    contentCutoffDays: 0,
    includeFullContent: false,
    includeAuthors: true,
    includeCategories: true,
    includeTags: false,
    includeImages: false,
    ttl: 60
};

export async function generateRssFeed(
    sdk: ServerSDK,
    siteUrl: string,
    settings: RssSettings
): Promise<RssData> {
    // Build query with optional cutoff date
    const query: any = {status: 'published'};
    if (settings.contentCutoffDays > 0) {
        const cutoffDate = Date.now() - (settings.contentCutoffDays * 24 * 60 * 60 * 1000);
        query.createdAt = {$gte: cutoffDate};
    }

    // Fetch blogs with limit
    const blogs = await sdk.db.blogs.find(
        query,
        {
            sort: {createdAt: -1},
            limit: settings.maxItems,
            projection: {
                _id: 1,
                title: 1,
                slug: 1,
                excerpt: 1,
                content: 1,
                createdAt: 1,
                userId: 1,
                categoryId: 1,
                tagIds: 1,
                featuredImage: 1,
                metadata: 1
            }
        }
    );

    // Generate RSS items
    const items: RssItem[] = [];

    for (const blog of blogs) {
        const item: RssItem = {
            title: blog.title,
            link: '',  // Will be set below
            description: '',  // Will be set below
            pubDate: new Date(blog.createdAt).toUTCString(),
            guid: {
                '@_isPermaLink': true,
                '#text': ''  // Will be set below
            }
        };

        // Use permalink manager if available, fallback to slug
        const permalink = blog.metadata?.['permalink-manager:permalink']?.permalink;
        const blogUrl = permalink ? `${siteUrl}${permalink}` : `${siteUrl}/blog/${blog.slug}`;
        item.link = blogUrl;
        if (item.guid && typeof item.guid === 'object' && '@_isPermaLink' in item.guid) {
            (item.guid as any)['#text'] = blogUrl;
        }

        // Content handling
        const plainContent = contentObjectToPlainText(blog.content);
        if (settings.includeFullContent) {
            // Include full content in content:encoded
            (item as any)['content:encoded'] = plainContent;
            item.description = blog.excerpt || plainContent.substring(0, 300);
        } else {
            // Just use excerpt or truncated content
            item.description = blog.excerpt || plainContent.substring(0, 300);
        }

        // Include author if enabled
        if (settings.includeAuthors && blog.userId) {
            const author = await sdk.db.users.findById(blog.userId);
            if (author) {
                (item as any)['dc:creator'] = author.name || author.email || 'Anonymous';
                item.author = author.email || `${author.name}@noreply`;
            }
        }

        // Include category if enabled
        if (settings.includeCategories && blog.categoryId) {
            const category = await sdk.db.categories.findById(blog.categoryId);
            if (category) {
                item.category = category.name;
            }
        }

        // Include tags if enabled
        if (settings.includeTags && blog.tagIds && blog.tagIds.length > 0) {
            const tags = await sdk.db.tags.find({_id: {$in: blog.tagIds}});
            if (tags.length > 0) {
                // RSS 2.0 doesn't have multiple category support, use first tag
                if (!item.category && tags[0]) {
                    item.category = tags[0].name;
                }
            }
        }

        // Include featured image if enabled
        if (settings.includeImages && (blog as any).featuredImage) {
            (item as any)['media:content'] = {
                '@_url': (blog as any).featuredImage,
                '@_medium': 'image'
            };

            // Also add as enclosure for better compatibility
            item.enclosure = {
                '@_url': (blog as any).featuredImage,
                '@_type': 'image/jpeg', // Simplified, could be improved
                '@_length': 0  // Required field, set to 0 for unknown
            };
        }

        items.push(item);
    }

    // Build RSS data
    const lastBuildDate = new Date().toUTCString();

    return {
        rss: {
            '@_version': '2.0',
            '@_xmlns:atom': 'http://www.w3.org/2005/Atom',
            ['@_xmlns:dc' as any]: 'http://purl.org/dc/elements/1.1/',
            ['@_xmlns:content' as any]: 'http://purl.org/rss/1.0/modules/content/',
            ['@_xmlns:media' as any]: 'http://search.yahoo.com/mrss/',
            channel: {
                title: settings.siteTitle,
                link: siteUrl,
                description: settings.siteDescription,
                language: 'en-US',
                lastBuildDate,
                generator: `${settings.publicationName} RSS Feed`,
                docs: 'https://www.rssboard.org/rss-specification',
                ttl: settings.ttl,
                ['atom:link' as any]: {
                    '@_href': `${siteUrl}/rss`,
                    '@_rel': 'self',
                    '@_type': 'application/rss+xml'
                },
                item: items
            }
        }
    };
}