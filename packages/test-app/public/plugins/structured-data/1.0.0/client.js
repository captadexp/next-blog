
(() => {
    const pluginState = {
        settings: {
            publisherName: '',
            publisherLogo: '',
        },
        isLoading: true,
        isSaving: false,
    };

    const fetchSettings = async (sdk) => {
        pluginState.isLoading = true;
        sdk.refresh();
        try {
            const response = await sdk.rpc('getStructuredDataSettings');
            if (response.code === 0) {
                pluginState.settings = { ...pluginState.settings, ...response.payload };
            }
        } finally {
            pluginState.isLoading = false;
            sdk.refresh();
        }
    };

    const saveSettings = async (sdk) => {
        pluginState.isSaving = true;
        sdk.refresh();
        try {
            await sdk.rpc('saveStructuredDataSettings', pluginState.settings);
            sdk.notify('Settings saved successfully!', 'success');
        } catch (err) {
            sdk.notify(`Error saving settings: ${err.message}`, 'error');
        } finally {
            pluginState.isSaving = false;
            sdk.refresh();
        }
    };

    const handleInput = (key, value) => {
        pluginState.settings[key] = value;
    };

    const renderPanel = (sdk) => {
        if (pluginState.isLoading) {
            setTimeout(() => fetchSettings(sdk), 0);
            return ['p', {}, 'Loading settings...'];
        }

        return ['div', { class: 'space-y-4' },
            ['div', {},
                ['label', { class: 'block font-bold mb-1' }, 'Publisher Name'],
                ['input', {
                    type: 'text',
                    class: 'w-full p-2 border rounded',
                    value: pluginState.settings.publisherName,
                    onInput: (e) => handleInput('publisherName', e.target.value),
                }],
                ['p', { class: 'text-sm text-gray-500 mt-1' }, 'The name of your organization or publication.']
            ],
            ['div', {},
                ['label', { class: 'block font-bold mb-1' }, 'Publisher Logo URL'],
                ['input', {
                    type: 'text',
                    class: 'w-full p-2 border rounded',
                    value: pluginState.settings.publisherLogo,
                    onInput: (e) => handleInput('publisherLogo', e.target.value),
                }],
                ['p', { class: 'text-sm text-gray-500 mt-1' }, 'A URL to your organization\'s logo. Should be a PNG, JPG, or SVG.']
            ],
            ['button', {
                class: `btn p-2 rounded text-white ${pluginState.isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} `,
                onClick: () => saveSettings(sdk),
                disabled: pluginState.isSaving,
            }, pluginState.isSaving ? 'Saving...' : 'Save Settings']
        ];
    };

    const editorSidebarWidget = (sdk, prev, context) => {
        return ['div', { class: 'p-4 border rounded-lg shadow-sm bg-white mt-4' },
            ['div', { class: 'flex items-center' },
                ['svg', {
                    xmlns: 'http://www.w3.org/2000/svg',
                    class: 'h-6 w-6 text-green-500 mr-2',
                    fill: 'none',
                    viewBox: '0 0 24 24',
                    stroke: 'currentColor'
                },
                    ['path', {
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        'stroke-width': '2',
                        d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    }]
                ],
                ['div', {},
                    ['h4', { class: 'font-bold' }, 'Structured Data'],
                    ['p', { class: 'text-sm text-gray-600' }, 'SEO-friendly schema will be automatically added to this post.']
                ]
            ]
        ];
    };

    return {
        hooks: {
            'editor-sidebar-widget': editorSidebarWidget,
            'dashboard-panel-structured-data': renderPanel,
        },
        hasPanel: true,
    };
})();
