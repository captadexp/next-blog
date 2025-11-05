import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {HydratedBlog, ServerSDK} from '@supergrowthai/plugin-dev-kit/server';

type ContentType = 'posts' | 'tags' | 'categories' | 'users';

// Type definitions
interface OrganizationConfig {
    name: string;
    url: string;
    logo: string;
    sameAs: string[];
    logoMedia?: MediaData;
}

interface WebsiteConfig {
    name: string;
    url: string;
    searchAction: boolean;
}

interface ArticleConfig {
    defaultType: string;
    authorType: 'Person' | 'Organization';
    useOrgAsPublisher: boolean;
    defaultImagePolicy: 'featured' | 'none';
}

interface JsonLdConfig {
    organization: OrganizationConfig;
    website: WebsiteConfig;
    article: ArticleConfig;
    language: string;
}

interface MediaData {
    mediaId: string;
    url: string;
    alt?: string;
    width?: number;
    height?: number;
}

interface ReviewData {
    itemName?: string;
    itemType?: string;
    rating?: {
        value: number;
        best: number;
        worst: number;
    };
    imageMedia?: MediaData;
}

interface HowToStep {
    name: string;
    text: string;
    imageMedia?: MediaData;
}

interface HowToData {
    totalTime?: string;
    estimatedCost?: string;
    tools?: string[];
    steps?: HowToStep[];
}

interface FaqQuestion {
    question: string;
    answer: string;
}

interface FaqData {
    questions?: FaqQuestion[];
}

interface RecipeData {
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string;
    recipeCategory?: string;
    recipeIngredient?: string[];
    imageMedia?: MediaData;
}

interface JsonLdOverrides {
    type?: string;
    headline?: string;
    description?: string;
    language?: string;
    hideAuthor?: boolean;
    authorType?: 'Person' | 'Organization';
    authorName?: string;
    authorUrl?: string;
    featuredImageMedia?: MediaData;
    imagesMedia?: MediaData[];
    keywords?: string;
    useCustomPublisher?: boolean;
    publisherName?: string;
    publisherUrl?: string;
    publisherLogo?: string;
    customJson?: string;
    review?: ReviewData;
    howTo?: HowToData;
    faq?: FaqData;
    recipe?: RecipeData;
}

const SETTINGS_KEY = 'json-ld-structured-data:config';
const METADATA_KEY = 'json-ld-structured-data:overrides';

const DEFAULT_CONFIG: JsonLdConfig = {
    organization: {
        name: '',
        url: '',
        logo: '',
        sameAs: []
    },
    website: {
        name: '',
        url: '',
        searchAction: false
    },
    article: {
        defaultType: 'Article',
        authorType: 'Person',
        useOrgAsPublisher: true,
        defaultImagePolicy: 'featured'
    },
    language: 'en-US'
};

export default defineServer({
    rpcs: {
        'json-ld-structured-data:config:get': async (sdk: ServerSDK) => {
            const config = await sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG;
            return {code: 0, message: 'ok', payload: config};
        },

        'json-ld-structured-data:config:set': async (sdk: ServerSDK, {config}: { config: JsonLdConfig }) => {
            await sdk.settings.set(SETTINGS_KEY, config);
            return {code: 0, message: 'saved', payload: config};
        },

        'json-ld-structured-data:get': async (sdk: ServerSDK, payload: { type: ContentType; _id: string }) => {
            let metadata: any = null;

            switch (payload.type) {
                case 'posts': {
                    const blog = await sdk.db.blogs.findOne({_id: payload._id});
                    if (!blog) return {code: 404, message: 'Blog not found'};
                    metadata = blog.metadata;
                    break;
                }
                case 'tags': {
                    const tag = await sdk.db.tags.findOne({_id: payload._id});
                    if (!tag) return {code: 404, message: 'Tag not found'};
                    metadata = tag.metadata;
                    break;
                }
                case 'categories': {
                    const category = await sdk.db.categories.findOne({_id: payload._id});
                    if (!category) return {code: 404, message: 'Category not found'};
                    metadata = category.metadata;
                    break;
                }
                case 'users': {
                    const user = await sdk.db.users.findOne({_id: payload._id});
                    if (!user) return {code: 404, message: 'User not found'};
                    metadata = user.metadata;
                    break;
                }
                default:
                    return {code: -1, message: 'failed, unknown type'};
            }

            const overrides = metadata?.[METADATA_KEY] || {};
            return {code: 0, message: 'ok', payload: overrides};
        },

        'json-ld-structured-data:set': async (sdk: ServerSDK, payload: {
            type: ContentType;
            _id: string;
            overrides: JsonLdOverrides
        }) => {
            switch (payload.type) {
                case 'posts': {
                    const blog = await sdk.db.blogs.findOne({_id: payload._id});
                    if (!blog) return {code: 404, message: 'Blog not found'};

                    await sdk.db.blogs.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[METADATA_KEY]: payload.overrides},
                            updatedAt: Date.now()
                        }
                    );
                    break;
                }
                case 'tags': {
                    const tag = await sdk.db.tags.findOne({_id: payload._id});
                    if (!tag) return {code: 404, message: 'Tag not found'};

                    await sdk.db.tags.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[METADATA_KEY]: payload.overrides},
                            updatedAt: Date.now()
                        }
                    );
                    break;
                }
                case 'categories': {
                    const category = await sdk.db.categories.findOne({_id: payload._id});
                    if (!category) return {code: 404, message: 'Category not found'};

                    await sdk.db.categories.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[METADATA_KEY]: payload.overrides},
                            updatedAt: Date.now()
                        }
                    );
                    break;
                }
                case 'users': {
                    const user = await sdk.db.users.findOne({_id: payload._id});
                    if (!user) return {code: 404, message: 'User not found'};

                    await sdk.db.users.updateOne(
                        {_id: payload._id},
                        {
                            metadata: {[METADATA_KEY]: payload.overrides},
                            updatedAt: Date.now()
                        }
                    );
                    break;
                }
                default:
                    return {code: -1, message: 'failed, unknown type'};
            }

            return {code: 0, message: 'saved', payload: payload.overrides};
        },

        'json-ld-structured-data:generate': async (sdk: ServerSDK, {blogId}: { blogId: string }) => {
            const [blog, config] = await Promise.all([
                sdk.db.generated.getHydratedBlog({_id: blogId}),
                sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG
            ]);

            if (!blog) return {code: 404, message: 'Blog not found'};

            const overrides = blog.metadata?.[METADATA_KEY] || {};
            const jsonLd = generateJsonLd(blog, config as JsonLdConfig, overrides);

            return {code: 0, message: 'ok', payload: jsonLd};
        },

        // Legacy blog-specific methods for backward compatibility
        'json-ld-structured-data:blog:get': async (sdk: ServerSDK, {blogId}: { blogId: string }) => {
            return sdk.callRPC('json-ld-structured-data:get', {type: 'posts', _id: blogId});
        },

        'json-ld-structured-data:blog:set': async (sdk: ServerSDK, {blogId, overrides}: {
            blogId: string;
            overrides: JsonLdOverrides
        }) => {
            return sdk.callRPC('json-ld-structured-data:set', {type: 'posts', _id: blogId, overrides});
        }
    }
});

interface JsonLdSchema {
    '@context': string;
    '@type': string;
    headline?: string;
    description?: string;
    url?: string;
    datePublished?: number;
    dateModified?: number;
    inLanguage?: string;
    author?: {
        '@type': string;
        name: string;
        url?: string;
    };
    publisher?: {
        '@type': string;
        name: string;
        url?: string;
        logo?: {
            '@type': string;
            url: string;
        };
    };
    image?: string[];
    keywords?: string;
    articleSection?: string;
    breadcrumb?: {
        '@type': string;
        itemListElement: Array<{
            '@type': string;
            position: number;
            name: string;
            item: string;
        }>;
    };
    itemReviewed?: {
        '@type': string;
        name: string;
        image?: string;
    };
    reviewRating?: {
        '@type': string;
        ratingValue: number;
        bestRating: number;
        worstRating: number;
    };
    totalTime?: string;
    estimatedCost?: string;
    tool?: Array<{
        '@type': string;
        name: string;
    }>;
    step?: Array<{
        '@type': string;
        name: string;
        text: string;
        image?: string;
    }>;
    mainEntity?: Array<{
        '@type': string;
        name: string;
        acceptedAnswer: {
            '@type': string;
            text: string;
        };
    }>;
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string;
    recipeCategory?: string;
    recipeIngredient?: string[];
}

function generateJsonLd(blog: HydratedBlog, config: JsonLdConfig, overrides: JsonLdOverrides): JsonLdSchema {
    const type = overrides.type || config.article?.defaultType || 'Article';
    const baseUrl = config.website?.url || '';

    const headline = overrides.headline || blog.title;
    const description = overrides.description || blog.excerpt || '';

    const jsonLd: JsonLdSchema = {
        '@context': 'https://schema.org',
        '@type': type,
        headline,
        description,
        url: `${baseUrl}/${blog.slug}`,
        datePublished: blog.createdAt,
        dateModified: blog.updatedAt,
        inLanguage: overrides.language || config.language || 'en-US'
    };

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

    // Breadcrumb from permalink metadata if available
    const permalinkData = blog.metadata?.['permalink-manager:permalink'].permalink;
    if (permalinkData) {
        const pathParts = permalinkData.split('/').filter((p: string) => p);
        if (pathParts.length > 0) {
            const breadcrumbItems = pathParts.map((part: string, index: number) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
                item: `${baseUrl}/${pathParts.slice(0, index + 1).join('/')}`
            }));

            // Add the current page as the last item
            breadcrumbItems.push({
                '@type': 'ListItem',
                position: pathParts.length + 1,
                name: headline,
                item: `${baseUrl}/${blog.slug}`
            });

            jsonLd.breadcrumb = {
                '@type': 'BreadcrumbList',
                itemListElement: breadcrumbItems
            };
        }
    }

    // Type-specific fields
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
        const value = (jsonLd as any)[key];
        if (value === undefined || value === '' ||
            (value && typeof value === 'object' &&
                Object.keys(value).length === 0)) {
            delete (jsonLd as any)[key];
        }
    });

    return jsonLd;
}