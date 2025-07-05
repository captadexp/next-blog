(() => {
    'use strict';

    // This state persists between re-renders triggered by sdk.refresh()
    const pluginState = {
        initiated: false,
        isLoading: true,
        isTyping: false,
        isSaving: false,
        latestSdk: null,
        latestContext: null,
        blogId: null,
        focusKeyword: '',
        analysisResults: [],
        debouncedRunAnalysis: null,
        debouncedPersistMetadata: null,
    };

    const utils = {
        stripHtml(html) {
            if (!html) return '';
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || '';
        },
        getWordCount(text) {
            if (!text) return 0;
            return text.trim().match(/\b\w+\b/g)?.length || 0;
        },
        calculateKeywordDensity(text, keyword, wordCount) {
            if (!text || !keyword || wordCount === 0) return 0;
            const keywordCount = (text.toLowerCase().match(new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g')) || []).length;
            return ((keywordCount / wordCount) * 100);
        },
    };

    const CHECKS = {
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
        readability: async (data, sdk) => {
            const result = {label: "Readability Score", status: 'loading', advice: 'Analyzing...'};
            if (!data.text) {
                return {...result, status: 'bad', advice: 'Not enough content to analyze readability.'};
            }
            try {
                const response = await sdk.callHook("get-flesch-score", {content: data.text});
                if (response.code !== 0) throw new Error(response.message);

                const {code, message, payload} = response.payload;

                const score = payload.score;
                if (score >= 60) {
                    result.status = 'good';
                    result.advice = `Score is ${score}. Easy to read!`;
                } else if (score >= 30) {
                    result.status = 'ok';
                    result.advice = `Score is ${score}. A bit difficult to read.`;
                } else {
                    result.status = 'bad';
                    result.advice = `Score is ${score}. Very difficult to read.`;
                }
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
                status: 'bad',
                advice: 'Your focus keyword is too short. Aim for at least 3 characters.'
            };
            if (!data.keyword) {
                result.advice = 'Set a focus keyword to check its quality.';
                return result;
            }
            if (data.keyword.length >= 3) {
                result.status = 'good';
                result.advice = 'The keyword has a suitable length.';
            }
            return result;
        },
    };

    async function runAnalysis() {
        pluginState.isTyping = false;
        const {latestSdk: sdk, latestContext: context, focusKeyword} = pluginState;

        if (!sdk || !context) return;

        const htmlContent = context.editor.getContent();
        const textContent = utils.stripHtml(htmlContent);
        const title = context.editor.getTitle();
        const wordCount = utils.getWordCount(textContent);
        const keyword = focusKeyword.trim().toLowerCase();

        const analysisData = {text: textContent, title, keyword, wordCount, html: htmlContent};

        const syncResults = [
            CHECKS.keywordLength(analysisData),
            CHECKS.contentLength(analysisData),
            CHECKS.keywordInTitle(analysisData),
            CHECKS.keywordInFirstParagraph(analysisData),
            CHECKS.keywordDensity(analysisData),
        ];

        const asyncChecks = [CHECKS.readability(analysisData, sdk)];

        pluginState.analysisResults = [...syncResults, ...asyncChecks.map(() => ({
            label: "Readability Score", status: 'loading', advice: 'Analyzing...'
        }))];
        sdk.refresh();

        const asyncResults = await Promise.all(asyncChecks)
            .then(results => {
                console.log(results);
                return results;
            })
            .catch(console.error);

        pluginState.analysisResults = [...syncResults, ...asyncResults];
        sdk.refresh();
    }

    async function initializePlugin(sdk, context) {
        if (pluginState.blogId !== context.blogId) {
            pluginState.blogId = context.blogId;
            pluginState.initiated = false;
            pluginState.isLoading = true;
            pluginState.analysisResults = [];
        }

        if (pluginState.initiated) return;

        try {
            const blog = await sdk.apis.getBlog(context.blogId).then(a => a.payload);
            const seoMetadata = blog.metadata?.seoAnalyzer || {};
            pluginState.focusKeyword = seoMetadata.focusKeyword || '';

            pluginState.debouncedRunAnalysis = sdk.utils.debounce(runAnalysis, 1500);
            pluginState.debouncedPersistMetadata = sdk.utils.debounce(persistMetadata, 1500);

            context.editor.on('change', () => {
                pluginState.isTyping = true;
                sdk.refresh();
                pluginState.debouncedRunAnalysis();
            });

            pluginState.isLoading = false;
            pluginState.initiated = true;
            await runAnalysis();

        } catch (err) {
            console.error("Failed to initialize SEO Analyzer:", err);
            pluginState.analysisResults = [{label: "Initialization Failed", status: 'bad', advice: err.message}];
            pluginState.isLoading = false;
            pluginState.initiated = true;
            sdk.refresh();
        }
    }

    async function handleKeywordChange(newKeyword, sdk, context) {
        pluginState.focusKeyword = newKeyword;
        sdk.refresh();
        pluginState.debouncedRunAnalysis();
        pluginState.debouncedPersistMetadata(sdk, context);
    }

    async function persistMetadata(sdk, context) {
        if (pluginState.isSaving) return;
        pluginState.isSaving = true;
        sdk.refresh();

        const seoAnalyzerMetadata = {focusKeyword: pluginState.focusKeyword};

        try {
            await sdk.apis.updateBlogMetadata(context.blogId, {seoAnalyzer: seoAnalyzerMetadata});
        } catch (err) {
            console.error("Failed to save metadata:", err);
        }

        pluginState.isSaving = false;
        sdk.refresh();
    }

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

    function editorSidebarWidget(sdk, prev, context) {
        pluginState.latestSdk = sdk;
        pluginState.latestContext = context;


        console.log("editorSidebarWidget", sdk, prev, context);

        initializePlugin(sdk, context);

        if (pluginState.isLoading) {
            return renderLoadingState();
        }

        return [
            'div', {class: 'p-4 border border-gray-200 rounded-lg shadow-sm bg-white'},
            ['div', {class: 'mb-4'},
                ['label', {for: 'focus-keyword', class: 'block font-bold text-md mb-1'}, 'Focus Keyword'],
                ['input', {
                    id: 'focus-keyword',
                    type: 'text',
                    value: pluginState.focusKeyword,
                    placeholder: 'Enter your main keyword',
                    class: 'w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition',
                    onInput: (e) => handleKeywordChange(e.target.value, sdk, context),
                }],
            ],
            ['div', {},
                ['h3', {class: 'font-bold text-md mb-2 border-t pt-4'}, 'Analysis'],
                ...(pluginState.analysisResults.length > 0
                        ? pluginState.analysisResults.map(renderChecklistItem)
                        : [['p', {class: 'text-sm text-gray-500'}, 'Start typing or set a keyword to see analysis.']]
                ),
                ...(pluginState.isTyping ? [renderTypingIndicator()] : []),
            ]
        ];
    }

    return {
        hooks: {
            'editor-sidebar-widget': editorSidebarWidget,
        }
    };
})()