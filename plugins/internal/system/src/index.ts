import {definePlugin} from '@supergrowthai/plugin-dev-kit';

export default definePlugin({
    id: 'system',
    name: 'System',
    version: '1.0.0',
    description: 'Core system plugin for internal operations and common settings management',
    author: 'Next-Blog Team',
    url: 'internal://internal-plugins/system/plugin.js',
    client: {
        type: 'url',
        url: 'internal://internal-plugins/system/client.js'
    },
    server: {
        type: 'url',
        url: 'internal://internal-plugins/system/server.js'
    }
});