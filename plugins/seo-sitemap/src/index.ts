import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'seo-sitemap',
    name: 'SEO Sitemap',
    version: '1.0.0',
    description: 'Generates XML sitemap for blog posts',
    author: 'Next-Blog Team',
    permissions: ['blogs:read']
});