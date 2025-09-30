import {
    ContentObject,
    extractHeadingsFromContent,
    extractImagesFromContent,
    extractLinksFromContent,
    extractTextFromContent,
    getCharacterCount,
    getWordCount,
    hasBlockType
} from "@supergrowthai/plugin-dev-kit/content";
import {defineServer} from "@supergrowthai/plugin-dev-kit";


interface FleschScoreResult {
    score: number;
    interpretation: string;
}

interface SEOAnalysisResult {
    wordCount: number;
    characterCount: number;
    readabilityScore: FleschScoreResult;
    hasImages: boolean;
    imageCount: number;
    hasHeadings: boolean;
    headingCount: number;
    linkCount: number;
    suggestions: string[];
}

// A simple Flesch-Kincaid readability score implementation
const getFleschScore = (text: string): FleschScoreResult => {
    if (!text || text.trim() === '') {
        return {score: 0, interpretation: 'No content'};
    }

    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = text.split(/\s+/).reduce((acc, word) => {
        word = word.toLowerCase();
        if (word.length <= 3) {
            return acc + 1;
        }
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const match = word.match(/[aeiouy]{1,2}/g);
        return acc + (match ? match.length : 0);
    }, 0);

    const sentenceCount = sentences.length || 1;
    const wordCount = words.length || 1;

    if (sentenceCount === 0 || wordCount === 0) {
        return {score: 0, interpretation: 'Not enough content'};
    }

    const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount);

    let interpretation = 'Very difficult to read.';
    if (score > 90) interpretation = 'Very easy to read.';
    else if (score > 80) interpretation = 'Easy to read.';
    else if (score > 70) interpretation = 'Fairly easy to read.';
    else if (score > 60) interpretation = 'Plain English.';
    else if (score > 50) interpretation = 'Fairly difficult to read.';
    else if (score > 30) interpretation = 'Difficult to read.';

    return {score: Math.round(score), interpretation};
};

// Analyze SEO aspects of content
const analyzeContent = (contentData: string | ContentObject): SEOAnalysisResult => {
    // Extract various elements from content
    const text = extractTextFromContent(contentData);
    const links = extractLinksFromContent(contentData);
    const images = extractImagesFromContent(contentData);
    const headings = extractHeadingsFromContent(contentData);
    const wordCount = getWordCount(contentData);
    const characterCount = getCharacterCount(contentData);

    // Get readability score
    const readabilityScore = getFleschScore(text);

    // Generate suggestions
    const suggestions: string[] = [];

    if (wordCount < 300) {
        suggestions.push('Consider adding more content. Aim for at least 300 words for better SEO.');
    }

    if (images.length === 0) {
        suggestions.push('Add images to make your content more engaging.');
    } else {
        const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim() === '');
        if (imagesWithoutAlt.length > 0) {
            suggestions.push(`Add alt text to ${imagesWithoutAlt.length} image(s) for better accessibility and SEO.`);
        }
    }

    if (headings.length === 0) {
        suggestions.push('Add headings to structure your content better.');
    } else if (headings.length === 1) {
        suggestions.push('Consider adding more subheadings to break up your content.');
    }

    if (links.length === 0) {
        suggestions.push('Consider adding internal or external links to provide more value.');
    }

    if (readabilityScore.score < 30) {
        suggestions.push('The content is very difficult to read. Consider using shorter sentences and simpler words.');
    } else if (readabilityScore.score < 60) {
        suggestions.push('The content readability could be improved. Try using shorter sentences.');
    }

    // Check for very long paragraphs
    const hasLists = hasBlockType(contentData, 'List');
    if (!hasLists && wordCount > 500) {
        suggestions.push('Consider using lists to break up long text sections.');
    }

    return {
        wordCount,
        characterCount,
        readabilityScore,
        hasImages: images.length > 0,
        imageCount: images.length,
        hasHeadings: headings.length > 0,
        headingCount: headings.length,
        linkCount: links.length,
        suggestions
    };
};

export default defineServer({
    rpcs: {
        'get-flesch-score': async (sdk, request) => {
            const {content: contentData} = request;
            try {
                // Extract text and calculate Flesch score
                const text = extractTextFromContent(contentData);
                const result = getFleschScore(text);
                return {code: 0, payload: result};
            } catch (error: any) {
                return {code: 500, message: error.message};
            }
        },
        'analyze-seo': async (sdk, request) => {
            const {content: contentData} = request;
            try {
                const analysis = analyzeContent(contentData);
                return {code: 0, payload: analysis};
            } catch (error: any) {
                sdk.log.error(`SEO analysis failed: ${error.message}`);
                return {code: 500, message: error.message};
            }
        },
        'get-word-count': async (sdk, request) => {
            const {content: contentData} = request;
            try {
                const wordCount = getWordCount(contentData);
                return {code: 0, payload: {wordCount}};
            } catch (error: any) {
                return {code: 500, message: error.message};
            }
        },
        'extract-metadata': async (sdk, request) => {
            const {content: contentData} = request;
            try {
                const headings = extractHeadingsFromContent(contentData);
                const images = extractImagesFromContent(contentData);
                const links = extractLinksFromContent(contentData);

                return {
                    code: 0,
                    payload: {
                        headings,
                        images,
                        links,
                        hasContent: getWordCount(contentData) > 0
                    }
                };
            } catch (error: any) {
                return {code: 500, message: error.message};
            }
        }
    }
});