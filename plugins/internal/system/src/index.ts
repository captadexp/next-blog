import {definePlugin} from '@supergrowthai/plugin-dev-kit';

// Plugin manifest - URLs are auto-injected during build
export default definePlugin({
    id: 'system',
    name: 'System',
    version: '1.0.0', // Auto-updated from package.json during build
    description: 'Core system plugin for internal operations and common settings management',
    author: 'System',
});