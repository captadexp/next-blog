import {extractTextFromContent} from "@supergrowthai/plugin-dev-kit/content";
import {defineServer} from "@supergrowthai/plugin-dev-kit";


interface FleschScoreResult {
    score: number;
    interpretation: string;
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

const META_KEY = 'seo-analyzer:config';

export default defineServer({
    rpcs: {
        'seo-analyzer:config:get': async (sdk, {blogId}: { blogId: string }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});
            const config = blog?.metadata?.[META_KEY] || {};

            return {
                code: 0,
                message: 'ok',
                payload: {config}
            };
        },
        'seo-analyzer:config:set': async (sdk, {blogId, config}: {
            blogId: string;
            config: { focusKeyword: string }
        }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});
            if (!blog) return {code: 404, message: 'Blog not found'};

            await sdk.db.blogs.updateOne(
                {_id: blogId},
                {
                    metadata: {...(blog.metadata || {}), [META_KEY]: config},
                    updatedAt: Date.now()
                }
            );

            return {code: 0, message: 'saved', payload: {config}};
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