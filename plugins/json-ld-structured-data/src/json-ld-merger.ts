import type {JsonLdOutput} from './types/core-types.js';
import type {MergeContext} from './types/plugin-types.js';
import {generateOrganizationSchema} from './generators/organization-generator.js';
import {generateWebSiteSchema} from './generators/website-generator.js';
import {generateArticleSchema} from './generators/article-generator.js';
import {generateHowToSchema} from './generators/howto-generator.js';
import {generateRecipeSchema} from './generators/recipe-generator.js';
import {generateFAQSchema} from './generators/faq-generator.js';
import {generateReviewSchema} from './generators/review-generator.js';

/**
 * Main function to generate JSON-LD for a blog post
 */
export function generateJsonLd(context: MergeContext): JsonLdOutput | JsonLdOutput[] {
    const schemaType = context.overrides['@type'] || 'Article';

    // Always include Organization and WebSite schemas
    const schemas: JsonLdOutput[] = [];

    // Add Organization schema if configured
    const organizationSchema = generateOrganizationSchema(context.globalSettings);
    if (organizationSchema) {
        schemas.push(organizationSchema);
    }

    // Add WebSite schema if configured
    const websiteSchema = generateWebSiteSchema(context.globalSettings);
    if (websiteSchema) {
        schemas.push(websiteSchema);
    }

    // Add content-specific schema
    const contentSchema = generateContentSchema(context, schemaType);
    if (contentSchema) {
        schemas.push(contentSchema);
    }

    return schemas.length === 1 ? schemas[0] : schemas;
}

/**
 * Generate content-specific schema based on type
 */
function generateContentSchema(context: MergeContext, schemaType: string): JsonLdOutput | null {
    switch (schemaType) {
        case 'Article':
        case 'BlogPosting':
        case 'NewsArticle':
        case 'TechArticle':
            return generateArticleSchema(context, schemaType);
        case 'HowTo':
            return generateHowToSchema(context);
        case 'Recipe':
            return generateRecipeSchema(context);
        case 'FAQPage':
            return generateFAQSchema(context);
        case 'Review':
            return generateReviewSchema(context);
        default:
            return generateArticleSchema(context, 'Article');
    }
}