import {defineClient, content} from "@supergrowthai/plugin-dev-kit";

interface AnalysisResult {
    label: string;
    status: 'good' | 'ok' | 'bad' | 'loading';
    advice: string;
}

interface AnalysisData {
    text: string;
    title: string;
    keyword: string;
    wordCount: number;
    contentObject: any; // ContentObject from editor
}

interface PluginState {
    initiated: boolean;
    isLoading: boolean;
    isTyping: boolean;
    isSaving: boolean;
    latestSdk: any;
    latestContext: any;
    blogId: string | null;
    focusKeyword: string;
    analysisResults: AnalysisResult[];
    debouncedRunAnalysis: any;
    debouncedPersistMetadata: any;
}

// This state persists between re-renders triggered by sdk.refresh()
const pluginState: PluginState = {
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

// Component for checklist items
function ChecklistItem({item}: { item: AnalysisResult }) {
    const colorMap: Record<string, string> = {
        good: 'bg-green-500',
        ok: 'bg-yellow-500',
        bad: 'bg-red-500',
        loading: 'bg-blue-500 animate-pulse',
    };

    return (
        <div className="flex items-start my-2 p-2 border-b border-gray-100 last:border-b-0">
            <div className={`w-3 h-3 rounded-full mr-3 mt-1 flex-shrink-0 ${colorMap[item.status]}`}></div>
            <div className="flex-1">
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-gray-600">{item.advice}</p>
            </div>
        </div>
    );
}

// Component for score indicator
function ScoreIndicator({results}: { results: AnalysisResult[] }) {
    const goodCount = results.filter(r => r.status === 'good').length;
    const total = results.length;

    if (total === 0) return null;

    const percentage = Math.round((goodCount / total) * 100);
    const color = percentage >= 75 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600';
    const bgColor = percentage >= 75 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">SEO Score</span>
                <span className={`text-sm font-bold ${color}`}>{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all ${bgColor}`}
                    style={{width: `${percentage}%`}}
                />
            </div>
        </div>
    );
}

// Component for typing indicator
function TypingIndicator() {
    return (
        <div className="flex items-center text-xs text-gray-500 p-2 italic">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
            <p>Analyzing as you type...</p>
        </div>
    );
}

// Component for loading state
function LoadingState() {
    return (
        <div className="p-4 text-center text-gray-500">
            Loading SEO Analyzer...
        </div>
    );
}

// Main widget function with all logic inside to prevent tree shaking
function editorSidebarWidget(sdk: any, prev: any, context: any) {
    pluginState.latestSdk = sdk;
    pluginState.latestContext = context;

    // Utils functions - moved inside to prevent tree shaking
    const utils = {
        calculateKeywordDensity(text: string, keyword: string, wordCount: number): number {
            if (!text || !keyword || wordCount === 0) return 0;
            const keywordCount = (text.toLowerCase().match(new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g')) || []).length;
            return ((keywordCount / wordCount) * 100);
        },
    };

    // Check functions - moved inside to prevent tree shaking
    const CHECKS = {
        keywordInTitle: (data: AnalysisData): AnalysisResult => {
            const result: AnalysisResult = {
                label: "Keyword in Title",
                status: 'bad',
                advice: 'Add your keyword to the post title.'
            };
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
        keywordInFirstParagraph: (data: AnalysisData): AnalysisResult => {
            const result: AnalysisResult = {
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
        keywordDensity: (data: AnalysisData): AnalysisResult => {
            const result: AnalysisResult = {
                label: "Keyword Density",
                status: 'bad',
                advice: 'Set a focus keyword to check this.'
            };
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
        contentLength: (data: AnalysisData): AnalysisResult => {
            const {wordCount} = data;
            const result: AnalysisResult = {
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
        readability: async (data: AnalysisData, sdk: any): Promise<AnalysisResult> => {
            const result: AnalysisResult = {
                label: "Readability Score",
                status: 'loading',
                advice: 'Analyzing...'
            };
            if (!data.text) {
                return {...result, status: 'bad', advice: 'Not enough content to analyze readability.'};
            }
            try {
                const response = await sdk.callHook("get-flesch-score", {content: data.contentObject});
                if (response.code !== 0) throw new Error(response.message);

                const {payload} = response.payload;
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
            } catch (err: any) {
                console.error("Readability check failed:", err);
                result.status = 'bad';
                result.advice = 'Could not fetch readability score.';
            }
            return result;
        },
        keywordLength: (data: AnalysisData): AnalysisResult => {
            const result: AnalysisResult = {
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

        const contentObject = context.editor.getContent();
        const textContent = content.extractTextFromContent(contentObject);
        const title = context.editor.getTitle();
        const wordCount = content.getWordCount(contentObject);
        const keyword = focusKeyword.trim().toLowerCase();

        const analysisData: AnalysisData = {text: textContent, title, keyword, wordCount, contentObject};

        const syncResults = [
            CHECKS.keywordLength(analysisData),
            CHECKS.contentLength(analysisData),
            CHECKS.keywordInTitle(analysisData),
            CHECKS.keywordInFirstParagraph(analysisData),
            CHECKS.keywordDensity(analysisData),
        ];

        const asyncChecks = [CHECKS.readability(analysisData, sdk)];

        pluginState.analysisResults = [...syncResults, ...asyncChecks.map(() => ({
            label: "Readability Score", status: 'loading' as const, advice: 'Analyzing...'
        }))];
        sdk.refresh();

        const asyncResults = await Promise.all(asyncChecks)
            .then(results => {
                console.log(results);
                return results;
            })
            .catch(console.error);

        pluginState.analysisResults = [...syncResults, ...(asyncResults || [])];
        sdk.refresh();
    }

    async function persistMetadata(sdk: any, context: any) {
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

    async function initializePlugin(sdk: any, context: any) {
        if (pluginState.blogId !== context.blogId) {
            pluginState.blogId = context.blogId;
            pluginState.initiated = false;
            pluginState.isLoading = true;
            pluginState.analysisResults = [];
        }

        if (pluginState.initiated) return;

        try {
            const blog = await sdk.apis.getBlog(context.blogId).then((a: any) => a.payload);
            const seoMetadata = blog.metadata?.seoAnalyzer || {};
            pluginState.focusKeyword = seoMetadata.focusKeyword || '';

            pluginState.debouncedRunAnalysis = sdk.utils.debounce(runAnalysis, 1500);
            pluginState.debouncedPersistMetadata = sdk.utils.debounce(persistMetadata, 1500);

            context.on('content:change', () => {
                pluginState.isTyping = true;
                sdk.refresh();
                pluginState.debouncedRunAnalysis();
            });

            pluginState.isLoading = false;
            pluginState.initiated = true;
            await runAnalysis();

        } catch (err: any) {
            console.error("Failed to initialize SEO Analyzer:", err);
            pluginState.analysisResults = [{
                label: "Initialization Failed",
                status: 'bad' as const,
                advice: err.message
            }];
            pluginState.isLoading = false;
            pluginState.initiated = true;
            sdk.refresh();
        }
    }

    async function handleKeywordChange(newKeyword: string, sdk: any, context: any) {
        pluginState.focusKeyword = newKeyword;
        sdk.refresh();
        pluginState.debouncedRunAnalysis();
        pluginState.debouncedPersistMetadata(sdk, context);
    }

    // Initialize plugin
    initializePlugin(sdk, context);

    if (pluginState.isLoading) {
        return <LoadingState/>;
    }


    return (
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            {pluginState.analysisResults.length > 0 ? <ScoreIndicator results={pluginState.analysisResults}/> : null}
            <div className="mb-4">
                <label className="block font-bold text-md mb-1">
                    Focus Keyword
                </label>
                <input
                    id="focus-keyword"
                    type="text"
                    value={pluginState.focusKeyword}
                    placeholder="Enter your main keyword"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    onChange={(e: any) => handleKeywordChange(e.target.value, sdk, context)}
                />
            </div>
            <div>
                <h3 className="font-bold text-md mb-2 border-t pt-4">Analysis</h3>
                {pluginState.analysisResults.length > 0 ? (
                    <>
                        {pluginState.analysisResults.map((item, index) => (
                            <ChecklistItem key={index} item={item}/>
                        ))}
                        {pluginState.isTyping && <TypingIndicator/>}
                    </>
                ) : (
                    <p className="text-sm text-gray-500">
                        Start typing or set a keyword to see analysis.
                    </p>
                )}
            </div>
        </div>
    );
}

export default defineClient({
    hooks: {
        'editor-sidebar-widget': editorSidebarWidget,
    }
});