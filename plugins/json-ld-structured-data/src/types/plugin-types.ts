import type {SchemaType} from './core-types.js';

// Re-export SchemaType for backward compatibility
export type {SchemaType} from './core-types.js';

// Plugin-specific types
export interface GlobalJsonLdSettings {
    // Organization settings
    organization?: {
        name?: string;
        url?: string;
        logo?: string;
        description?: string;
        sameAs?: string[];
        address?: {
            streetAddress?: string;
            addressLocality?: string;
            addressRegion?: string;
            postalCode?: string;
            addressCountry?: string;
        };
        telephone?: string;
        email?: string;
    };

    // Website settings
    website?: {
        name?: string;
        url?: string;
        description?: string;
        searchAction?: {
            enabled: boolean;
            urlTemplate?: string;
        };
    };

    // Default article settings
    article?: {
        defaultAuthor?: {
            type: 'person' | 'organization';
            name?: string;
            url?: string;
            image?: string;
        };
        defaultPublisher?: boolean; // Use organization as publisher
        defaultImagePolicy?: 'featured' | 'first' | 'none';
    };

    // Global language
    defaultLanguage?: string;
}

export interface BlogJsonLdOverrides {
    // Content type
    '@type'?: SchemaType;

    // Override flags
    overrides?: Record<string, boolean>;

    // Custom values
    custom?: {
        [key: string]: any;
        headline?: string;
        description?: string;
        author?: {
            type: 'person' | 'organization';
            name?: string;
            url?: string;
            image?: string;
        }[];
        publisher?: {
            name?: string;
            url?: string;
            logo?: string;
        };
        image?: string[];
        keywords?: string[];
        articleSection?: string[];
        language?: string;
        url?: string;
        about?: string[];
        mentions?: string[];
        // Review-specific fields
        itemName?: string;
        itemType?: string;
        ratingValue?: number;
        bestRating?: number;
        worstRating?: number;
    };

    // Type-specific fields
    howTo?: {
        totalTime?: string;
        prepTime?: string;
        performTime?: string;
        tool?: string[];
        supply?: string[];
        steps?: Array<{
            name?: string;
            text: string;
            image?: string;
        }>;
        estimatedCost?: string;
        yield?: string;
    };

    faq?: {
        questions?: Array<{
            question: string;
            answer: string;
        }>;
    };

    review?: {
        itemName?: string;
        itemType?: string;
        rating?: {
            value: number;
            best?: number;
            worst?: number;
        };
    };
}

// Blog data structure from database
export interface BlogData {
    id: string;
    title: string;
    content: any; // ContentObject
    excerpt?: string;
    featuredImage?: string;
    author?: {
        id: string;
        username: string;
        email?: string;
        profile?: any;
    };
    categories?: Array<{ id: string; name: string; slug: string }>;
    tags?: Array<{ id: string; name: string; slug: string }>;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    status: string;
    slug: string;
    metadata?: Record<string, any>;
}

// Merge context for JSON-LD generation
export interface MergeContext {
    blogData: BlogData;
    globalSettings: GlobalJsonLdSettings;
    overrides: BlogJsonLdOverrides;
    baseUrl: string;
}

// Schema field definitions for type picker
export interface SchemaFieldDefinition {
    key: string;
    label: string;
    type: 'text' | 'url' | 'textarea' | 'date' | 'number' | 'select' | 'multiselect' | 'array' | 'image';
    required?: boolean;
    description?: string;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
    };
    dependsOn?: string; // Show only when another field has specific value
    defaultFrom?: 'blog' | 'global' | 'auto'; // Where to derive default value
    // For array type fields
    itemSchema?: {
        type: 'object';
        properties: Record<string, {
            type: string;
            label: string;
            description?: string;
            required?: boolean;
        }>;
    };
}

export interface SchemaTypeDefinition {
    type: SchemaType;
    label: string;
    description: string;
    icon?: string;
    fields: SchemaFieldDefinition[];
    requiredFields: string[];
}