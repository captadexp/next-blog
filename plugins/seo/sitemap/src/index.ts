import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'seo-sitemap',
    name: 'SEO Sitemap',
    version: '1.0.0',
    description: 'Generates XML sitemaps for blog posts, categories, tags, authors, and Google News',
    author: 'Next-Blog Team',
    permissions: ['blogs:read']
    // TODO: Add dependencies when supported: ['permalink-manager']
});