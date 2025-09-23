export default {
    id: 'example-plugin',
    name: 'Example Plugin',
    version: '1.0.0',
    description: 'A simple example plugin demonstrating the new build system',
    author: 'SuperGrowth AI',
    slots: ['dashboard-header', 'blog-footer'],
    permissions: ['storage:read', 'storage:write'],
    config: {
        apiKey: {
            type: 'string',
            required: false,
            description: 'Optional API key for external service',
        },
        theme: {
            type: 'select',
            options: ['light', 'dark', 'auto'],
            default: 'auto',
            description: 'Plugin theme preference',
        },
    },
};