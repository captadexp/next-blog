/**
 * Field builders for JSON-LD schemas
 */
import {ARTICLE_TYPES, EntityData, JsonLdConfig, JsonLdOverrides, JsonLdSchema, PUBLISHER_TYPES} from './types.js';
import {sanitizeString, sanitizeUrl} from './validators.js';

/**
 * Create base JSON-LD structure
 */
export function createBaseJsonLd(
    entity: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides,
    type: typeof ARTICLE_TYPES[number]
): JsonLdSchema {
    const baseUrl = config.website?.url?.replace(/\/$/, '') || '';
    const title = sanitizeString(overrides.headline || overrides.name || entity.title || entity.name);
    const description = sanitizeString(overrides.description || entity.excerpt || entity.description || entity.bio);
    const url = sanitizeUrl(overrides.url || (baseUrl ? `${baseUrl}/${entity.slug}` : `/${entity.slug}`));

    const jsonLd: JsonLdSchema = {
        '@context': 'https://schema.org',
        '@type': type,
        inLanguage: overrides.language || config.language || 'en-US'
    };

    if (description) jsonLd.description = description;
    if (url) jsonLd.url = url;

    // Add name field for non-Article types
    if (!ARTICLE_TYPES.includes(type) && title) {
        jsonLd.name = title;
    }

    return jsonLd;
}

/**
 * Add schema-specific fields
 */
export function addSchemaSpecificFields(
    jsonLd: JsonLdSchema,
    entity: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides,
    type: typeof ARTICLE_TYPES[number]
): JsonLdSchema {
    const title = sanitizeString(overrides.headline || overrides.name || entity.title || entity.name);

    if (ARTICLE_TYPES.includes(type)) {
        if (title) jsonLd.headline = title;

        // Convert timestamp to ISO 8601 format for JSON-LD
        if (entity.createdAt) {
            jsonLd.datePublished = new Date(entity.createdAt).toISOString();
        }

        if (config.article?.includeDateModified && entity.updatedAt) {
            jsonLd.dateModified = new Date(entity.updatedAt).toISOString();
        }

        if (entity.category?.name) {
            jsonLd.articleSection = sanitizeString(entity.category.name);
        }
    } else {
        if (title) jsonLd.name = title;
    }

    return jsonLd;
}

/**
 * Add author information
 */
export function addAuthorFields(
    jsonLd: JsonLdSchema,
    entity: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides
): JsonLdSchema {
    if (overrides.hideAuthor) return jsonLd;

    const authorType = overrides.authorType || config.article?.authorType || 'Person';
    const authorName = sanitizeString(overrides.authorName || entity.user?.username || entity.user?.name);
    const authorUrl = sanitizeUrl(overrides.authorUrl);

    if (authorName) {
        jsonLd.author = {
            '@type': authorType,
            name: authorName
        };
        if (authorUrl) {
            jsonLd.author.url = authorUrl;
        }
    }

    return jsonLd;
}

/**
 * Add publisher information
 */
export function addPublisherFields(
    jsonLd: JsonLdSchema,
    config: JsonLdConfig,
    overrides: JsonLdOverrides,
    type: typeof PUBLISHER_TYPES[number]
): JsonLdSchema {
    if (!PUBLISHER_TYPES.includes(type)) return jsonLd;

    if (overrides.useCustomPublisher && overrides.publisherName) {
        const publisherUrl = sanitizeUrl(overrides.publisherUrl);
        const publisherLogo = sanitizeUrl(overrides.publisherLogo);

        jsonLd.publisher = {
            '@type': 'Organization',
            name: sanitizeString(overrides.publisherName)
        };

        if (publisherUrl) jsonLd.publisher.url = publisherUrl;
        if (publisherLogo) {
            jsonLd.publisher.logo = {
                '@type': 'ImageObject',
                url: publisherLogo
            };
        }
    } else if (config.article?.useOrgAsPublisher && config.organization?.name) {
        const logoUrl = sanitizeUrl(config.organization.logoMedia?.url || config.organization.logo);

        jsonLd.publisher = {
            '@type': 'Organization',
            name: sanitizeString(config.organization.name)
        };

        const orgUrl = sanitizeUrl(config.organization.url);
        if (orgUrl) jsonLd.publisher.url = orgUrl;

        if (logoUrl) {
            jsonLd.publisher.logo = {
                '@type': 'ImageObject',
                url: logoUrl
            };
        }
    }

    return jsonLd;
}

/**
 * Add image fields
 */
export function addImageFields(
    jsonLd: JsonLdSchema,
    entity: EntityData,
    config: JsonLdConfig,
    overrides: JsonLdOverrides
): JsonLdSchema {
    const images: string[] = [];

    // Collect all image URLs
    const urls = [
        overrides.featuredImageMedia?.url,
        entity.featuredMedia?.url && config.article?.defaultImagePolicy !== 'none' ? entity.featuredMedia.url : null,
        overrides.imageMedia?.url,
        entity.imageMedia?.url,
        ...(overrides.imagesMedia?.map(img => img.url) || [])
    ];

    for (const url of urls) {
        const sanitized = sanitizeUrl(url);
        if (sanitized && !images.includes(sanitized)) {
            images.push(sanitized);
        }
    }

    if (images.length > 0) {
        jsonLd.image = images;
    }

    return jsonLd;
}

/**
 * Add keyword fields
 */
export function addKeywordFields(
    jsonLd: JsonLdSchema,
    entity: EntityData,
    overrides: JsonLdOverrides
): JsonLdSchema {
    const keywords: string[] = [];

    if (entity.tags?.length) {
        keywords.push(...entity.tags.map(t => sanitizeString(t.name)).filter(Boolean) as string[]);
    }

    if (overrides.keywords) {
        const additionalKeywords = overrides.keywords
            .split(',')
            .map(k => sanitizeString(k.trim()))
            .filter(Boolean) as string[];
        keywords.push(...additionalKeywords);
    }

    if (keywords.length > 0) {
        jsonLd.keywords = keywords.join(', ');
    }

    return jsonLd;
}