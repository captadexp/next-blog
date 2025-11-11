/**
 * JSON-LD generation utilities
 */
import {ARTICLE_TYPES, EntityData, EntityType, JsonLdConfig, JsonLdOverrides, JsonLdSchema} from './types.js';

import {cleanSchema, sanitizeString, sanitizeUrl, validateRequiredFields} from './validators.js';

import {
    addAuthorFields,
    addImageFields,
    addKeywordFields,
    addPublisherFields,
    addSchemaSpecificFields,
    createBaseJsonLd
} from './field-builders.js';

import {addTypeSpecificFields, applyCustomJson} from './type-specific.js';

// Re-export types for backward compatibility
export * from './types.js';

/**
 * Remove fields that don't belong to the schema type
 */
function removeInvalidFields(jsonLd: JsonLdSchema, type: string): JsonLdSchema {
    // Article-specific cleanup
    if (ARTICLE_TYPES.includes(type)) {
        delete jsonLd.name; // Articles use headline
    } else {
        // Non-article cleanup
        delete jsonLd.headline;
        delete jsonLd.datePublished;
        delete jsonLd.dateModified;
        delete jsonLd.articleSection;
    }

    // Type-specific field cleanup
    const typeFields: Record<string, string[]> = {
        'HowTo': ['step', 'totalTime', 'estimatedCost', 'tool'],
        'FAQ': ['mainEntity'],
        'Recipe': ['prepTime', 'cookTime', 'recipeYield', 'recipeCategory', 'recipeIngredient'],
        'Review': ['itemReviewed', 'reviewRating']
    };

    // Remove fields not belonging to current type
    for (const [schemaType, fields] of Object.entries(typeFields)) {
        if (type !== schemaType) {
            for (const field of fields) {
                delete jsonLd[field];
            }
        }
    }

    return jsonLd;
}


/**
 * Generate JSON-LD for blog posts/articles
 */
export function generateBlogJsonLd(
    blog: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides = {}
): JsonLdSchema {
    const type = overrides.type || config.article?.defaultType || 'Article';

    let jsonLd = createBaseJsonLd(blog, config, overrides, type);
    jsonLd = addSchemaSpecificFields(jsonLd, blog, config, overrides, type);
    jsonLd = addAuthorFields(jsonLd, blog, config, overrides);
    jsonLd = addPublisherFields(jsonLd, config, overrides, type);
    jsonLd = addImageFields(jsonLd, blog, config, overrides);
    jsonLd = addKeywordFields(jsonLd, blog, overrides);
    jsonLd = addTypeSpecificFields(jsonLd, type, overrides);
    jsonLd = applyCustomJson(jsonLd, overrides);
    jsonLd = removeInvalidFields(jsonLd, type);
    jsonLd = cleanSchema(jsonLd);

    validateRequiredFields(jsonLd, type);
    return jsonLd;
}

/**
 * Generate JSON-LD for tags
 */
export function generateTagJsonLd(
    tag: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides = {}
): JsonLdSchema {
    const schemaType = overrides.schemaType || 'DefinedTerm';
    const baseUrl = config.website?.url?.replace(/\/$/, '') || '';

    const tagUrl = sanitizeUrl(overrides.url || `${baseUrl}/tags/${tag.slug}`);
    const customOverrides = {...overrides, url: tagUrl};

    let jsonLd = createBaseJsonLd(tag, config, customOverrides, schemaType);
    jsonLd = addImageFields(jsonLd, tag, config, overrides);

    if (schemaType === 'DefinedTerm' && tag.slug) {
        jsonLd.termCode = sanitizeString(tag.slug);
    }

    jsonLd = applyCustomJson(jsonLd, overrides);
    jsonLd = cleanSchema(jsonLd);

    validateRequiredFields(jsonLd, schemaType);
    return jsonLd;
}

/**
 * Generate JSON-LD for categories
 */
export function generateCategoryJsonLd(
    category: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides = {}
): JsonLdSchema {
    const schemaType = overrides.schemaType || 'CategoryCode';
    const baseUrl = config.website?.url?.replace(/\/$/, '') || '';

    const categoryUrl = sanitizeUrl(overrides.url || `${baseUrl}/categories/${category.slug}`);
    const customOverrides = {...overrides, url: categoryUrl};

    let jsonLd = createBaseJsonLd(category, config, customOverrides, schemaType);
    jsonLd = addImageFields(jsonLd, category, config, overrides);

    if (schemaType === 'CategoryCode' && category.slug) {
        jsonLd.codeValue = sanitizeString(category.slug);
    }

    if (schemaType === 'Organization' && config.organization?.sameAs?.length) {
        jsonLd.sameAs = config.organization.sameAs.map(url => sanitizeUrl(url)).filter(Boolean);
    }

    jsonLd = applyCustomJson(jsonLd, overrides);
    jsonLd = cleanSchema(jsonLd);

    validateRequiredFields(jsonLd, schemaType);
    return jsonLd;
}

/**
 * Generate JSON-LD for users/authors
 */
export function generateUserJsonLd(
    user: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides = {}
): JsonLdSchema {
    const schemaType = overrides.schemaType || 'Person';
    const baseUrl = config.website?.url?.replace(/\/$/, '') || '';

    const userUrl = sanitizeUrl(overrides.url || `${baseUrl}/authors/${user.slug}`);
    const customOverrides = {...overrides, url: userUrl};

    let jsonLd = createBaseJsonLd(user, config, customOverrides, schemaType);
    jsonLd = addImageFields(jsonLd, user, config, overrides);

    if (schemaType === 'Person' && user.metadata?.jobTitle) {
        jsonLd.jobTitle = sanitizeString(user.metadata.jobTitle);
    }

    if (schemaType === 'Organization') {
        if (config.organization?.sameAs?.length) {
            jsonLd.sameAs = config.organization.sameAs.map(url => sanitizeUrl(url)).filter(Boolean);
        }
        if (config.organization?.email) {
            jsonLd.email = sanitizeString(config.organization.email);
        }
    }

    jsonLd = applyCustomJson(jsonLd, overrides);
    jsonLd = cleanSchema(jsonLd);

    validateRequiredFields(jsonLd, schemaType);
    return jsonLd;
}


/**
 * Universal JSON-LD generator
 */
export function generateJsonLd(
    entityType: EntityType,
    entity: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides = {}
): JsonLdSchema {
    switch (entityType) {
        case 'blog':
            return generateBlogJsonLd(entity, config, overrides);
        case 'tag':
            return generateTagJsonLd(entity, config, overrides);
        case 'category':
            return generateCategoryJsonLd(entity, config, overrides);
        case 'user':
            return generateUserJsonLd(entity, config, overrides);
        default:
            throw new Error(`Unsupported entity type: ${entityType}`);
    }
}