import type {FAQPage} from '../types/core-types.js';
import type {MergeContext} from '../types/plugin-types.js';

/**
 * Generate FAQ schema
 */
export function generateFAQSchema(context: MergeContext): FAQPage {
    const {overrides} = context;

    const faq: FAQPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: []
    };

    // Use FAQ questions from overrides if available
    if (overrides.faq?.questions?.length) {
        faq.mainEntity = overrides.faq.questions.map(q => ({
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: q.answer
            }
        }));
    }

    return faq;
}