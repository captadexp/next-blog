/**
 * Common JSON-LD generation utilities
 * Used both for server-side rendering and client-side preview
 */
import {ContentObject} from "@supergrowthai/plugin-dev-kit";

// Re-export types from server for consistency
export interface OrganizationConfig {
    name: string;
    url: string;
    logo: string;
    sameAs: string[];
    logoMedia?: MediaData;
    email?: string;
}

export interface WebsiteConfig {
    name: string;
    url: string;
    searchAction: boolean;
    searchUrlTemplate?: string;
}

export interface ArticleConfig {
    defaultType: string;
    authorType: 'Person' | 'Organization';
    useOrgAsPublisher: boolean;
    defaultImagePolicy: 'featured' | 'first' | 'none';
    includeDateModified: boolean;
}

export interface JsonLdConfig {
    organization: OrganizationConfig;
    website: WebsiteConfig;
    article: ArticleConfig;
    language: string;
}

export interface MediaData {
    _id: string;
    url: string;
    altText?: string;
    caption?: string;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
    mimeType?: string;
}

export interface JsonLdOverrides {
    type?: string;
    schemaType?: string; // For non-blog entities
    headline?: string;
    name?: string; // For non-blog entities
    description?: string;
    url?: string; // For non-blog entities
    language?: string;
    hideAuthor?: boolean;
    authorType?: 'Person' | 'Organization';
    authorName?: string;
    authorUrl?: string;
    featuredImageMedia?: MediaData;
    imageMedia?: MediaData; // For non-blog entities
    imagesMedia?: MediaData[];
    keywords?: string;
    useCustomPublisher?: boolean;
    publisherName?: string;
    publisherUrl?: string;
    publisherLogo?: string;
    customJson?: string;
    // Type-specific data
    review?: any;
    howTo?: any;
    faq?: any;
    recipe?: any;
}

export interface EntityData {
    _id: string;
    slug: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;

    // Blog-specific fields
    title?: string;
    content?: ContentObject;
    excerpt?: string;
    featuredMedia?: MediaData;
    tags?: Array<{ _id: string; name: string; slug: string; description: string }>;
    category?: { _id: string; name: string; slug: string; description: string };
    user?: { _id: string; username: string; name: string; slug: string; bio?: string };

    // Category/Tag-specific fields
    name?: string;
    description?: string;

    // User-specific fields (when EntityData represents a user)
    username?: string;
    bio?: string;

    // Generic image field for non-blog entities
    imageMedia?: MediaData;

    // For backward compatibility and custom fields
    url?: string;
}

export interface JsonLdSchema {
    '@context': string;
    '@type': string;

    [key: string]: any;
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
    const baseUrl = config.website?.url || '';

    const headline = overrides.headline || blog.title || blog.name;
    const description = overrides.description || blog.excerpt || blog.description || '';

    const jsonLd: JsonLdSchema = {
        '@context': 'https://schema.org',
        '@type': type,
        headline,
        description,
        url: overrides.url || `${baseUrl}/${blog.slug}`,
        datePublished: blog.createdAt,
        inLanguage: overrides.language || config.language || 'en-US'
    };

    // Add dateModified if enabled
    if (config.article?.includeDateModified !== false) {
        jsonLd.dateModified = blog.updatedAt;
    }

    // Author
    if (!overrides.hideAuthor) {
        const authorType = overrides.authorType || config.article?.authorType || 'Person';
        const authorName = overrides.authorName || blog.user?.username || blog.user?.name;

        if (authorName) {
            jsonLd.author = {
                '@type': authorType,
                name: authorName,
                url: overrides.authorUrl || ''
            };
        }
    }

    // Publisher (for Article types)
    if (['Article', 'BlogPosting', 'NewsArticle'].includes(type)) {
        if (overrides.useCustomPublisher) {
            jsonLd.publisher = {
                '@type': 'Organization',
                name: overrides.publisherName!,
                url: overrides.publisherUrl,
                logo: overrides.publisherLogo ? {
                    '@type': 'ImageObject',
                    url: overrides.publisherLogo
                } : undefined
            };
        } else if (config.article?.useOrgAsPublisher && config.organization?.name) {
            const logoUrl = config.organization.logoMedia?.url || config.organization.logo;
            jsonLd.publisher = {
                '@type': 'Organization',
                name: config.organization.name,
                url: config.organization.url || '',
                logo: logoUrl ? {
                    '@type': 'ImageObject',
                    url: logoUrl
                } : undefined
            };
        }
    }

    // Images
    const images: string[] = [];

    // Featured image
    if (overrides.featuredImageMedia?.url) {
        images.push(overrides.featuredImageMedia.url);
    } else if (blog.featuredMedia?.url && config.article?.defaultImagePolicy !== 'none') {
        images.push(blog.featuredMedia.url);
    }

    // Add additional images from media
    if (overrides.imagesMedia?.length) {
        images.push(...overrides.imagesMedia.filter((img: any) => img.url).map((img: any) => img.url));
    }

    if (images.length) {
        jsonLd.image = images;
    }

    // Keywords
    const keywords: string[] = [];
    if (blog.tags?.length) {
        keywords.push(...blog.tags.map((t: any) => t.name));
    }
    if (overrides.keywords) {
        keywords.push(...overrides.keywords.split(',').map((k: string) => k.trim()));
    }
    if (keywords.length) {
        jsonLd.keywords = keywords.join(', ');
    }

    // Category as articleSection
    if (blog.category?.name) {
        jsonLd.articleSection = blog.category.name;
    }

    return addTypeSpecificFields(jsonLd, type, overrides);
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
    const baseUrl = config.website?.url || '';

    const jsonLd: JsonLdSchema = {
        '@context': 'https://schema.org',
        '@type': schemaType,
        name: overrides.name || tag.name || tag.title || '',
        url: overrides.url || `${baseUrl}/tags/${tag.slug}`,
        inLanguage: overrides.language || config.language || 'en-US'
    };

    if (overrides.description || tag.description || tag.excerpt) {
        jsonLd.description = overrides.description || tag.description || tag.excerpt;
    }

    // Image for tag
    if (overrides.imageMedia?.url || tag.imageMedia?.url) {
        jsonLd.image = overrides.imageMedia?.url || tag.imageMedia?.url;
    }

    // Type-specific fields for DefinedTerm
    if (schemaType === 'DefinedTerm') {
        // Could add termCode, inDefinedTermSet, etc.
        if (tag.slug) {
            jsonLd.termCode = tag.slug;
        }
    }

    return addCustomFields(jsonLd, overrides);
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
    const baseUrl = config.website?.url || '';

    const jsonLd: JsonLdSchema = {
        '@context': 'https://schema.org',
        '@type': schemaType,
        name: overrides.name || category.name || category.title || '',
        url: overrides.url || `${baseUrl}/categories/${category.slug}`,
        inLanguage: overrides.language || config.language || 'en-US'
    };

    if (overrides.description || category.description || category.excerpt) {
        jsonLd.description = overrides.description || category.description || category.excerpt;
    }

    // Image for category
    if (overrides.imageMedia?.url || category.imageMedia?.url) {
        jsonLd.image = overrides.imageMedia?.url || category.imageMedia?.url;
    }

    // Type-specific fields for CategoryCode
    if (schemaType === 'CategoryCode') {
        if (category.slug) {
            jsonLd.codeValue = category.slug;
        }
    }

    // If it's an Organization type
    if (schemaType === 'Organization') {
        jsonLd.url = overrides.url || `${baseUrl}/categories/${category.slug}`;
        if (config.organization?.sameAs?.length) {
            jsonLd.sameAs = config.organization.sameAs;
        }
    }

    return addCustomFields(jsonLd, overrides);
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
    const baseUrl = config.website?.url || '';

    const jsonLd: JsonLdSchema = {
        '@context': 'https://schema.org',
        '@type': schemaType,
        name: overrides.name || user.name || user.title || '',
        url: overrides.url || `${baseUrl}/authors/${user.slug}`,
        inLanguage: overrides.language || config.language || 'en-US'
    };

    if (overrides.description || user.description || user.excerpt) {
        jsonLd.description = overrides.description || user.description || user.excerpt;
    }

    // Image for user
    if (overrides.imageMedia?.url || user.imageMedia?.url) {
        jsonLd.image = overrides.imageMedia?.url || user.imageMedia?.url;
    }

    // Type-specific fields for Person
    if (schemaType === 'Person') {
        // Could add jobTitle, worksFor, etc.
        if (user.metadata?.jobTitle) {
            jsonLd.jobTitle = user.metadata.jobTitle;
        }
    }

    // Type-specific fields for Organization
    if (schemaType === 'Organization') {
        if (config.organization?.sameAs?.length) {
            jsonLd.sameAs = config.organization.sameAs;
        }
        if (config.organization?.email) {
            jsonLd.email = config.organization.email;
        }
    }

    return addCustomFields(jsonLd, overrides);
}

/**
 * Add type-specific fields for complex article types
 */
function addTypeSpecificFields(jsonLd: JsonLdSchema, type: string, overrides: JsonLdOverrides): JsonLdSchema {
    // Review type
    if (type === 'Review' && overrides.review) {
        if (overrides.review.itemName) {
            jsonLd.itemReviewed = {
                '@type': overrides.review.itemType || 'Thing',
                name: overrides.review.itemName,
                image: overrides.review.imageMedia?.url || undefined
            };
        }
        if (overrides.review.rating?.value) {
            jsonLd.reviewRating = {
                '@type': 'Rating',
                ratingValue: overrides.review.rating.value,
                bestRating: overrides.review.rating.best || 5,
                worstRating: overrides.review.rating.worst || 1
            };
        }
    }

    // HowTo type
    if (type === 'HowTo' && overrides.howTo) {
        if (overrides.howTo.totalTime) jsonLd.totalTime = overrides.howTo.totalTime;
        if (overrides.howTo.estimatedCost) jsonLd.estimatedCost = overrides.howTo.estimatedCost;
        if (overrides.howTo.tools?.length) {
            jsonLd.tool = overrides.howTo.tools.map((tool: string) => ({
                '@type': 'HowToTool',
                name: tool
            }));
        }
        if (overrides.howTo.steps?.length) {
            jsonLd.step = overrides.howTo.steps.map((step: any, i: number) => ({
                '@type': 'HowToStep',
                name: step.name || `Step ${i + 1}`,
                text: step.text,
                image: step.imageMedia?.url || undefined
            }));
        }
    }

    // FAQ type
    if (type === 'FAQ' && overrides.faq?.questions?.length) {
        jsonLd.mainEntity = overrides.faq.questions.map((item: any) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer
            }
        }));
    }

    // Recipe type
    if (type === 'Recipe' && overrides.recipe) {
        if (overrides.recipe.prepTime) jsonLd.prepTime = overrides.recipe.prepTime;
        if (overrides.recipe.cookTime) jsonLd.cookTime = overrides.recipe.cookTime;
        if (overrides.recipe.recipeYield) jsonLd.recipeYield = overrides.recipe.recipeYield;
        if (overrides.recipe.recipeCategory) jsonLd.recipeCategory = overrides.recipe.recipeCategory;
        if (overrides.recipe.recipeIngredient?.length) {
            jsonLd.recipeIngredient = overrides.recipe.recipeIngredient;
        }
        if (overrides.recipe.imageMedia?.url) {
            if (!jsonLd.image) jsonLd.image = [];
            if (Array.isArray(jsonLd.image)) {
                jsonLd.image.unshift(overrides.recipe.imageMedia.url);
            } else {
                jsonLd.image = [overrides.recipe.imageMedia.url, jsonLd.image];
            }
        }
    }

    return addCustomFields(jsonLd, overrides);
}

/**
 * Add custom JSON fields and clean up
 */
function addCustomFields(jsonLd: JsonLdSchema, overrides: JsonLdOverrides): JsonLdSchema {
    // Custom JSON properties
    if (overrides.customJson) {
        try {
            const custom = JSON.parse(overrides.customJson);
            Object.assign(jsonLd, custom);
        } catch (e) {
            // Invalid JSON, skip
        }
    }

    // Clean up undefined values
    Object.keys(jsonLd).forEach(key => {
        const value = jsonLd[key];
        if (value === undefined || value === '' ||
            (value && typeof value === 'object' && Object.keys(value).length === 0)) {
            delete jsonLd[key];
        }
    });

    return jsonLd;
}

/**
 * Universal JSON-LD generator that routes to appropriate function
 */
export function generateJsonLd(
    entityType: 'blog' | 'tag' | 'category' | 'user',
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