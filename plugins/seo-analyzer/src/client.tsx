import {defineClient} from "@supergrowthai/plugin-dev-kit";
import {PluginRuntime} from "@supergrowthai/plugin-dev-kit/client";
import {extractTextFromContent, getWordCount} from "@supergrowthai/plugin-dev-kit/content";
import "./styles.css"

// Get global utils
const {utils} = (window as any).PluginRuntime as PluginRuntime;

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
};

// Component for checklist items
function ChecklistItem({item}: { key: string, item: AnalysisResult }) {
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

// Core analysis function
async function runAnalysisCore() {
    pluginState.isTyping = false;
    const {latestSdk: sdk, latestContext: context, focusKeyword} = pluginState;

    if (!sdk || !context) return;

    const contentObject = context.editor.getContent();
    const textContent = extractTextFromContent(contentObject);
    const title = context.editor.getTitle();
    const wordCount = getWordCount(contentObject);
    const keyword = focusKeyword.trim().toLowerCase();

    const analysisData: AnalysisData = {text: textContent, title, keyword, wordCount, contentObject};

    // Utils functions
    const calculateKeywordDensity = (text: string, keyword: string, wordCount: number): number => {
        if (!text || !keyword || wordCount === 0) return 0;
        const keywordCount = (text.toLowerCase().match(new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g')) || []).length;
        return ((keywordCount / wordCount) * 100);
    };

    // Check functions
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
                advice: 'Use your keyword in the first paragraph.'
            };
            if (!data.keyword) {
                result.advice = 'Set a focus keyword to check this.';
                return result;
            }
            const firstParagraph = data.text.split('\n\n')[0] || '';
            if (firstParagraph.toLowerCase().includes(data.keyword)) {
                result.status = 'good';
                result.advice = 'Perfect! The keyword appears early in the content.';
            }
            return result;
        },
        keywordDensity: (data: AnalysisData): AnalysisResult => {
            const result: AnalysisResult = {
                label: "Keyword Density",
                status: 'bad',
                advice: ''
            };
            if (!data.keyword) {
                result.advice = 'Set a focus keyword to check density.';
                return result;
            }
            const density = calculateKeywordDensity(data.text, data.keyword, data.wordCount);
            if (density > 2.5) {
                result.status = 'bad';
                result.advice = `Keyword density is ${density.toFixed(1)}%. Try to reduce it to below 2.5%.`;
            } else if (density < 0.5) {
                result.status = 'bad';
                result.advice = `Keyword density is ${density.toFixed(1)}%. Consider using the keyword more often.`;
            } else {
                result.status = 'good';
                result.advice = `Keyword density is ${density.toFixed(1)}%. Perfect!`;
            }
            return result;
        },
        contentLength: (data: AnalysisData): AnalysisResult => {
            const result: AnalysisResult = {
                label: "Content Length",
                status: 'bad',
                advice: ''
            };
            if (data.wordCount < 300) {
                result.advice = `Your content is ${data.wordCount} words. Aim for at least 300 words.`;
            } else {
                result.status = 'good';
                result.advice = `${data.wordCount} words. Good length for SEO!`;
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
                const response = await sdk.callRPC("get-flesch-score", {content: data.contentObject});
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
            return results;
        })
        .catch(console.error);

    pluginState.analysisResults = [...syncResults, ...(asyncResults || [])];
    sdk.refresh();
}

// Core persist metadata function
async function persistMetadataCore(sdk: any, context: any) {
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

// Create debounced functions at module level using global utils
const debouncedRunAnalysis = utils.debounce(runAnalysisCore, 1500);
const debouncedPersistMetadata = utils.debounce(persistMetadataCore, 1500);

// Main widget function with all logic inside to prevent tree shaking
function editorSidebarWidget(sdk: any, prev: any, context: any) {
    pluginState.latestSdk = sdk;
    pluginState.latestContext = context;

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

            context.on('content:change', () => {
                pluginState.isTyping = true;
                sdk.refresh();
                debouncedRunAnalysis();
            });

            pluginState.isLoading = false;
            pluginState.initiated = true;
            await runAnalysisCore();

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
        debouncedRunAnalysis();
        debouncedPersistMetadata(sdk, context);
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
                            <ChecklistItem key={index.toString()} item={item}/>
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