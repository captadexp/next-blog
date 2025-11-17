import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'seo-rss',
    name: 'SEO RSS Feed',
    version: '1.0.0',
    description: 'Generates RSS feed for blog posts',
    author: 'Next-Blog Team',
    permissions: ['blogs:read', 'users:read', 'categories:read']
});