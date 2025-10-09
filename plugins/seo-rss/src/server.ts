import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/types/server';
import type {RssData, RssItem, SeoHookPayloadWithDb} from '@supergrowthai/types';
import {contentObjectToPlainText} from "@supergrowthai/plugin-dev-kit/content";

export default defineServer({
    hooks: {
        'seo:rss': async (sdk: ServerSDK, payload: SeoHookPayloadWithDb): Promise<{ data: RssData }> => {
            sdk.log.info('Generating RSS feed');

            // Get site settings from cache or defaults
            const siteTitle = await sdk.settings.get('seo-rss:site-title') || 'My Blog';
            const siteDescription = await sdk.settings.get('seo-rss:site-description') || 'Latest posts from our blog';

            // Fetch recent published blogs
            const blogs = await payload.db.blogs.find(
                {status: 'published'},
                {sort: {createdAt: -1}, limit: 20}
            );

            // Create RSS items from blogs
            const items: RssItem[] = [];

            for (const blog of blogs) {
                // Get author information
                const author = await payload.db.users.findById(blog.userId);

                // Get category information
                const category = await payload.db.categories.findById(blog.categoryId);

                // Strip HTML/Markdown from content for description
                const cleanContent = contentObjectToPlainText(blog.content)
                    .replace(/<[^>]*>/g, '')
                    .replace(/[#*`]/g, '')
                    .substring(0, 300);

                items.push({
                    title: blog.title,
                    link: `${payload.siteUrl}/blog/${blog.slug}`,
                    description: blog.excerpt || cleanContent,
                    author: author?.email || author?.name || 'Anonymous',
                    category: category?.name,
                    pubDate: new Date(blog.createdAt).toUTCString(),
                    guid: {
                        '@_isPermaLink': true,
                        '#text': `${payload.siteUrl}/blog/${blog.slug}`
                    }
                });
            }

            // Update last build time in settings
            const lastBuildDate = new Date().toUTCString();
            await sdk.settings.set('seo-rss:last-build', lastBuildDate);

            return {
                data: {
                    rss: {
                        '@_version': '2.0',
                        '@_xmlns:atom': 'http://www.w3.org/2005/Atom',
                        channel: {
                            title: siteTitle,
                            link: payload.siteUrl,
                            description: siteDescription,
                            language: 'en-US',
                            lastBuildDate,
                            generator: 'Next-Blog RSS Plugin',
                            docs: 'https://www.rssboard.org/rss-specification',
                            ttl: 60,
                            item: items
                        }
                    }
                }
            };
        }
    }
});