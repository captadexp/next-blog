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
            return (keywordCount / wordCount) * 100;
        },
    };

    const CHECKS = {
        keywordInTitle: data => {
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
        keywordInFirstParagraph: data => {
            const result = {
                label: "Keyword in First Paragraph",
                status: 'bad',
                advice: 'Add your keyword near the beginning of your content.'
            };
            if (!data.keyword) {
                result.advice = 'Set a focus keyword to check this.';
                return result;
            }
            const first10 = data.text.substring(0, Math.floor(data.text.length * 0.1)).toLowerCase();
            if (first10.includes(data.keyword)) {
                result.status = 'good';
                result.advice = 'Well done! The keyword appears early on.';
            }
            return result;
        },
        keywordDensity: data => {
            const result = {label: "Keyword Density", status: 'bad', advice: 'Set a focus keyword to check this.'};
            if (!data.keyword) return result;
            const density = utils.calculateKeywordDensity(data.text, data.keyword, data.wordCount);
            const ds = density.toFixed(2);
            if (density > 0.5 && density < 2.5) {
                result.status = 'good';
                result.advice = `Density is ${ds}%. Perfect!`;
            } else if (density > 0) {
                result.status = 'ok';
                result.advice = `Density is ${ds}%. Aim for 0.5–2.5%.`;
            } else {
                result.advice = `Current density is 0%. Add the keyword a few times.`;
            }
            return result;
        },
        contentLength: data => {
            const wc = data.wordCount;
            const result = {
                label: "Content Length",
                status: 'bad',
                advice: `Your content is ${wc} words. Aim for at least 300 words.`
            };
            if (wc >= 600) {
                result.status = 'good';
                result.advice = `Content is ${wc} words long. Fantastic!`;
            } else if (wc >= 300) {
                result.status = 'ok';
                result.advice = `Content is ${wc} words long. Good length.`;
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
                const score = response.payload.payload.score;
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
        keywordLength: data => {
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

        const html = context.editor.getContent();
        const text = utils.stripHtml(html);
        const title = context.editor.getTitle();
        const wc = utils.getWordCount(text);
        const kw = focusKeyword.trim().toLowerCase();
        const data = {text, title, keyword: kw, wordCount: wc, html};

        const sync = [
            CHECKS.keywordLength(data),
            CHECKS.contentLength(data),
            CHECKS.keywordInTitle(data),
            CHECKS.keywordInFirstParagraph(data),
            CHECKS.keywordDensity(data)
        ];
        const asyncs = [CHECKS.readability(data, sdk)];

        pluginState.analysisResults = [
            ...sync,
            ...asyncs.map(() => ({label: "Readability Score", status: 'loading', advice: 'Analyzing...'}))
        ];
        sdk.refresh();

        const asyncResults = await Promise.all(asyncs).catch(console.error);
        pluginState.analysisResults = [...sync, ...asyncResults];
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
            const blog = (await sdk.apis.getBlog(context.blogId)).payload;
            pluginState.focusKeyword = blog.metadata?.seoAnalyzer?.focusKeyword || '';

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
            pluginState.analysisResults = [{
                label: "Initialization Failed",
                status: 'bad',
                advice: err.message
            }];
            pluginState.isLoading = false;
            pluginState.initiated = true;
            sdk.refresh();
        }
    }

    async function handleKeywordChange(newKw, sdk, context) {
        pluginState.focusKeyword = newKw;
        sdk.refresh();
        pluginState.debouncedRunAnalysis();
        pluginState.debouncedPersistMetadata(sdk, context);
    }

    async function persistMetadata(sdk, context) {
        if (pluginState.isSaving) return;
        pluginState.isSaving = true;
        sdk.refresh();
        try {
            await sdk.apis.updateBlogMetadata(context.blogId, {
                seoAnalyzer: {focusKeyword: pluginState.focusKeyword}
            });
        } catch (err) {
            console.error("Failed to save metadata:", err);
        }
        pluginState.isSaving = false;
        sdk.refresh();
    }

    function getStatusColor(status) {
        switch (status) {
            case 'good':
                return '#10B981';
            case 'ok':
                return '#F59E0B';
            case 'bad':
                return '#EF4444';
            case 'loading':
                return '#3B82F6';
            default:
                return '#D1D5DB';
        }
    }

    function renderChecklistItem(item) {
        return [
            'div',
            {
                style: {
                    display: 'flex',
                    alignItems: 'flex-start',
                    margin: '0.5rem 0',
                    padding: '0.5rem',
                    borderBottom: '1px solid #F3F4F6'
                }
            },
            ['div', {
                style: {
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '9999px',
                    marginRight: '0.75rem',
                    marginTop: '0.25rem',
                    flexShrink: 0,
                    backgroundColor: getStatusColor(item.status)
                }
            }],
            ['div', {style: {flex: 1}},
                ['p', {style: {fontWeight: 600, fontSize: '.875rem'}}, item.label],
                ['p', {style: {fontSize: '.75rem', color: '#4B5563'}}, item.advice]
            ]
        ];
    }

    function renderTypingIndicator() {
        return [
            'div',
            {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '.75rem',
                    color: '#6B7280',
                    padding: '0.5rem',
                    fontStyle: 'italic'
                }
            },
            ['div', {
                style: {
                    width: '1rem',
                    height: '1rem',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#60A5FA',
                    borderTopColor: 'transparent',
                    borderRadius: '9999px',
                    marginRight: '0.5rem',
                    animation: 'spin 1s linear infinite'
                }
            }],
            'Analyzing as you type…'
        ];
    }

    function renderLoadingState() {
        return ['div', {
            style: {
                padding: '1rem',
                textAlign: 'center',
                color: '#6B7280'
            }
        }, 'Loading SEO Analyzer…'];
    }

    function editorSidebarWidget(sdk, prev, context) {
        pluginState.latestSdk = sdk;
        pluginState.latestContext = context;
        initializePlugin(sdk, context);

        if (pluginState.isLoading) {
            return renderLoadingState();
        }

        return [
            'div', {
                style: {
                    padding: '1rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    backgroundColor: '#FFFFFF'
                }
            },
            ['div', {style: {marginBottom: '1rem'}},
                ['label', {
                    htmlFor: 'focus-keyword',
                    style: {display: 'block', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem'}
                },
                    'Focus Keyword'
                ],
                ['input', {
                    id: 'focus-keyword',
                    type: 'text',
                    value: pluginState.focusKeyword,
                    placeholder: 'Enter your main keyword',
                    style: {
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.25rem',
                        outline: 'none'
                    },
                    onInput: e => handleKeywordChange(e.target.value, sdk, context)
                }]
            ],
            ['div', {},
                ['h3', {
                    style: {
                        fontWeight: 700,
                        fontSize: '1rem',
                        marginBottom: '0.5rem',
                        borderTop: '1px solid #E5E7EB',
                        paddingTop: '1rem'
                    }
                },
                    'Analysis'
                ],
                ...(pluginState.analysisResults.length
                        ? pluginState.analysisResults.map(renderChecklistItem)
                        : [['p', {style: {fontSize: '.875rem', color: '#6B7280'}},
                            'Start typing or set a keyword to see analysis.'
                        ]]
                ),
                ...(pluginState.isTyping ? [renderTypingIndicator()] : [])
            ]
        ];
    }

    return {
        hooks: {
            'editor-sidebar-widget': editorSidebarWidget
        }
    };
})();
