(() => {
    const pluginState = {
        isLoading: false,
        isScanning: false,
        report: null,
        error: null,
    };

    const fetchInitialReport = async (sdk) => {
        // Prevent multiple initial fetches
        if (pluginState.isLoading || pluginState.report !== null) return;

        pluginState.isLoading = true;
        sdk.refresh();
        try {
            // Call the hook without the parameter that might trigger a full scan
            const response = await sdk.callHook("scan-broken-links", {});
            if (response.code === 0) {
                const {code, message, payload} = response.payload;
                pluginState.report = payload;
            } else {
                throw new Error(response.message);
            }
        } catch (err) {
            pluginState.error = `Failed to fetch initial report: ${err.message}`;
        } finally {
            pluginState.isLoading = false;
            sdk.refresh();
        }
    };

    const startScan = async (sdk) => {
        if (pluginState.isScanning) return;

        pluginState.isScanning = true;
        pluginState.isLoading = true;
        pluginState.error = null;
        sdk.refresh();

        try {
            const response = await sdk.callHook("scan-broken-links", {start_scan: true});

            if (response.code === 0) {
                const {code, message, payload} = response.payload;
                pluginState.report = payload;
                sdk.notify('Scan complete!', 'success');
            } else {
                throw new Error(response.message);
            }

        } catch (err) {
            pluginState.error = `Scan failed: ${err.message}`;
            sdk.notify(pluginState.error, 'error');
        } finally {
            pluginState.isScanning = false;
            // FIX: Set isLoading to false here, as this function now completes the entire process.
            pluginState.isLoading = false;
            sdk.refresh();
        }
    };

    const renderLink = (linkData) => {
        return ['li', {class: 'mb-4 p-3 border rounded bg-gray-50'},
            ['div', {class: 'font-semibold text-red-600 break-all'}, `URL: ${linkData.url}`],
            ['div', {class: 'text-sm text-gray-700'}, `Status: ${linkData.status}`],
            ['div', {class: 'mt-2'},
                ['strong', {class: 'text-sm'}, 'Found in:'],
                ['ul', {class: 'list-disc list-inside pl-2 mt-1'},
                    ...linkData.posts.map(post =>
                        ['li', {},
                            ['a', {
                                href: `/api/next-blog/dashboard/blogs/${post.postId}`,
                                class: 'text-blue-600 hover:underline'
                            }, post.postTitle]
                        ]
                    )
                ]
            ]
        ];
    };

    const renderPanel = (sdk) => {
        setTimeout(() => fetchInitialReport(sdk), 0);

        return ['div', {class: 'p-4 border rounded-lg shadow-sm bg-white'},
            ['div', {class: 'flex justify-between items-center mb-3'},
                ['h3', {class: 'font-bold text-lg'}, 'Broken Link Checker'],
                ['button', {
                    class: `btn p-2 rounded text-white ${pluginState.isScanning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`,
                    // FIX: Ensure the onClick handler calls the corrected startScan function
                    onClick: () => startScan(sdk),
                    disabled: pluginState.isScanning,
                }, pluginState.isScanning ? 'Scanning...' : 'Re-Scan All Posts']
            ],
            pluginState.isLoading && !pluginState.isScanning ? ['p', {}, 'Loading report...'] :
                pluginState.isScanning ? ['p', {}, 'Scanning in progress...'] :
                    pluginState.error ? ['div', {class: 'text-red-500 p-3 bg-red-50 rounded'}, pluginState.error] :
                        pluginState.report && pluginState.report.length > 0 ?
                            ['ul', {}, ...pluginState.report.map(renderLink)] :
                            ['div', {class: 'text-center p-4 border-t'},
                                ['p', {class: 'text-green-600 font-semibold'}, 'No broken links found! 🎉'],
                                ['p', {class: 'text-sm text-gray-500 mt-1'}, 'Click the button above to run a new scan.']
                            ]
        ];
    };

    return {
        hooks: {
            "dashboard-panel-broken-link-checker": renderPanel
        },
        hasPanel: true,
    };
})();