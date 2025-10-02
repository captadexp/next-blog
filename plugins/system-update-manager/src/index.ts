import {definePlugin} from '@supergrowthai/plugin-dev-kit';

// Plugin manifest - URLs are auto-injected during build
export default definePlugin({
    id: 'system-update-manager',
    name: 'System Update Manager',
    version: '1.0.0', // Auto-updated from package.json during build
    description: 'A Next-Blog plugin',
    author: 'Next-Blog Team',
    // Optional: Declare required permissions
    // permissions: ['blogs:read', 'blogs:write'],
    // Optional: Declare UI slots this plugin uses
    // slots: ['dashboard-home:before', 'blogs-list:after']
});