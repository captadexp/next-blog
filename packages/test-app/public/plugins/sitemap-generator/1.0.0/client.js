
(() => {
    const pluginState = {
        isLoading: true,
        isGenerating: false,
        lastGenerated: null,
        error: null,
    };

    const fetchStatus = async (sdk) => {
        pluginState.isLoading = true;
        sdk.refresh();
        try {
            const response = await sdk.rpc("getSitemapStatus");
            if (response.code === 0) {
                pluginState.lastGenerated = response.payload.lastGenerated;
            } else {
                throw new Error(response.message);
            }
        } catch (err) {
            pluginState.error = `Failed to get status: ${err.message}`;
        } finally {
            pluginState.isLoading = false;
            sdk.refresh();
        }
    };

    const startGeneration = async (sdk) => {
        pluginState.isGenerating = true;
        pluginState.error = null;
        sdk.refresh();
        try {
            const response = await sdk.rpc("generateSitemap");
            if (response.code !== 0) {
                throw new Error(response.message);
            }
            pluginState.lastGenerated = response.payload.generatedAt;
            sdk.notify('Sitemap generated successfully!', 'success');
        } catch (err) {
            pluginState.error = `Generation failed: ${err.message}`;
            sdk.notify(pluginState.error, 'error');
        } finally {
            pluginState.isGenerating = false;
            sdk.refresh();
        }
    };

    const renderPanel = (sdk) => {
        // Initial fetch
        if (pluginState.lastGenerated === null && !pluginState.isLoading && !pluginState.error) {
            setTimeout(() => fetchStatus(sdk), 0);
        }

        return ['div', { class: 'p-4 border rounded-lg shadow-sm bg-white' },
            ['div', { class: 'flex justify-between items-center mb-3' },
                ['h3', { class: 'font-bold text-lg' }, 'Sitemap Controls'],
                ['button', {
                    class: `btn p-2 rounded text-white ${pluginState.isGenerating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`,
                    onClick: () => startGeneration(sdk),
                    disabled: pluginState.isGenerating,
                }, pluginState.isGenerating ? 'Generating...' : 'Generate Sitemap']
            ],
            pluginState.isLoading ? ['p', {}, 'Loading status...'] :
            pluginState.error ? ['div', { class: 'text-red-500 p-3 bg-red-50 rounded' }, pluginState.error] :
            ['div', { class: 'text-center p-4 border-t' },
                pluginState.lastGenerated ?
                    ['p', {}, `Sitemap last generated: ${new Date(pluginState.lastGenerated).toLocaleString()}`] :
                    ['p', { class: 'text-gray-500' }, 'Sitemap has not been generated yet.'],
                ['p', { class: 'mt-2' },
                    ['a', {
                        href: '/sitemap.xml',
                        target: '_blank',
                        class: 'text-blue-600 hover:underline'
                    }, 'View Sitemap']
                ]
            ]
        ];
    }

    return {
        hooks: {
            "dashboard-panel-sitemap-generator": renderPanel
        },
        hasPanel: true,
    };
})();
