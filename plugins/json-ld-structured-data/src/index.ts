import {definePlugin} from '@supergrowthai/plugin-dev-kit';

// Plugin manifest - URLs are auto-injected during build
export default definePlugin({
    id: 'json-ld-structured-data',
    name: 'JSON-LD Structured Data',
    version: '1.0.0', // Auto-updated from package.json during build
    description: 'Manage JSON-LD structured data with global settings and per-blog overrides',
    author: 'Next-Blog Team',
    permissions: ['blogs:read', 'blogs:write', 'settings:read', 'settings:write'],
    slots: ['editor-sidebar-widget', 'system:plugin:settings-panel'],
    config: {
        organizationName: {
            type: 'string',
            required: false,
            description: 'Default organization name for schema.org data'
        },
        organizationUrl: {
            type: 'string',
            required: false,
            description: 'Default organization URL for schema.org data'
        },
        defaultLanguage: {
            type: 'string',
            required: false,
            description: 'Default language code for content (e.g., en-US)'
        }
    }
});