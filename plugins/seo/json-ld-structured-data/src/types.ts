/**
 * JSON-LD type definitions
 */
import {ContentObject} from "@supergrowthai/plugin-dev-kit";

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
    schemaType?: string;
    headline?: string;
    name?: string;
    description?: string;
    url?: string;
    language?: string;
    hideAuthor?: boolean;
    authorType?: 'Person' | 'Organization';
    authorName?: string;
    authorUrl?: string;
    featuredImageMedia?: MediaData;
    imageMedia?: MediaData;
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

    // User-specific fields
    username?: string;
    bio?: string;

    // Generic image field
    imageMedia?: MediaData;
    url?: string;
}

export interface JsonLdSchema {
    '@context': string;
    '@type': string;

    [key: string]: any;
}

export type EntityType = 'blog' | 'tag' | 'category' | 'user';

export const ARTICLE_TYPES = ['Article', 'BlogPosting', 'NewsArticle'] as const;
export const PUBLISHER_TYPES = ['Article', 'BlogPosting', 'NewsArticle', 'HowTo', 'Recipe'] as const;