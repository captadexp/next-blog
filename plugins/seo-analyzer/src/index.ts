import {definePlugin} from "@supergrowthai/plugin-dev-kit";

export default definePlugin({
    id: 'seo-analyzer',
    name: 'SEO Analyzer',
    version: '1.0.0',
    description: 'Real-time SEO analysis and optimization suggestions for blog content',
    author: 'Next-Blog Team',
    slots: ['editor-sidebar'],
    permissions: ['storage:read', 'storage:write', 'blog:read', 'blog:update'],
    config: {
        enableReadability: {
            type: 'boolean',
            default: true,
            description: 'Enable readability score analysis',
        },
        minWordCount: {
            type: 'number',
            default: 300,
            description: 'Minimum recommended word count',
        },
        targetKeywordDensity: {
            type: 'number',
            default: 1.5,
            description: 'Target keyword density percentage',
        },
    },
});
