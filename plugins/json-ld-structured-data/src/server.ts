import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import {generateJsonLd} from './jsonld-generator.js';

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

        'json-ld-structured-data:blog:get': async (sdk: ServerSDK, {blogId}: { blogId: string }) => {
            const blog = await sdk.db.generated.getHydratedBlog({_id: blogId});
            const overrides = blog?.metadata?.[METADATA_KEY] || {};
            return {code: 0, message: 'ok', payload: overrides};
        },

        'json-ld-structured-data:blog:set': async (sdk: ServerSDK, {blogId, overrides}: {
            blogId: string;
            overrides: JsonLdOverrides
        }) => {
            const blog = await sdk.db.blogs.findOne({_id: blogId});
            if (!blog) return {code: 404, message: 'Blog not found'};

            await sdk.db.blogs.updateOne(
                {_id: blogId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return {code: 0, message: 'saved', payload: overrides};
        },

        'json-ld-structured-data:generate': async (sdk: ServerSDK, {blogId}: { blogId: string }) => {
            const [blog, config] = await Promise.all([
                sdk.db.generated.getHydratedBlog({_id: blogId}),
                sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG
            ]);

            if (!blog) return {code: 404, message: 'Blog not found'};

            const overrides = blog.metadata?.[METADATA_KEY] || {};
            const jsonLd = generateJsonLd('blog', blog, config as any, overrides);

            return {code: 0, message: 'ok', payload: jsonLd};
        },

        // Tag endpoints
        'json-ld-structured-data:tag:get': async (sdk: ServerSDK, {tagId}: { tagId: string }) => {
            const tag = await sdk.db.tags.findOne({_id: tagId});
            const overrides = tag?.metadata?.[METADATA_KEY] || {};
            return {code: 0, message: 'ok', payload: overrides};
        },

        'json-ld-structured-data:tag:set': async (sdk: ServerSDK, {tagId, overrides}: {
            tagId: string;
            overrides: JsonLdOverrides
        }) => {
            const tag = await sdk.db.tags.findOne({_id: tagId});
            if (!tag) return {code: 404, message: 'Tag not found'};

            await sdk.db.tags.updateOne(
                {_id: tagId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return {code: 0, message: 'saved', payload: overrides};
        },

        'json-ld-structured-data:tag:generate': async (sdk: ServerSDK, {tagId}: { tagId: string }) => {
            const [tag, config] = await Promise.all([
                sdk.db.tags.findOne({_id: tagId}),
                sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG
            ]);

            if (!tag) return {code: 404, message: 'Tag not found'};

            const overrides = tag.metadata?.[METADATA_KEY] || {};
            const jsonLd = generateJsonLd('tag', tag, config as any, overrides);

            return {code: 0, message: 'ok', payload: jsonLd};
        },

        // Category endpoints
        'json-ld-structured-data:category:get': async (sdk: ServerSDK, {categoryId}: { categoryId: string }) => {
            const category = await sdk.db.categories.findOne({_id: categoryId});
            const overrides = category?.metadata?.[METADATA_KEY] || {};
            return {code: 0, message: 'ok', payload: overrides};
        },

        'json-ld-structured-data:category:set': async (sdk: ServerSDK, {categoryId, overrides}: {
            categoryId: string;
            overrides: JsonLdOverrides
        }) => {
            const category = await sdk.db.categories.findOne({_id: categoryId});
            if (!category) return {code: 404, message: 'Category not found'};

            await sdk.db.categories.updateOne(
                {_id: categoryId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return {code: 0, message: 'saved', payload: overrides};
        },

        'json-ld-structured-data:category:generate': async (sdk: ServerSDK, {categoryId}: { categoryId: string }) => {
            const [category, config] = await Promise.all([
                sdk.db.categories.findOne({_id: categoryId}),
                sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG
            ]);

            if (!category) return {code: 404, message: 'Category not found'};

            const overrides = category.metadata?.[METADATA_KEY] || {};
            const jsonLd = generateJsonLd('category', category, config as any, overrides);

            return {code: 0, message: 'ok', payload: jsonLd};
        },

        // User endpoints
        'json-ld-structured-data:user:get': async (sdk: ServerSDK, {userId}: { userId: string }) => {
            const user = await sdk.db.users.findOne({_id: userId});
            const overrides = user?.metadata?.[METADATA_KEY] || {};
            return {code: 0, message: 'ok', payload: overrides};
        },

        'json-ld-structured-data:user:set': async (sdk: ServerSDK, {userId, overrides}: {
            userId: string;
            overrides: JsonLdOverrides
        }) => {
            const user = await sdk.db.users.findOne({_id: userId});
            if (!user) return {code: 404, message: 'User not found'};

            await sdk.db.users.updateOne(
                {_id: userId},
                {
                    metadata: {[METADATA_KEY]: overrides},
                    updatedAt: Date.now()
                }
            );

            return {code: 0, message: 'saved', payload: overrides};
        },

        'json-ld-structured-data:user:generate': async (sdk: ServerSDK, {userId}: { userId: string }) => {
            const [user, config] = await Promise.all([
                sdk.db.users.findOne({_id: userId}),
                sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG
            ]);

            if (!user) return {code: 404, message: 'User not found'};

            const overrides = user.metadata?.[METADATA_KEY] || {};
            const jsonLd = generateJsonLd('user', user, config as any, overrides);

            return {code: 0, message: 'ok', payload: jsonLd};
        },

        // Generic generateJsonLd RPC - automatically fetches config and overrides
        'json-ld-structured-data:generateJsonLd': async (sdk: ServerSDK, {
            entityType,
            entity
        }: {
            entityType: 'blog' | 'tag' | 'category' | 'user';
            entity: any;
        }) => {

            // Fetch config from settings
            const config = await sdk.settings.get(SETTINGS_KEY) || DEFAULT_CONFIG;

            // Fetch overrides from entity metadata
            const overrides = entity?.metadata?.[METADATA_KEY] || {};

            const jsonLd = generateJsonLd(entityType, entity, config, overrides);
            return {code: 0, message: 'ok', payload: jsonLd};
        }
    }
});