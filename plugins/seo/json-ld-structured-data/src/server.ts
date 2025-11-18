import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import {generateJsonLd} from './jsonld-generator.js';
import {handleRPC, ValidationError} from "./errors";

// Type definitions
interface OrganizationConfig {
    // name, url, and logo now come from system settings
    name: string;
    url: string;
    logoMediaId: string;
    logoMedia?: MediaData;
    sameAs: string[];
}

interface WebsiteConfig {
    // name and url now come from system settings
    name: string;
    url: string;
    searchAction: boolean;
    searchUrlTemplate?: string;
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

// Helper function to merge system settings with plugin config
async function mergeSystemSettings(sdk: ServerSDK, config: JsonLdConfig): Promise<JsonLdConfig> {
    const systemSettings = await sdk.callRPC('system:settings:get', {});

    let logoMedia = null;
    if (systemSettings.payload?.organization?.logoMediaId) {
        logoMedia = await sdk.db.media.findOne({_id: systemSettings.payload.organization.logoMediaId});
    }

    return {
        ...config,
        organization: {
            ...config.organization,
            name: systemSettings.payload?.site?.name || systemSettings.payload?.organization?.name || '',
            url: systemSettings.payload?.site?.url || systemSettings.payload?.organization?.url || '',
            logoMediaId: systemSettings.payload?.organization?.logoMediaId || '',
            logoMedia: logoMedia ? {
                mediaId: logoMedia._id,
                url: logoMedia.url,
                alt: logoMedia.altText || systemSettings.payload?.organization?.name || 'Organization Logo',
                width: logoMedia.width,
                height: logoMedia.height
            } : undefined
        },
        website: {
            ...config.website,
            name: systemSettings.payload?.site?.name || '',
            url: systemSettings.payload?.site?.url || ''
        },
        language: systemSettings.payload?.site?.language || config.language
    };
}

const DEFAULT_CONFIG: JsonLdConfig = {
    organization: {
        name: '',
        url: '',
        logoMediaId: '',
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
        'json-ld-structured-data:config:get': handleRPC(async (sdk: ServerSDK) => {
            const storedConfig = await sdk.settings.get(SETTINGS_KEY);
            const config = {...DEFAULT_CONFIG, ...(storedConfig || {})};
            return mergeSystemSettings(sdk, config);
        }),

        'json-ld-structured-data:config:set': handleRPC(async (sdk: ServerSDK, {config}: { config: any }) => {
            // Strip out system-managed fields, keep only plugin-specific settings
            const cleanConfig = {
                ...config,
                organization: {
                    name: '', // Will be overridden by system settings
                    url: '', // Will be overridden by system settings
                    logoMediaId: '', // Will be overridden by system settings
                    sameAs: config.organization?.sameAs || []
                },
                website: {
                    name: '', // Will be overridden by system settings
                    url: '', // Will be overridden by system settings
                    searchAction: config.website?.searchAction || false,
                    searchUrlTemplate: config.website?.searchUrlTemplate
                }
            };

            await sdk.settings.set(SETTINGS_KEY, cleanConfig);
            return mergeSystemSettings(sdk, cleanConfig);
        }),

        'json-ld-structured-data:blog:get': handleRPC(async (sdk: ServerSDK, {blogId}: { blogId: string }) => {
            const blog = await sdk.db.generated.getHydratedBlog({_id: blogId});
            return blog?.metadata?.[METADATA_KEY] || {};
        }),

        'json-ld-structured-data:blog:set': handleRPC(async (sdk: ServerSDK, {blogId, overrides}: {
            blogId: string;
            overrides: JsonLdOverrides
        }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});
            if (!blog) throw new ValidationError('Blog not found', 404);

            await sdk.db.blogs.updateOne(
                {_id: blogId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return overrides;
        }),

        'json-ld-structured-data:generate': handleRPC(async (sdk: ServerSDK, {blogId}: { blogId: string }) => {
            const [blog, storedConfig] = await Promise.all([
                sdk.db.generated.getHydratedBlog({_id: blogId}),
                sdk.settings.get(SETTINGS_KEY)
            ]);

            if (!blog) throw new ValidationError('Blog not found', 404);

            const config = {...DEFAULT_CONFIG, ...(storedConfig || {})};
            const mergedConfig = await mergeSystemSettings(sdk, config);
            const overrides = blog.metadata?.[METADATA_KEY] || {};
            return generateJsonLd('blog', blog, mergedConfig, overrides);
        }),

        // Tag endpoints
        'json-ld-structured-data:tag:get': handleRPC(async (sdk: ServerSDK, {tagId}: { tagId: string }) => {
            const tag = await sdk.db.tags.findOne({_id: tagId});
            return tag?.metadata?.[METADATA_KEY] || {};
        }),

        'json-ld-structured-data:tag:set': handleRPC(async (sdk: ServerSDK, {tagId, overrides}: {
            tagId: string;
            overrides: JsonLdOverrides
        }) => {
            const tag = await sdk.db.tags.findOne({_id: tagId});
            if (!tag) throw new ValidationError('Tag not found', 404);

            await sdk.db.tags.updateOne(
                {_id: tagId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return overrides;
        }),

        'json-ld-structured-data:tag:generate': handleRPC(async (sdk: ServerSDK, {tagId}: { tagId: string }) => {
            const [tag, storedConfig] = await Promise.all([
                sdk.db.tags.findOne({_id: tagId}),
                sdk.settings.get(SETTINGS_KEY)
            ]);

            if (!tag) throw new ValidationError('Tag not found', 404);

            const config = {...DEFAULT_CONFIG, ...(storedConfig || {})};
            const mergedConfig = await mergeSystemSettings(sdk, config);
            const overrides = tag.metadata?.[METADATA_KEY] || {};
            return generateJsonLd('tag', tag, mergedConfig, overrides);
        }),

        // Category endpoints
        'json-ld-structured-data:category:get': handleRPC(async (sdk: ServerSDK, {categoryId}: {
            categoryId: string
        }) => {
            const category = await sdk.db.categories.findOne({_id: categoryId});
            return category?.metadata?.[METADATA_KEY] || {};
        }),

        'json-ld-structured-data:category:set': handleRPC(async (sdk: ServerSDK, {categoryId, overrides}: {
            categoryId: string;
            overrides: JsonLdOverrides
        }) => {
            const category = await sdk.db.categories.findOne({_id: categoryId});
            if (!category) throw new ValidationError('Category not found', 404);

            await sdk.db.categories.updateOne(
                {_id: categoryId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return overrides;
        }),

        'json-ld-structured-data:category:generate': handleRPC(async (sdk: ServerSDK, {categoryId}: {
            categoryId: string
        }) => {
            const [category, storedConfig] = await Promise.all([
                sdk.db.categories.findOne({_id: categoryId}),
                sdk.settings.get(SETTINGS_KEY)
            ]);

            if (!category) throw new ValidationError('Category not found', 404);

            const config = {...DEFAULT_CONFIG, ...(storedConfig || {})};
            const mergedConfig = await mergeSystemSettings(sdk, config);
            const overrides = category.metadata?.[METADATA_KEY] || {};
            return generateJsonLd('category', category, mergedConfig, overrides);
        }),

        // User endpoints
        'json-ld-structured-data:user:get': handleRPC(async (sdk: ServerSDK, {userId}: { userId: string }) => {
            const user = await sdk.db.users.findOne({_id: userId});
            return user?.metadata?.[METADATA_KEY] || {};
        }),

        'json-ld-structured-data:user:set': handleRPC(async (sdk: ServerSDK, {userId, overrides}: {
            userId: string;
            overrides: JsonLdOverrides
        }) => {
            const user = await sdk.db.users.findOne({_id: userId});
            if (!user) throw new ValidationError('User not found', 404);

            await sdk.db.users.updateOne(
                {_id: userId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return overrides;
        }),

        'json-ld-structured-data:user:generate': handleRPC(async (sdk: ServerSDK, {userId}: { userId: string }) => {
            const [user, storedConfig] = await Promise.all([
                sdk.db.users.findOne({_id: userId}),
                sdk.settings.get(SETTINGS_KEY)
            ]);

            if (!user) throw new ValidationError('User not found', 404);

            const config = {...DEFAULT_CONFIG, ...(storedConfig || {})};
            const mergedConfig = await mergeSystemSettings(sdk, config);
            const overrides = user.metadata?.[METADATA_KEY] || {};
            return generateJsonLd('user', user, mergedConfig, overrides);
        }),

        // Generic generateJsonLd RPC - automatically fetches config and overrides
        'json-ld-structured-data:generateJsonLd': handleRPC(async (sdk: ServerSDK, {entityType, entity}: {
            entityType: 'blog' | 'tag' | 'category' | 'user';
            entity: any;
        }) => {
            // Fetch config from settings
            const config = await sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG;

            // Fetch overrides from entity metadata
            const overrides = entity?.metadata?.[METADATA_KEY] || {};

            return generateJsonLd(entityType, entity, config, overrides);
        }),
    }
});