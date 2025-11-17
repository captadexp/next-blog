import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'system-update-manager',
    name: 'System Update Manager',
    version: '1.0.0',
    description: 'A Next-Blog plugin',
    author: 'Next-Blog Team',
    // Optional: Declare required permissions
    // permissions: ['blogs:read', 'blogs:write'],
    // Optional: Declare UI slots this plugin uses
    // slots: ['dashboard-home:before', 'blogs-list:after']
    url: 'internal://internal-plugins/system-update-manager/plugin.js',
    client: {
        type: 'url',
        url: 'internal://internal-plugins/system-update-manager/client.js'
    },
    server: {
        type: 'url',
        url: 'internal://internal-plugins/system-update-manager/server.js'
    }
});