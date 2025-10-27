import {defineClient} from "@supergrowthai/plugin-dev-kit";
import {
    BlogEditorContext,
    ClientHookFunction,
    ClientSDK,
    useCallback,
    useEffect,
    useRef,
    useState
} from "@supergrowthai/plugin-dev-kit/client";
import {extractTextFromContent, getWordCount} from "@supergrowthai/plugin-dev-kit/content";
import "./styles.css"

// SEO Analysis Constants
const SEO_CONSTANTS = {
    MIN_WORD_COUNT: 300,
    MIN_KEYWORD_LENGTH: 3,
    MAX_KEYWORD_DENSITY: 2.5,
    MIN_KEYWORD_DENSITY: 0.5,
    GOOD_READABILITY_SCORE: 60,
    OK_READABILITY_SCORE: 30,
    DEBOUNCE_DELAY: 1500,
    SCORE_THRESHOLDS: {
        GOOD: 75,
        OK: 50
    }
} as const;

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
    contentObject: any;
}

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
    const color = percentage >= SEO_CONSTANTS.SCORE_THRESHOLDS.GOOD ? 'text-green-600' : percentage >= SEO_CONSTANTS.SCORE_THRESHOLDS.OK ? 'text-yellow-600' : 'text-red-600';
    const bgColor = percentage >= SEO_CONSTANTS.SCORE_THRESHOLDS.GOOD ? 'bg-green-500' : percentage >= SEO_CONSTANTS.SCORE_THRESHOLDS.OK ? 'bg-yellow-500' : 'bg-red-500';

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
            Loading...
        </div>
    );
}

// Calculate keyword density helper
function calculateKeywordDensity(text: string, keyword: string, wordCount: number): number {
    if (!text || !keyword || wordCount === 0) return 0;
    const keywordCount = (text.toLowerCase().match(new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g')) || []).length;
    return ((keywordCount / wordCount) * 100);
}

// Main widget function using React hooks
const editorSidebarWidget: ClientHookFunction = (sdk: ClientSDK, prev, context: BlogEditorContext) => {
    const blogId = context?.blogId as string | undefined;
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [focusKeyword, setFocusKeyword] = useState('');
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
    const [contentVersion, setContentVersion] = useState(0);
    const lastSavedKeywordRef = useRef<string>('');

    // Analysis function
    const runAnalysis = useCallback(async (keyword: string) => {
        setIsTyping(false);

        const contentObject = context.form.data.content || {version: 1, content: []};
        const textContent = extractTextFromContent(contentObject);
        const title = context.form.data.title || "";
        const wordCount = getWordCount(contentObject);
        const keywordLower = keyword?.trim().toLowerCase() || "";

        const analysisData: AnalysisData = {
            text: textContent,
            title,
            keyword: keywordLower,
            wordCount,
            contentObject
        };

        // Synchronous checks
        const keywordInTitle = (): AnalysisResult => {
            if (!analysisData.keyword) {
                return {
                    label: "Keyword in Title",
                    status: 'bad',
                    advice: 'Set a focus keyword to check this.'
                };
            }
            return {
                label: "Keyword in Title",
                status: analysisData.title.toLowerCase().includes(analysisData.keyword) ? 'good' : 'bad',
                advice: analysisData.title.toLowerCase().includes(analysisData.keyword)
                    ? 'Great job! The keyword is in the title.'
                    : 'Add your keyword to the post title.'
            };
        };

        const keywordInFirstParagraph = (): AnalysisResult => {
            if (!analysisData.keyword) {
                return {
                    label: "Keyword in First Paragraph",
                    status: 'bad',
                    advice: 'Set a focus keyword to check this.'
                };
            }
            const firstParagraph = analysisData.text.split('\n\n')[0] || '';
            return {
                label: "Keyword in First Paragraph",
                status: firstParagraph.toLowerCase().includes(analysisData.keyword) ? 'good' : 'bad',
                advice: firstParagraph.toLowerCase().includes(analysisData.keyword)
                    ? 'Perfect! The keyword appears early in the content.'
                    : 'Use your keyword in the first paragraph.'
            };
        };

        const keywordDensity = (): AnalysisResult => {
            if (!analysisData.keyword) {
                return {
                    label: "Keyword Density",
                    status: 'bad',
                    advice: 'Set a focus keyword to check density.'
                };
            }
            const density = calculateKeywordDensity(analysisData.text, analysisData.keyword, analysisData.wordCount);
            if (density > SEO_CONSTANTS.MAX_KEYWORD_DENSITY) {
                return {
                    label: "Keyword Density",
                    status: 'bad',
                    advice: `Keyword density is ${density.toFixed(1)}%. Try to reduce it to below ${SEO_CONSTANTS.MAX_KEYWORD_DENSITY}%.`
                };
            } else if (density < SEO_CONSTANTS.MIN_KEYWORD_DENSITY) {
                return {
                    label: "Keyword Density",
                    status: 'bad',
                    advice: `Keyword density is ${density.toFixed(1)}%. Consider using the keyword more often.`
                };
            }
            return {
                label: "Keyword Density",
                status: 'good',
                advice: `Keyword density is ${density.toFixed(1)}%. Perfect!`
            };
        };

        const contentLength = (): AnalysisResult => {
            return {
                label: "Content Length",
                status: analysisData.wordCount >= SEO_CONSTANTS.MIN_WORD_COUNT ? 'good' : 'bad',
                advice: analysisData.wordCount < SEO_CONSTANTS.MIN_WORD_COUNT
                    ? `Your content is ${analysisData.wordCount} words. Aim for at least ${SEO_CONSTANTS.MIN_WORD_COUNT} words.`
                    : `${analysisData.wordCount} words. Good length for SEO!`
            };
        };

        const keywordLength = (): AnalysisResult => {
            if (!analysisData.keyword) {
                return {
                    label: "Focus Keyword Length",
                    status: 'bad',
                    advice: 'Set a focus keyword to check its quality.'
                };
            }
            return {
                label: "Focus Keyword Length",
                status: analysisData.keyword.length >= SEO_CONSTANTS.MIN_KEYWORD_LENGTH ? 'good' : 'bad',
                advice: analysisData.keyword.length >= SEO_CONSTANTS.MIN_KEYWORD_LENGTH
                    ? 'The keyword has a suitable length.'
                    : `Your focus keyword is too short. Aim for at least ${SEO_CONSTANTS.MIN_KEYWORD_LENGTH} characters.`
            };
        };

        const syncResults = [
            keywordLength(),
            contentLength(),
            keywordInTitle(),
            keywordInFirstParagraph(),
            keywordDensity()
        ];

        // Set sync results with loading state for async check
        setAnalysisResults([...syncResults, {
            label: "Readability Score",
            status: 'loading',
            advice: 'Analyzing...'
        }]);

        // Async readability check
        try {
            let readabilityResult: AnalysisResult;

            if (!analysisData.text) {
                readabilityResult = {
                    label: "Readability Score",
                    status: 'bad',
                    advice: 'Not enough content to analyze readability.'
                };
            } else {
                const response = await sdk.callRPC("seo-analyzer:flesch-score:get", {content: analysisData.contentObject});
                if (response.code !== 0) throw new Error(response.message);

                const {payload} = response.payload;
                const score = payload.score;

                if (score >= SEO_CONSTANTS.GOOD_READABILITY_SCORE) {
                    readabilityResult = {
                        label: "Readability Score",
                        status: 'good',
                        advice: `Score is ${score}. Easy to read!`
                    };
                } else if (score >= SEO_CONSTANTS.OK_READABILITY_SCORE) {
                    readabilityResult = {
                        label: "Readability Score",
                        status: 'ok',
                        advice: `Score is ${score}. A bit difficult to read.`
                    };
                } else {
                    readabilityResult = {
                        label: "Readability Score",
                        status: 'bad',
                        advice: `Score is ${score}. Very difficult to read.`
                    };
                }
            }

            setAnalysisResults([...syncResults, readabilityResult]);
        } catch (err) {
            setAnalysisResults([...syncResults, {
                label: "Readability Score",
                status: 'bad',
                advice: 'Could not fetch readability score.'
            }]);
        }
    }, [sdk, context]);

    // Initialize plugin on mount
    useEffect(() => {
        if (!blogId) return;


        sdk.callRPC('seo-analyzer:config:get', {blogId}).then((resp) => {
            const config = resp?.payload.payload?.config || {};
            const savedKeyword = config.focusKeyword;
            setFocusKeyword(savedKeyword);
            lastSavedKeywordRef.current = savedKeyword;
            setIsLoading(false);
            runAnalysis(savedKeyword);
        }).catch(() => {
            setIsLoading(false);
        });
    }, [blogId, sdk, runAnalysis]);

    // Listen to content changes
    useEffect(() => {
        const handleContentChange = () => {
            setIsTyping(true);
            // Increment version to trigger debounced analysis
            setContentVersion(v => v + 1);
        };

        context.form.on('content:change', handleContentChange);

        return () => {
            context.form.off('content:change', handleContentChange);
        };
    }, [context]);

    // Debounced analysis on content or keyword change
    useEffect(() => {
        // Skip during initialization or if content hasn't been modified yet
        if (isLoading || (contentVersion === 0 && !focusKeyword)) return;

        const timer = setTimeout(() => {
            runAnalysis(focusKeyword);
        }, SEO_CONSTANTS.DEBOUNCE_DELAY);

        return () => clearTimeout(timer);
    }, [contentVersion, focusKeyword, runAnalysis, isLoading]);

    // Save keyword metadata on change
    useEffect(() => {
        if (!blogId || isLoading) return;
        const next = (focusKeyword || '').trim();
        // Allow saving empty keyword to clear it
        if (next === (lastSavedKeywordRef.current || '').trim()) return;

        const timer = setTimeout(async () => {
            try {
                await sdk.callRPC('seo-analyzer:config:set', {
                    blogId,
                    config: {focusKeyword: next}
                });
                lastSavedKeywordRef.current = next;
            } catch (err) {
                console.error("Failed to save focus keyword:", err);
            }
        }, SEO_CONSTANTS.DEBOUNCE_DELAY);

        return () => clearTimeout(timer);
    }, [focusKeyword, blogId, sdk, isLoading]);

    if (!blogId || isLoading) {
        return <LoadingState/>;
    }

    return (
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            {analysisResults.length > 0 && <ScoreIndicator results={analysisResults}/>}
            <div className="mb-4">
                <label className="block font-bold text-md mb-1">
                    Focus Keyword
                </label>
                <input
                    id="focus-keyword"
                    type="text"
                    value={focusKeyword}
                    placeholder="Enter your main keyword"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    onChange={(e) => setFocusKeyword(e.target.value)}
                />
            </div>
            <div>
                <h3 className="font-bold text-md mb-2 border-t pt-4">Analysis</h3>
                {analysisResults.length > 0 ? (
                    <>
                        {analysisResults.map((item, index) => (
                            <ChecklistItem key={index?.toString()} item={item}/>
                        ))}
                        {isTyping && <TypingIndicator/>}
                    </>
                ) : (
                    <p className="text-sm text-gray-500">
                        Start typing or set a keyword to see analysis.
                    </p>
                )}
            </div>
        </div>
    );
};

export default defineClient({
    hooks: {
        'blog-update-sidebar-widget': editorSidebarWidget,
    }
});