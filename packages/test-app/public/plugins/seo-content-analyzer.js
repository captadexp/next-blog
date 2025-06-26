(function () {
    // === MODULE-LEVEL STATE ===
    // This state persists between re-renders triggered by sdk.refresh()
    // but is reset if the user navigates away and comes back.
    const pluginState = {
        initiated: false, // Have we run the initial setup?
        isLoading: true, // Are we fetching initial data?
        focusKeyword: '',
        analysisResults: null,
    };

    // === UTILITY FUNCTIONS ===

    function getWordCount(text) {
        if (!text) return 0;
        // Simple regex to count words
        return text.match(/\b(\w+)\b/g)?.length || 0;
    }

    function calculateKeywordDensity(text, keyword) {
        if (!text || !keyword) return 0;
        const keywordCount = (text.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
        const totalWords = getWordCount(text);
        if (totalWords === 0) return 0;
        return ((keywordCount / totalWords) * 100).toFixed(2);
    }

    // === CORE LOGIC & LIFECYCLE ===

    /**
     * The main analysis function. It runs all checks and updates the state.
     */
    async function runAnalysis(sdk, context) {
        console.log("Running analysis...");
        const content = sdk.editor.getContent();
        const title = sdk.editor.getTitle();
        const keyword = pluginState.focusKeyword.trim().toLowerCase();

        const wordCount = getWordCount(content);

        // --- Start building the results object ---
        const results = {
            // Keyword Analysis
            keywordInTitle: {label: "Keyword in Title", status: 'bad', advice: 'Add your keyword to the post title.'},
            keywordInFirstP: {
                label: "Keyword in First Paragraph",
                status: 'bad',
                advice: 'Add your keyword near the beginning of your content.'
            },
            keywordDensity: {
                label: "Keyword Density",
                status: 'bad',
                advice: `Current density is 0%. Aim for 0.5% to 2%.`
            },
            // Content Analysis
            contentLength: {
                label: "Content Length",
                status: 'bad',
                advice: `Your content is ${wordCount} words. Aim for 300+ words.`
            },
            readability: {label: "Readability Score", status: 'loading', advice: 'Analyzing...'},
        };

        // --- Run Synchronous Checks ---
        if (keyword) {
            // Keyword in Title
            if (title.toLowerCase().includes(keyword)) {
                results.keywordInTitle = {status: 'good', label: "Keyword in Title", advice: "Great job!"};
            }
            // Keyword in First Paragraph (first 10% of content)
            const firstParagraph = content.substring(0, content.length * 0.1).toLowerCase();
            if (firstParagraph.includes(keyword)) {
                results.keywordInFirstP = {status: 'good', label: "Keyword in First Paragraph", advice: "Well done!"};
            }
            // Keyword Density
            const density = calculateKeywordDensity(content, keyword);
            if (density > 0.5 && density < 2.5) {
                results.keywordDensity = {
                    status: 'good',
                    label: "Keyword Density",
                    advice: `Density is ${density}%. Perfect!`
                };
            } else if (density > 0) {
                results.keywordDensity = {
                    status: 'ok',
                    label: "Keyword Density",
                    advice: `Density is ${density}%. It's a bit low or high.`
                };
            } else {
                results.keywordDensity.advice = `Current density is 0%. Add the keyword a few times.`
            }
        } else {
            results.keywordInTitle.advice = 'Set a focus keyword to check this.';
            results.keywordInFirstP.advice = 'Set a focus keyword to check this.';
            results.keywordDensity.advice = 'Set a focus keyword to check this.';
        }

        // Content Length
        if (wordCount >= 600) {
            results.contentLength = {
                status: 'good',
                label: "Content Length",
                advice: `Content is ${wordCount} words long. Fantastic!`
            };
        } else if (wordCount >= 300) {
            results.contentLength = {
                status: 'ok',
                label: "Content Length",
                advice: `Content is ${wordCount} words long. Good.`
            };
        }

        pluginState.analysisResults = results;
        sdk.refresh(); // Refresh immediately with sync results.

        // --- Run Asynchronous Checks (API calls) ---
        try {
            const response = await sdk.apis.getFleschScore({text: content});
            if (response.score >= 60) {
                results.readability = {
                    status: 'good',
                    label: 'Readability Score',
                    advice: `Score is ${response.score}. Easy to read!`
                };
            } else if (response.score >= 30) {
                results.readability = {
                    status: 'ok',
                    label: 'Readability Score',
                    advice: `Score is ${response.score}. A bit difficult to read.`
                };
            } else {
                results.readability = {
                    status: 'bad',
                    label: 'Readability Score',
                    advice: `Score is ${response.score}. Very difficult to read.`
                };
            }
        } catch (err) {
            results.readability = {
                status: 'bad',
                label: 'Readability Score',
                advice: `Error fetching score: ${err.message}`
            };
        }

        pluginState.analysisResults = results;
        sdk.refresh(); // Refresh again with the final async result.
    }

    /**
     * Fetches the saved focus keyword and sets up the event listener.
     */
    async function initializePlugin(sdk, context) {
        try {

            pluginState.debouncedRunAnalysis = sdk.utils.debounce(runAnalysis, 2000);
            // 1. Fetch saved data for this blog post
            const metadata = await sdk.apis.getBlog(context.blogId).then(a => a.payload);
            if (metadata && metadata.seoAnalyzer) {
                pluginState.focusKeyword = metadata.seoAnalyzer.focusKeyword || '';
            }

            // 2. Run the first analysis
            await runAnalysis(sdk, context);

            // 3. Set up the listener for future changes, calling the debounced function
            sdk.editor.editorRef.current?.on('change', () => pluginState.debouncedRunAnalysis(sdk, context));

        } catch (err) {
            console.error("Failed to initialize SEO Analyzer:", err);
            pluginState.analysisResults = {error: {label: "Initialization Failed", status: 'bad', advice: err.message}};
        } finally {
            pluginState.isLoading = false;
            pluginState.initiated = true;
            sdk.refresh();
        }
    }

    /**
     * Handles changes to the focus keyword input field.
     */
    async function handleKeywordChange(newKeyword, sdk, context) {
        pluginState.focusKeyword = newKeyword;
        sdk.refresh(); // Update the UI immediately to show the new keyword in the input

        // Save the keyword to the backend
        await sdk.apis.updateBlogMetadata({
            blogId: context.blogId,
            data: {seoAnalyzer: {focusKeyword: newKeyword}}
        });

        // Re-run the analysis with the new keyword
        await runAnalysis(sdk, context);
    }

    // === UI RENDERING ===

    /**
     * A helper component to render a single analysis checklist item.
     */
    function renderChecklistItem(item) {
        const colorMap = {
            good: 'bg-green-500',
            ok: 'bg-yellow-500',
            bad: 'bg-red-500',
            loading: 'bg-blue-500 animate-pulse',
        };
        return [
            'div', {class: 'flex items-start my-2 p-2 border-b border-gray-100'},
            ['div', {class: `w-3 h-3 rounded-full mr-3 mt-1 flex-shrink-0 ${colorMap[item.status]}`}],
            ['div', {},
                ['p', {class: 'font-semibold text-sm'}, item.label],
                ['p', {class: 'text-xs text-gray-600'}, item.advice]
            ]
        ];
    }

    /**
     * The main function for the 'editor-sidebar-widget' hook.
     */
    function editorSidebarWidget(sdk, prev, context) {
        // Run initialization logic only once.
        if (!pluginState.initiated) {
            // Use setTimeout to avoid synchronous state update loops during initial render.
            setTimeout(() => initializePlugin(sdk, context), 0);
            return ['div', {class: 'p-4'}, 'Initializing SEO Analyzer...'];
        }

        if (pluginState.isLoading) {
            return ['div', {class: 'p-4'}, 'Loading analysis...'];
        }

        return [
            'div', {class: 'p-4 border border-gray-200 rounded-lg shadow-sm'},
            // --- Focus Keyword Input ---
            ['div', {class: 'mb-4'},
                ['label', {for: 'focus-keyword', class: 'block font-bold text-md mb-1'}, 'Focus Keyword'],
                ['input', {
                    id: 'focus-keyword',
                    type: 'text',
                    value: pluginState.focusKeyword,
                    placeholder: 'Enter your main keyword',
                    class: 'w-full p-2 border rounded',
                    onInput: (e) => handleKeywordChange(e.target.value, sdk, context),
                }],
            ],

            // --- Analysis Results ---
            ['div', {},
                ['h3', {class: 'font-bold text-md mb-2 border-t pt-4'}, 'Analysis'],
                ...(pluginState.analysisResults
                        ? Object.values(pluginState.analysisResults).map(renderChecklistItem)
                        : [['p', {}, 'No analysis results yet.']]
                )
            ]
        ];
    }

    // === PLUGIN DEFINITION ===
    return ({
        name: "Content SEO Analyzer",
        version: "1.0.0",
        description: "A Yoast-style plugin to analyze content SEO and readability in real-time.",
        hooks: {
            'editor-sidebar-widget': editorSidebarWidget,
        },

        postInstall: async function (db, pluginId) {
            console.log("Installing Content SEO Analyzer...");
            await db.pluginHookMappings.create({
                pluginId: pluginId,
                hookName: 'editor-sidebar-widget',
                priority: 10
            });
            console.log("Content SEO Analyzer installed successfully!");
            return true;
        },

        onDelete: async function (db, pluginId) {
            console.log("Uninstalling Content SEO Analyzer...");
            // In a real system, you might want to clean up the metadata from blogs.
            // For now, we just unregister the hook.
            await db.pluginHookMappings.delete({
                where: {pluginId: pluginId, hookName: 'editor-sidebar-widget'}
            });
            console.log("Content SEO Analyzer uninstalled.");
        }
    });
})();