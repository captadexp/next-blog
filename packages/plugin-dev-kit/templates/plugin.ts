import {definePlugin} from '@supergrowthai/plugin-dev-kit';

// Plugin manifest - URLs are auto-injected during build
export default definePlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0', // Auto-updated from package.json during build
    description: 'A Next-Blog plugin',
    author: 'Your Name',
    // Optional: Declare required permissions
    // permissions: ['blogs:read', 'blogs:write'],
    // Optional: Declare UI slots this plugin uses
    // slots: ['dashboard-home:before', 'blogs-list:after']
});