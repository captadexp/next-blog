import type {SitemapUrl} from '@supergrowthai/plugin-dev-kit';
import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {SeoHookPayload, ServerSDK, SitemapData} from '@supergrowthai/plugin-dev-kit/server';

export default defineServer({
    hooks: {
        'seo:sitemap': async (sdk: ServerSDK, payload: SeoHookPayload & { segments?: string[] }) => {
            sdk.log.info('Generating sitemap', {segments: payload.segments});

            const segments = payload.segments || [];

            // Handle different sitemap types based on segments
            if (segments.length === 0) {
                // Default sitemap - return all content
                return await generateMainSitemap(sdk, payload);
            }

            // Handle specific sitemap requests like /sitemap/posts/1 or /sitemap/categories
            const [type, page] = segments;

            switch (type) {
                case 'posts':
                    return await generatePostsSitemap(sdk, payload, parseInt(page) || 1);

                case 'categories':
                    return await generateCategoriesSitemap(sdk, payload);

                case 'external':
                    // Example: Stream from external source or redirect
                    const externalUrl = await sdk.settings.get('seo-sitemap:external-url');
                    if (externalUrl) {
                        // Redirect to external sitemap (e.g., CDN, gzipped file)
                        return Response.redirect(externalUrl, 302);
                    }
                    break;

                case 'stream':
                    // Example: Stream large sitemap
                    return await streamLargeSitemap(sdk, payload, page);

                default:
                    // Unknown segment, return 404
                    return new Response('Sitemap not found', {status: 404});
            }

            return await generateMainSitemap(sdk, payload);
        }
    }
});

async function generateMainSitemap(sdk: ServerSDK, payload: SeoHookPayload): Promise<{ data: SitemapData }> {
    // Fetch published blogs from database
    const blogs = await sdk.db.blogs.find(
        {status: 'published'},
        {sort: {updatedAt: -1}, limit: 100} // Limit for main sitemap
    );

    // Create sitemap URLs for each blog
    const urls: SitemapUrl[] = [
        // Homepage
        {
            loc: payload.siteUrl,
            changefreq: 'daily',
            priority: 1.0,
            lastmod: new Date().toISOString()
        }
    ];

    // Add blog posts to sitemap
    for (const blog of blogs) {
        urls.push({
            loc: `${payload.siteUrl}/blog/${blog.slug}`,
            lastmod: new Date(blog.updatedAt).toISOString(),
            changefreq: 'weekly',
            priority: 0.8
        });
    }

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: urls
            }
        }
    };
}

async function generatePostsSitemap(sdk: ServerSDK, payload: SeoHookPayload, page: number): Promise<{
    data: SitemapData
}> {
    const perPage = 1000;
    const skip = (page - 1) * perPage;

    const blogs = await sdk.db.blogs.find(
        {status: 'published'},
        {sort: {updatedAt: -1}, skip, limit: perPage}
    );

    const urls: SitemapUrl[] = blogs.map(blog => ({
        loc: `${payload.siteUrl}/blog/${blog.slug}`,
        lastmod: new Date(blog.updatedAt).toISOString(),
        changefreq: 'weekly',
        priority: 0.8
    }));

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: urls
            }
        }
    };
}

async function generateCategoriesSitemap(sdk: ServerSDK, payload: SeoHookPayload): Promise<{
    data: SitemapData
}> {
    const categories = await sdk.db.categories.find({});

    const urls: SitemapUrl[] = categories.map(category => ({
        loc: `${payload.siteUrl}/category/${category.slug}`,
        lastmod: new Date(category.updatedAt || Date.now()).toISOString(),
        changefreq: 'weekly',
        priority: 0.6
    }));

    return {
        data: {
            urlset: {
                '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                url: urls
            }
        }
    };
}

async function streamLargeSitemap(sdk: ServerSDK, payload: SeoHookPayload, page?: string): Promise<Response> {
    // Example: Stream a large sitemap
    const stream = new ReadableStream({
        start(controller) {
            // XML header
            controller.enqueue('<?xml version="1.0" encoding="UTF-8"?>\n');
            controller.enqueue('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');
        },

        async pull(controller) {
            // Stream URLs in chunks
            try {
                const blogs = await sdk.db.blogs.find(
                    {status: 'published'},
                    {sort: {updatedAt: -1}, limit: 100}
                );

                for (const blog of blogs) {
                    const urlXml = `  <url>
    <loc>${payload.siteUrl}/blog/${blog.slug}</loc>
    <lastmod>${new Date(blog.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
                    controller.enqueue(urlXml);
                }

                // Close XML
                controller.enqueue('</urlset>');
                controller.close();
            } catch (error) {
                controller.error(error);
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}