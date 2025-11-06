import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK, SitemapData, SitemapIndexData, SitemapUrl} from '@supergrowthai/plugin-dev-kit/server';

const SETTINGS_KEY = 'seo-sitemap:settings';

interface SitemapSettings {
    // Standard sitemaps
    enablePosts: boolean;
    enableCategories: boolean;
    enableTags: boolean;
    enableAuthors: boolean;
    postsPerPage: number;

    // News sitemap
    enableNews: boolean;
    newsMaxAge: number; // Days to include in news sitemap (max 2 per Google)
    newsPublications: string[]; // Publication names for news sitemap
    newsTagSlug: string; // Tag slug to filter news articles (e.g., 'news')
    newsCategorySlug: string; // Category slug to filter news articles (e.g., 'news')
}

const DEFAULT_SETTINGS: SitemapSettings = {
    enablePosts: true,
    enableCategories: false,
    enableTags: false,
    enableAuthors: false,
    postsPerPage: 1000,
    enableNews: false,
    newsMaxAge: 2,
    newsPublications: [],
    newsTagSlug: 'news',
    newsCategorySlug: 'news'
};

/**
 * Sitemap URL Structure:
 *
 * /sitemap.xml - Main sitemap index
 *
 * Standard Sitemaps:
 * /sitemap/sitemap-posts-{page}.xml - Posts sitemap
 * /sitemap/sitemap-categories-{page}.xml - Categories sitemap
 * /sitemap/sitemap-tags-{page}.xml - Tags sitemap
 * /sitemap/sitemap-authors-{page}.xml - Authors sitemap
 *
 * Special Sitemaps:
 * /sitemap/sitemap-news.xml - Google News sitemap (last 48 hours)
 *
 * Future (via jobs):
 * /sitemap/sitemap-posts-{year}-{month}.xml - Monthly archives
 * /sitemap/sitemap-posts-live.xml - Last 30 days
 */

export default defineServer({
    hooks: {
        'seo:sitemap-index': async (sdk, payload) => {
            const settings = await getSettings(sdk);
            console.log(settings);
            return generateSitemapIndex(sdk, payload.siteUrl, settings);
        },
        'seo:sitemap': async (sdk, payload) => {
            const segments = payload.request._params?.['catchAll']?.split('/').filter(Boolean) || [];

            if (!segments.length)
                return

            const filename = segments[0];

            // Special sitemaps
            if (filename === 'sitemap-news.xml') {
                const settings = await getSettings(sdk);
                if (!settings.enableNews) {
                    return new Response('News sitemap disabled', {status: 404});
                }
                return generateNewsSitemap(sdk, payload.siteUrl, settings);
            }

            // Standard paginated sitemaps
            const match = filename.match(/^sitemap-(\w+)-(\d+)\.xml$/);
            if (!match) {
                return new Response('Invalid sitemap format', {status: 404});
            }

            const [, type, pageStr] = match;
            const page = parseInt(pageStr);
            const settings = await getSettings(sdk);

            switch (type) {
                case 'posts':
                    if (!settings.enablePosts) break;
                    return generatePostsSitemap(sdk, payload.siteUrl, page, settings);

                case 'categories':
                    if (!settings.enableCategories) break;
                    return generateCategoriesSitemap(sdk, payload.siteUrl, page);

                case 'tags':
                    if (!settings.enableTags) break;
                    return generateTagsSitemap(sdk, payload.siteUrl, page);

                case 'authors':
                    if (!settings.enableAuthors) break;
                    return generateAuthorsSitemap(sdk, payload.siteUrl, page);
            }

            return new Response('Sitemap not found', {status: 404});
        }
    },
    rpcs: {
        'sitemap:settings:get': async (sdk) => {
            const settings = await getSettings(sdk);
            return {code: 0, message: 'ok', payload: settings};
        },
        'sitemap:settings:set': async (sdk, settings: SitemapSettings) => {
            await sdk.settings.set(SETTINGS_KEY, settings);
            return {code: 0, message: 'Settings saved'};
        },

        // Job RPCs for future implementation
        'job:archive-sitemap-month': async (sdk, payload: { year: number, month: number }) => {
            // Future: Archive a specific month's sitemap to S3
            return {code: 0, message: 'Job queued', jobId: `archive-${payload.year}-${payload.month}`};
        },
        'job:rebuild-sitemap-month': async (sdk, payload: { year: number, month: number }) => {
            // Future: Rebuild a specific month's sitemap after content update
            return {code: 0, message: 'Job queued', jobId: `rebuild-${payload.year}-${payload.month}`};
        },
        'job:cleanup-old-sitemaps': async (sdk, payload: { olderThanDays: number }) => {
            // Future: Clean up outdated sitemap versions
            return {code: 0, message: 'Job queued', jobId: `cleanup-${Date.now()}`};
        }
    }
});

async function getSettings(sdk: ServerSDK): Promise<SitemapSettings> {
    const stored = await sdk.settings.get<SitemapSettings>(SETTINGS_KEY);
    return {...DEFAULT_SETTINGS, ...stored};
}

async function generateSitemapIndex(sdk: ServerSDK, siteUrl: string, settings: SitemapSettings) {
    const sitemaps = [];

    if (settings.enableNews) {
        sitemaps.push({
            loc: `${siteUrl}/sitemap/sitemap-news.xml`,
            lastmod: new Date().toISOString()
        });
    }

    if (settings.enablePosts) {
        //todo need to make count operation cheaper with cache or something
        const totalPosts = await sdk.db!.blogs!.count!({status: 'published'});
        const pages = Math.ceil(totalPosts / settings.postsPerPage);

        for (let i = 0; i < pages; i++) {
            sitemaps.push({
                loc: `${siteUrl}/sitemap/sitemap-posts-${i}.xml`,
                lastmod: new Date().toISOString()
            });
        }
    }

    if (settings.enableCategories) {
        //todo need to make count operation cheaper with cache or something
        const totalCategories = await sdk.db!.categories!.count!({});
        const pages = Math.ceil(totalCategories / settings.postsPerPage);

        for (let i = 0; i < pages; i++) {
            sitemaps.push({
                loc: `${siteUrl}/sitemap/sitemap-categories-${i}.xml`,
                lastmod: new Date().toISOString()
            });
        }
    }

    if (settings.enableTags) {
        //todo need to make count operation cheaper with cache or something
        const totalTags = await sdk.db!.tags!.count!({});
        const pages = Math.ceil(totalTags / settings.postsPerPage);

        for (let i = 0; i < pages; i++) {
            sitemaps.push({
                loc: `${siteUrl}/sitemap/sitemap-tags-${i}.xml`,
                lastmod: new Date().toISOString()
            });
        }
    }

    if (settings.enableAuthors) {
        //todo need to make count operation cheaper with cache or something
        const totalAuthors = await sdk.db!.users!.count!({});
        const pages = Math.ceil(totalAuthors / settings.postsPerPage);

        for (let i = 0; i < pages; i++) {
            sitemaps.push({
                loc: `${siteUrl}/sitemap/sitemap-authors-${i}.xml`,
                lastmod: new Date().toISOString()
            });
        }
    }

    return {
        data: {
            sitemapindex: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                sitemap: sitemaps
            }
        } as SitemapIndexData
    };
}

async function generateNewsSitemap(sdk: ServerSDK, siteUrl: string, settings: SitemapSettings) {
    const cutoffDate = Date.now() - (settings.newsMaxAge * 24 * 60 * 60 * 1000);

    // Find the news tag if configured
    let newsTagId = null;
    if (settings.newsTagSlug) {
        const newsTag = await sdk.db.tags.findOne({slug: settings.newsTagSlug});
        if (newsTag) {
            newsTagId = newsTag._id;
        }
    }

    let newsCategoryId = null;
    if (settings.newsCategorySlug) {
        const newsCategory = await sdk.db.categories.findOne({slug: settings.newsCategorySlug});
        if (newsCategory) {
            newsCategoryId = newsCategory._id;
        }
    }

    const baseQuery = {
        status: 'published',
        createdAt: {$gte: cutoffDate}
    };

    const blogMap = new Map();

    if (newsTagId) {
        const tagBlogs = await sdk.db.blogs.find({...baseQuery, tagIds: newsTagId}, {
            projection: {
                _id: 1,
                createdAt: 1,
                title: 1,
                metadata: 1
            }, sort: {createdAt: -1},
            limit: 1000
        });
        tagBlogs.forEach(blog => blogMap.set(blog._id.toString(), blog));
    }

    if (newsCategoryId) {
        const categoryBlogs = await sdk.db.blogs.find({...baseQuery, categoryId: newsCategoryId}, {
            projection: {
                _id: 1,
                createdAt: 1,
                title: 1,
                metadata: 1
            }, sort: {createdAt: -1}, limit: 1000
        });
        categoryBlogs.forEach(blog => blogMap.set(blog._id.toString(), blog));
    }

    if (!newsTagId && !newsCategoryId) {
        const allBlogs = await sdk.db.blogs.find(baseQuery, {
            projection: {
                _id: 1,
                createdAt: 1,
                title: 1,
                metadata: 1
            },
            sort: {createdAt: -1},
            limit: 1000
        });
        allBlogs.forEach(blog => blogMap.set(blog._id.toString(), blog));
    }

    const blogs = Array.from(blogMap.values()).sort((a, b) => b.createdAt - a.createdAt);

    // News sitemap has different format
    const urls = blogs
        .filter(blog => blog.metadata?.['permalink-manager:permalink']?.permalink)
        .map(blog => {
            const permalink = blog.metadata!['permalink-manager:permalink'].permalink;
            return {
                loc: `${siteUrl}${permalink}`,
                'news:news': {
                    'news:publication': {
                        'news:name': settings.newsPublications[0],
                        'news:language': 'en'
                    },
                    'news:publication_date': new Date(blog.createdAt).toISOString(),
                    'news:title': blog.title
                }
            };
        });

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                '@_xmlns:news': 'http://www.google.com/schemas/sitemap-news/0.9',
                url: urls
            }
        } as any // News sitemap has different structure
    };
}

async function generatePostsSitemap(sdk: ServerSDK, siteUrl: string, page: number, settings: SitemapSettings) {
    const skip = page * settings.postsPerPage;

    const blogs = await sdk.db!.blogs!.find!(
        {status: 'published'},
        {sort: {updatedAt: -1}, skip, limit: settings.postsPerPage}
    );

    const urls: SitemapUrl[] = blogs
        .filter(blog => blog.metadata?.['permalink-manager:permalink']?.permalink)
        .map(blog => {
            const permalink = blog.metadata!['permalink-manager:permalink'].permalink;
            return {
                loc: `${siteUrl}${permalink}`,
                lastmod: new Date(blog.updatedAt).toISOString(),
                changefreq: 'weekly' as const,
                priority: 0.8
            };
        });

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: urls
            }
        } as SitemapData
    };
}

async function generateCategoriesSitemap(sdk: ServerSDK, siteUrl: string, page: number) {
    const perPage = 1000;
    const skip = page * perPage;

    const categories = await sdk.db!.categories!.find!(
        {},
        {skip, limit: perPage, projection: {_id: 1, updatedAt: 1, metadata: 1}}
    );

    const urls: SitemapUrl[] = categories
        .filter(category => category.metadata?.['permalink-manager:permalink']?.permalink)
        .map(category => ({
            loc: `${siteUrl}${category.metadata!['permalink-manager:permalink'].permalink}`,
            lastmod: new Date(category.updatedAt || Date.now()).toISOString(),
            changefreq: 'weekly' as const,
            priority: 0.6
        }));

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: urls
            }
        } as SitemapData
    };
}

async function generateTagsSitemap(sdk: ServerSDK, siteUrl: string, page: number) {
    const perPage = 1000;
    const skip = page * perPage;

    const tags = await sdk.db!.tags!.find!(
        {},
        {skip, limit: perPage, projection: {_id: 1, metadata: 1}}
    );

    const urls: SitemapUrl[] = tags
        .filter(tag => tag.metadata?.['permalink-manager:permalink']?.permalink)
        .map(tag => ({
            loc: `${siteUrl}${tag.metadata!['permalink-manager:permalink'].permalink}`,
            lastmod: new Date().toISOString(),
            changefreq: 'monthly' as const,
            priority: 0.5
        }));

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: urls
            }
        } as SitemapData
    };
}

async function generateAuthorsSitemap(sdk: ServerSDK, siteUrl: string, page: number) {
    const perPage = 1000;
    const skip = page * perPage;

    const authors = await sdk.db!.users!.find!(
        {isSystem: false},
        {skip, limit: perPage, projection: {_id: 1, metadata: 1}}
    );

    const urls: SitemapUrl[] = authors
        .filter(author => author.metadata?.['permalink-manager:permalink']?.permalink)
        .map(author => ({
            loc: `${siteUrl}${author.metadata!['permalink-manager:permalink'].permalink}`,
            lastmod: new Date().toISOString(),
            changefreq: 'monthly' as const,
            priority: 0.5
        }));

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: urls
            }
        } as SitemapData
    };
}