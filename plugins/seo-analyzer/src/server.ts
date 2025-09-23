import {defineServer} from "@supergrowthai/plugin-dev-kit";

interface FleschScoreResult {
    score: number;
    interpretation: string;
}

// A simple Flesch-Kincaid readability score implementation
const getFleschScore = (text: string): FleschScoreResult => {
    if (!text || text.trim() === '') {
        return {score: 0, interpretation: 'No content'};
    }

    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    const words = text.split(/\s+/);
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

    const sentenceCount = sentences.length;
    const wordCount = words.length;

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

export default defineServer({
    rpcs: {
        'get-flesch-score': async (sdk, request) => {
            const {content} = request;
            try {
                const result = getFleschScore(content);
                return {code: 0, payload: result};
            } catch (error: any) {
                return {code: 500, message: error.message};
            }
        }
    }
});