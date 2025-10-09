import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'seo-llms',
    name: 'SEO LLMs.txt',
    version: '1.0.0',
    description: 'Generates LLM-friendly text file with blog summaries',
    author: 'Next-Blog Team',
    permissions: ['blogs:read', 'categories:read']
});