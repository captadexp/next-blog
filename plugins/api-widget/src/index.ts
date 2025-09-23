import {definePlugin} from "@supergrowthai/plugin-dev-kit";

export default definePlugin({
    id: 'api-widget',
    name: 'API Widget',
    version: '1.0.0',
    description: 'A widget that demonstrates API usage in Next-Blog plugins',
    author: 'Next-Blog Team',
    slots: ['dashboard', 'sidebar'],
});