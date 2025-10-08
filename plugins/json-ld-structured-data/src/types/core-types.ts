// Core JSON-LD and Schema.org type definitions

// Base JSON-LD structure
export interface JsonLdBase {
    '@context': string | string[];
    '@type': string;
    '@id'?: string;
}

// Common schema.org types
export type SchemaType =
    | 'Article'
    | 'NewsArticle'
    | 'BlogPosting'
    | 'TechArticle'
    | 'HowTo'
    | 'Recipe'
    | 'FAQPage'
    | 'Review'
    | 'Product'
    | 'Event'
    | 'Organization'
    | 'WebSite'
    | 'WebPage'
    | 'BreadcrumbList';

// Organization schema
export interface Organization extends JsonLdBase {
    '@type': 'Organization';
    name: string;
    url: string;
    logo?: ImageObject | string;
    sameAs?: string[];
    description?: string;
    address?: PostalAddress;
    telephone?: string;
    email?: string;
}

// Website schema
export interface WebSite extends JsonLdBase {
    '@type': 'WebSite';
    name: string;
    url: string;
    description?: string;
    publisher?: Organization;
    potentialAction?: SearchAction;
    inLanguage?: string;
}

// Search action for website
export interface SearchAction {
    '@type': 'SearchAction';
    target: {
        '@type': 'EntryPoint';
        urlTemplate: string;
    };
    'query-input': string;
}

// Article types
export interface Article extends JsonLdBase {
    '@type': 'Article' | 'NewsArticle' | 'BlogPosting' | 'TechArticle';
    headline: string;
    description?: string;
    image?: ImageObject | ImageObject[] | string | string[];
    author?: Person | Person[] | Organization | Organization[];
    publisher?: Organization;
    datePublished?: string;
    dateModified?: string;
    mainEntityOfPage?: string | WebPage;
    url?: string;
    articleBody?: string;
    wordCount?: number;
    keywords?: string | string[];
    articleSection?: string | string[];
    about?: Thing | Thing[];
    mentions?: Thing | Thing[];
    inLanguage?: string;
}

// HowTo schema
export interface HowTo extends JsonLdBase {
    '@type': 'HowTo';
    name: string;
    description?: string;
    image?: ImageObject | ImageObject[] | string | string[];
    author?: Person | Person[] | Organization | Organization[];
    datePublished?: string;
    dateModified?: string;
    totalTime?: string;
    prepTime?: string;
    performTime?: string;
    tool?: string | string[] | HowToTool | HowToTool[];
    supply?: string | string[] | HowToSupply | HowToSupply[];
    step?: HowToStep | HowToStep[];
    estimatedCost?: string | MonetaryAmount;
    yield?: string | QuantitativeValue;
}

export interface HowToStep {
    '@type': 'HowToStep';
    name?: string;
    text: string;
    image?: ImageObject | string;
    url?: string;
}

export interface HowToTool {
    '@type': 'HowToTool';
    name: string;
}

export interface HowToSupply {
    '@type': 'HowToSupply';
    name: string;
}

// FAQ schema
export interface FAQPage extends JsonLdBase {
    '@type': 'FAQPage';
    mainEntity: Question | Question[];
}

export interface Question {
    '@type': 'Question';
    name: string;
    acceptedAnswer: Answer;
}

export interface Answer {
    '@type': 'Answer';
    text: string;
    author?: Person | Organization;
}

// Review schema
export interface Review extends JsonLdBase {
    '@type': 'Review';
    itemReviewed: Thing;
    reviewRating?: Rating;
    author?: Person | Organization;
    datePublished?: string;
    reviewBody?: string;
    name?: string;
}

export interface Rating {
    '@type': 'Rating';
    ratingValue: number | string;
    bestRating?: number | string;
    worstRating?: number | string;
}

// Person schema
export interface Person {
    '@type': 'Person';
    name: string;
    url?: string;
    image?: ImageObject | string;
    description?: string;
    sameAs?: string[];
    jobTitle?: string;
    worksFor?: Organization;
    email?: string;
}

// Image object
export interface ImageObject {
    '@type': 'ImageObject';
    url: string;
    width?: number | string;
    height?: number | string;
    caption?: string;
    description?: string;
}

// Address
export interface PostalAddress {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
}

// Generic Thing
export interface Thing {
    '@type': string;
    name?: string;
    url?: string;
    description?: string;
    image?: ImageObject | string;
    sameAs?: string[];
}

// WebPage
export interface WebPage extends JsonLdBase {
    '@type': 'WebPage';
    name?: string;
    url?: string;
    description?: string;
    isPartOf?: WebSite;
    inLanguage?: string;
}

// Utility types
export interface MonetaryAmount {
    '@type': 'MonetaryAmount';
    currency: string;
    value: number | string;
}

export interface QuantitativeValue {
    '@type': 'QuantitativeValue';
    value: number | string;
    unitText?: string;
}

// Final JSON-LD output type
export type JsonLdOutput =
    | Organization
    | WebSite
    | Article
    | HowTo
    | FAQPage
    | Review
    | Thing
    | Array<Organization | WebSite | Article | HowTo | FAQPage | Review | Thing>;