import {definePlugin} from '@supergrowthai/plugin-dev-kit';

// Plugin manifest - URLs are auto-injected during build
export default definePlugin({
    id: 'ai-blog-generator',
    name: 'AI Blog Generator',
    version: '1.0.0', // Auto-updated from package.json during build
    description: 'Automatically generates blog drafts using AI (OpenAI, Grok, or Gemini) with configurable providers',
    author: 'Next-Blog Team',
    permissions: ['blogs:read', 'blogs:write', 'settings:read', 'settings:write'],
    config: {
        aiProvider: {
            type: 'string',
            required: false,
            description: 'AI provider to use: openai, grok, or gemini',
            default: 'openai'
        },
        dailyLimit: {
            type: 'number',
            required: false,
            description: 'Maximum number of blogs to generate per day',
            default: 2
        },
        topics: {
            type: 'object',
            required: false,
            description: 'List of topics to generate content about',
            default: []
        },
        twitterApiKey: {
            type: 'string',
            required: false,
            description: 'Twitter API key for fetching trending topics'
        }
    }
});