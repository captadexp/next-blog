(function () {
    'use strict';

    // =================================================================
    // === MODULE: State Management
    // =================================================================
    // This state persists between re-renders triggered by sdk.refresh()
    const pluginState = {
        initiated: false,       // Has the initial setup for the current blogId completed?
        isLoading: true,        // Are we fetching initial data?
        isTyping: false,        // Is the user currently typing (debounce is pending)?
        isSaving: false,        // Is a save operation in progress?
        latestSdk: null,        // Always store the latest SDK object here.
        latestContext: null,    // Always store the latest context object here.

        blogId: null,           // The ID of the current blog being edited.
        focusKeyword: '',       // The main keyword for SEO analysis.
        analysisResults: [],    // An array of analysis result objects.
        debouncedRunAnalysis: null, // Holds the debounced analysis function.
        debouncedPersistMetadata: null, // Holds the debounced metadata persistence function.
    };

    // =================================================================
    // === MODULE: Utilities
    // =================================================================
    const utils = {
        /**
         * Safely strips HTML tags from a string to get plain text.
         * @param {string} html The HTML string from the editor.
         * @returns {string} The plain text content.
         */
        stripHtml(html) {
            if (!html) return '';
            // In a browser environment, DOMParser is the safest and most effective way.
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || '';
        },

        /**
         * Counts the words in a plain text string.
         * @param {string} text The plain text to analyze.
         * @returns {number} The total number of words.
         */
        getWordCount(text) {
            if (!text) return 0;
            // Matches sequences of word characters. More reliable than splitting by space.
            return text.trim().match(/\b\w+\b/g)?.length || 0;
        },

        /**
         * Calculates the density of a keyword in the text.
         * @param {string} text The plain text content.
         * @param {string} keyword The keyword to search for.
         * @param {number} wordCount The total word count of the text.
         * @returns {number} The keyword density percentage, fixed to 2 decimal places.
         */
        calculateKeywordDensity(text, keyword, wordCount) {
            if (!text || !keyword || wordCount === 0) return 0;
            const keywordCount = (text.toLowerCase().match(new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g')) || []).length;
            return ((keywordCount / wordCount) * 100);
        },
    };

    // =================================================================
    // === MODULE: SEO Analysis Checks
    // =================================================================
    // Each check is a self-contained function that returns a result object.
    // This makes the system highly extensible.
    const CHECKS = {
        /**
         * Checks if the focus keyword is present in the post title.
         * @param {{ title: string, keyword: string }} data
         * @returns {{label: string, status: string, advice: string}}
         */
        keywordInTitle: (data) => {
            const result = {label: "Keyword in Title", status: 'bad', advice: 'Add your keyword to the post title.'};
            if (!data.keyword) {
                result.advice = 'Set a focus keyword to check this.';
                return result;
            }
            if (data.title.toLowerCase().includes(data.keyword)) {
                result.status = 'good';
                result.advice = 'Great job! The keyword is in the title.';
            }
            return result;
        },

        /**
         * Checks if the focus keyword is in the first paragraph.
         * We approximate the first paragraph as the first 10% of the content.
         * @param {{ text: string, keyword: string }} data
         * @returns {{label: string, status: string, advice: string}}
         */
        keywordInFirstParagraph: (data) => {
            const result = {
                label: "Keyword in First Paragraph",
                status: 'bad',
                advice: 'Add your keyword near the beginning of your content.'
            };
            if (!data.keyword) {
                result.advice = 'Set a focus keyword to check this.';
                return result;
            }
            const first10Percent = data.text.substring(0, Math.floor(data.text.length * 0.1)).toLowerCase();
            if (first10Percent.includes(data.keyword)) {
                result.status = 'good';
                result.advice = 'Well done! The keyword appears early on.';
            }
            return result;
        },

        /**
         * Checks the density of the keyword throughout the content.
         * @param {{ text: string, keyword: string, wordCount: number }} data
         * @returns {{label: string, status: string, advice: string}}
         */
        keywordDensity: (data) => {
            const result = {label: "Keyword Density", status: 'bad', advice: 'Set a focus keyword to check this.'};
            if (!data.keyword) return result;

            const density = utils.calculateKeywordDensity(data.text, data.keyword, data.wordCount);
            const densityStr = density.toFixed(2);

            if (density > 0.5 && density < 2.5) {
                result.status = 'good';
                result.advice = `Density is ${densityStr}%. Perfect!`;
            } else if (density > 0) {
                result.status = 'ok';
                result.advice = `Density is ${densityStr}%. Aim for a value between 0.5% and 2.5%.`;
            } else {
                result.advice = `Current density is 0%. Add the keyword a few times in the content.`;
            }
            return result;
        },

        /**
         * Checks the total word count of the content.
         * @param {{ wordCount: number }} data
         * @returns {{label: string, status: string, advice: string}}
         */
        contentLength: (data) => {
            const {wordCount} = data;
            const result = {
                label: "Content Length",
                status: 'bad',
                advice: `Your content is ${wordCount} words. Aim for at least 300 words.`
            };
            if (wordCount >= 600) {
                result.status = 'good';
                result.advice = `Content is ${wordCount} words long. Fantastic!`;
            } else if (wordCount >= 300) {
                result.status = 'ok';
                result.advice = `Content is ${wordCount} words long. This is a good length.`;
            }
            return result;
        },

        /**
         * Asynchronously checks the readability score via an API.
         * @param {{ text: string }} data
         * @param {object} sdk The SDK object to make API calls.
         * @returns {Promise<{label: string, status: string, advice: string}>}
         */
        readability: async (data, sdk) => {
            const result = {label: "Readability Score", status: 'loading', advice: 'Analyzing...'};
            if (!data.text) {
                return {...result, status: 'bad', advice: 'Not enough content to analyze readability.'};
            }
            try {
                // This API call is a placeholder for your actual API
                // const response = await sdk.apis.getFleschScore({ text: data.text });
                // const score = response.score;
                // if (score >= 60) {
                //     result.status = 'good';
                //     result.advice = `Score is ${score}. Easy to read!`;
                // } else if (score >= 30) {
                //     result.status = 'ok';
                //     result.advice = `Score is ${score}. A bit difficult to read.`;
                // } else {
                //     result.status = 'bad';
                //     result.advice = `Score is ${score}. Very difficult to read.`;
                // }

                // Mocking the result as the API might not exist.
                await new Promise(resolve => setTimeout(resolve, 1000)); // simulate network delay
                result.status = 'ok';
                result.advice = 'Readability check is currently unavailable.';
            } catch (err) {
                console.error("Readability check failed:", err);
                result.status = 'bad';
                result.advice = 'Could not fetch readability score.';
            }
            return result;
        },

        keywordLength: (data) => {
            const result = {
                label: "Focus Keyword Length",
                status: 'bad', // Default to bad
                advice: 'Your focus keyword is too short. Aim for at least 3 characters.'
            };

            if (!data.keyword) {
                result.advice = 'Set a focus keyword to check its quality.';
                return result;
            }

            // We consider keywords of 3 or more characters to be good.
            if (data.keyword.length >= 3) {
                result.status = 'good';
                result.advice = 'The keyword has a suitable length.';
            }
            // Optional: You could add an 'ok' status for 2-character keywords if you want.
            // else if (data.keyword.length === 2) {
            //     result.status = 'ok';
            //     result.advice = 'The keyword is very short. Longer, more specific keywords often perform better.';
            // }

            return result;
        },
    };


    // =================================================================
    // === MODULE: Core Logic & Lifecycle
    // =================================================================

    /**
     * The main analysis runner. It orchestrates all checks.
     */
    async function runAnalysis() {
        pluginState.isTyping = false;
        const {latestSdk: sdk, latestContext: context, focusKeyword} = pluginState;

        if (!sdk || !context) return;

        console.log("Running analysis...");
        const htmlContent = context.editor.getContent();
        const textContent = utils.stripHtml(htmlContent);
        const title = context.editor.getTitle();
        const wordCount = utils.getWordCount(textContent);
        const keyword = focusKeyword.trim().toLowerCase();

        const analysisData = {text: textContent, title, keyword, wordCount, html: htmlContent};

        // --- Run Synchronous Checks ---
        const syncResults = [
            CHECKS.keywordLength(analysisData),
            CHECKS.contentLength(analysisData),
            CHECKS.keywordInTitle(analysisData),
            CHECKS.keywordInFirstParagraph(analysisData),
            CHECKS.keywordDensity(analysisData),
        ];

        // --- Prepare for Asynchronous Checks ---
        const asyncChecks = [
            CHECKS.readability(analysisData, sdk),
        ];

        // Update UI immediately with sync results and loading state for async ones
        pluginState.analysisResults = [...syncResults, ...asyncChecks.map(() => ({
            label: "Readability Score", status: 'loading', advice: 'Analyzing...'
        }))];
        sdk.refresh();

        // --- Await Asynchronous Checks ---
        const asyncResults = await Promise.all(asyncChecks);

        // --- Combine and Finalize ---
        pluginState.analysisResults = [...syncResults, ...asyncResults];
        sdk.refresh();
    }

    /**
     * Fetches metadata and sets up editor event listeners.
     */
    async function initializePlugin(sdk, context) {
        // Reset if the blog context has changed
        if (pluginState.blogId !== context.blogId) {
            pluginState.blogId = context.blogId;
            pluginState.initiated = false;
            pluginState.isLoading = true;
            pluginState.analysisResults = [];
        }

        // Prevent re-initialization
        if (pluginState.initiated) return;

        try {
            console.log("Initializing SEO Analyzer for blog:", context.blogId);

            // Fetch initial metadata
            const blog = await sdk.apis.getBlog(context.blogId).then(a => a.payload);
            const seoMetadata = blog.metadata?.seoAnalyzer || {};
            pluginState.focusKeyword = seoMetadata.focusKeyword || '';

            // Set up debounces
            pluginState.debouncedRunAnalysis = sdk.utils.debounce(runAnalysis, 1500);

            pluginState.debouncedPersistMetadata = sdk.utils.debounce(persistMetadata, 1500);

            // Add the event listener to the editor
            const editor = context?.editor?.editorRef?.current;
            if (editor) {
                editor.model.document.on('change:data', () => {
                    pluginState.isTyping = true;
                    sdk.refresh(); // Show typing indicator immediately
                    pluginState.debouncedRunAnalysis();
                });
            } else {
                throw new Error("Editor reference not found.");
            }

            pluginState.isLoading = false;
            pluginState.initiated = true;

            // Run the first analysis
            await runAnalysis();

        } catch (err) {
            console.error("Failed to initialize SEO Analyzer:", err);
            pluginState.analysisResults = [{label: "Initialization Failed", status: 'bad', advice: err.message}];
            pluginState.isLoading = false;
            pluginState.initiated = true; // Mark as initiated to prevent retries
            sdk.refresh();
        }
    }

    /**
     * Handles changes to the focus keyword input field.
     */
    async function handleKeywordChange(newKeyword, sdk, context) {
        pluginState.focusKeyword = newKeyword;
        sdk.refresh(); // Update the UI immediately to show the new keyword in the input

        // Persist the change and re-run analysis
        pluginState.debouncedRunAnalysis();
        pluginState.debouncedPersistMetadata(sdk, context);
    }

    /**
     * A configurable function to determine if metadata should be saved.
     * You can add custom logic here, for example, to prevent saving if the keyword is empty.
     * @param {object} seoAnalyzerMetadata The data that is about to be saved.
     * @returns {boolean} Return true to proceed with saving, false to cancel.
     */
    async function shouldSave(seoAnalyzerMetadata) {
        if (seoAnalyzerMetadata.focusKeyword && seoAnalyzerMetadata.focusKeyword.trim() === '') {
            // return false;
        }

        // Default behavior: always save.
        return true;
    }

    /**
     * Persists the plugin's metadata to the backend.
     * This function calls the user-configurable `shouldSave` method before proceeding.
     */
    async function persistMetadata(sdk, context) {
        if (pluginState.isSaving) return;

        pluginState.isSaving = true;
        sdk.refresh(); // Optional: show a saving indicator

        const seoAnalyzerMetadata = {
            focusKeyword: pluginState.focusKeyword,
            // You can add more metadata here in the future
            // lastAnalyzed: new Date().toISOString(),
        };

        // Call the configurable check
        if (shouldSave(seoAnalyzerMetadata)) {
            try {
                console.log("Saving metadata:", seoAnalyzerMetadata);
                await sdk.apis.updateBlogMetadata(context.blogId, {seoAnalyzer: seoAnalyzerMetadata});
            } catch (err) {
                console.error("Failed to save metadata:", err);
                // Optionally show an error to the user in the UI
            }
        } else {
            console.log("`shouldSave` returned false. Skipping persistence.");
        }

        pluginState.isSaving = false;
        sdk.refresh();
    }

    // =================================================================
    // === MODULE: UI Components
    // =================================================================

    function renderChecklistItem(item) {
        const colorMap = {
            good: 'bg-green-500',
            ok: 'bg-yellow-500',
            bad: 'bg-red-500',
            loading: 'bg-blue-500 animate-pulse',
        };
        return [
            'div', {class: 'flex items-start my-2 p-2 border-b border-gray-100 last:border-b-0'},
            ['div', {class: `w-3 h-3 rounded-full mr-3 mt-1 flex-shrink-0 ${colorMap[item.status]}`}],
            ['div', {class: 'flex-1'},
                ['p', {class: 'font-semibold text-sm'}, item.label],
                ['p', {class: 'text-xs text-gray-600'}, item.advice]
            ]
        ];
    }

    function renderTypingIndicator() {
        return ['div', {class: 'flex items-center text-xs text-gray-500 p-2 italic'},
            ['div', {class: 'w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2'}],
            'Analyzing as you type...'
        ];
    }

    function renderLoadingState() {
        return ['div', {class: 'p-4 text-center text-gray-500'}, 'Loading SEO Analyzer...'];
    }

    // =================================================================
    // === MODULE: Main Plugin Hook
    // =================================================================

    function editorSidebarWidget(sdk, prev, context) {
        // Always keep the latest SDK and context available to other functions
        pluginState.latestSdk = sdk;
        pluginState.latestContext = context;

        // Initialize the plugin if it hasn't been, or if the blog context has changed
        initializePlugin(sdk, context);

        if (pluginState.isLoading) {
            return renderLoadingState();
        }

        return [
            'div', {class: 'p-4 border border-gray-200 rounded-lg shadow-sm bg-white'},
            // --- Focus Keyword Input ---
            ['div', {class: 'mb-4'},
                ['label', {for: 'focus-keyword', class: 'block font-bold text-md mb-1'}, 'Focus Keyword'],
                ['input', {
                    id: 'focus-keyword',
                    type: 'text',
                    value: pluginState.focusKeyword,
                    placeholder: 'Enter your main keyword',
                    class: 'w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition',
                    // Use onInput for real-time updates
                    onInput: (sdk, context, value) => handleKeywordChange(value, sdk, context),
                }],
            ],

            // --- Analysis Results ---
            ['div', {},
                ['h3', {class: 'font-bold text-md mb-2 border-t pt-4'}, 'Analysis'],
                ...(pluginState.analysisResults.length > 0
                        ? pluginState.analysisResults.map(renderChecklistItem)
                        : [['p', {class: 'text-sm text-gray-500'}, 'Start typing or set a keyword to see analysis.']]
                ),
                // Show typing indicator when a debounced analysis is pending
                ...(pluginState.isTyping ? [renderTypingIndicator()] : []),
            ]
        ];
    }

    // =================================================================
    // === PLUGIN DEFINITION
    // =================================================================
    const plugin = {
        name: "Content SEO Analyzer",
        version: "2.0.0",
        description: "A robust, modular plugin to analyze content SEO and readability in real-time.",

        hooks: {
            'editor-sidebar-widget': editorSidebarWidget,
        }
    };

    return plugin;
})();