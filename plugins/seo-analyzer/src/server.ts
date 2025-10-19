import {extractTextFromContent} from "@supergrowthai/plugin-dev-kit/content";
import {defineServer} from "@supergrowthai/plugin-dev-kit";

// Flesch Reading Ease Score Constants
const FLESCH_CONSTANTS = {
    BASE_SCORE: 206.835,
    WORD_FACTOR: 1.015,
    SYLLABLE_FACTOR: 84.6,
    THRESHOLDS: {
        VERY_EASY: 90,
        EASY: 80,
        FAIRLY_EASY: 70,
        PLAIN: 60,
        FAIRLY_DIFFICULT: 50,
        DIFFICULT: 30
    }
} as const;

interface FleschScoreResult {
    score: number;
    interpretation: string;
}

interface SeoConfig {
    focusKeyword: string;
    // Future fields can be added here:
    // thresholds?: {
    //     minWordCount?: number;
    //     maxKeywordDensity?: number;
    //     minKeywordDensity?: number;
    // }
}

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

    const score = FLESCH_CONSTANTS.BASE_SCORE -
        FLESCH_CONSTANTS.WORD_FACTOR * (wordCount / sentenceCount) -
        FLESCH_CONSTANTS.SYLLABLE_FACTOR * (syllables / wordCount);

    let interpretation = 'Very difficult to read.';
    if (score > FLESCH_CONSTANTS.THRESHOLDS.VERY_EASY) interpretation = 'Very easy to read.';
    else if (score > FLESCH_CONSTANTS.THRESHOLDS.EASY) interpretation = 'Easy to read.';
    else if (score > FLESCH_CONSTANTS.THRESHOLDS.FAIRLY_EASY) interpretation = 'Fairly easy to read.';
    else if (score > FLESCH_CONSTANTS.THRESHOLDS.PLAIN) interpretation = 'Plain English.';
    else if (score > FLESCH_CONSTANTS.THRESHOLDS.FAIRLY_DIFFICULT) interpretation = 'Fairly difficult to read.';
    else if (score > FLESCH_CONSTANTS.THRESHOLDS.DIFFICULT) interpretation = 'Difficult to read.';

    return {score: Math.round(score), interpretation};
};

const META_KEY = 'seo-analyzer:config';

export default defineServer({
    rpcs: {
        'seo-analyzer:config:get': async (sdk, {blogId}: { blogId: string }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});
            const config: SeoConfig = blog?.metadata?.[META_KEY] || {focusKeyword: ''};

            return {
                code: 0,
                message: 'ok',
                payload: {config}
            };
        },
        'seo-analyzer:config:set': async (sdk, {blogId, config}: {
            blogId: string;
            config: SeoConfig
        }) => {
            // Validate config
            if (config.focusKeyword && config.focusKeyword.length > 100) {
                return {
                    code: 400,
                    message: 'Focus keyword is too long (max 100 characters)'
                };
            }

            const blog = await sdk.db.blogs.findOne({_id: blogId});
            if (!blog) return {code: 404, message: 'Blog not found'};

            // Sanitize the config
            const sanitizedConfig: SeoConfig = {
                focusKeyword: (config.focusKeyword || '').trim().substring(0, 100)
            };

            await sdk.db.blogs.updateOne(
                {_id: blogId},
                {
                    metadata: {[META_KEY]: sanitizedConfig},
                    updatedAt: Date.now()
                }
            );

            return {code: 0, message: 'saved', payload: {config: sanitizedConfig}};
        },
        'seo-analyzer:flesch-score:get': async (sdk, request) => {
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
    }
});