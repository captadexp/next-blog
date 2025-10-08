// Core JSON-LD and Schema.org type definitions
export interface JsonLdBase {
    '@context': string | string[];
    '@type': string;
    '@id'?: string;
}

export type SchemaType =
    | 'Article'
    | 'NewsArticle'
    | 'BlogPosting'
    | 'TechArticle'
    | 'HowTo'
    | 'Recipe'
    | 'FAQPage'
    | 'Review'
    | 'Organization'
    | 'WebSite'
    | 'WebPage'
    | 'BreadcrumbList';

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

export interface WebSite extends JsonLdBase {
    '@type': 'WebSite';
    name: string;
    url: string;
    description?: string;
    publisher?: Organization;
    potentialAction?: SearchAction;
    inLanguage?: string;
}

export interface SearchAction {
    '@type': 'SearchAction';
    target: {
        '@type': 'EntryPoint';
        urlTemplate: string;
    };
    'query-input': string;
}

export interface Article extends JsonLdBase {
    '@type': 'Article' | 'NewsArticle' | 'BlogPosting' | 'TechArticle';
    headline: string;
    description?: string;
    image?: ImageObject | ImageObject[] | string | string[];
    author?: Person | Person[] | Organization | Organization[] | (Person | Organization)[];
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

export interface HowTo extends JsonLdBase {
    '@type': 'HowTo';
    name: string;
    description?: string;
    image?: ImageObject | ImageObject[] | string | string[];
    author?: Person | Person[] | Organization | Organization[] | (Person | Organization)[];
    datePublished?: string;
    dateModified?: string;
    totalTime?: string;
    prepTime?: string;
    performTime?: string;
    tool?: string | string[] | HowToTool | HowToTool[];
    supply?: string | string[] | HowToSupply | HowToSupply[];
    step?: HowToStep | HowToStep[];
    estimatedCost?: string;
    yield?: string;
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

export interface Recipe extends JsonLdBase {
    '@type': 'Recipe';
    name: string;
    description?: string;
    image?: ImageObject | ImageObject[] | string | string[];
    author?: Person | Person[] | Organization | Organization[] | (Person | Organization)[];
    datePublished?: string;
    dateModified?: string;
    recipeCategory?: string;
    recipeCuisine?: string;
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    recipeYield?: string;
    nutrition?: NutritionInformation;
    recipeIngredient?: string[];
    recipeInstructions?: (CreativeWork | string)[];
}

export interface NutritionInformation {
    '@type': 'NutritionInformation';
    calories?: number | string;
    carbohydrateContent?: string;
    proteinContent?: string;
    fatContent?: string;
    fiberContent?: string;
    sugarContent?: string;
    sodiumContent?: string;
}

export interface CreativeWork {
    '@type': 'CreativeWork';
    text?: string;
    name?: string;
}

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

export interface ImageObject {
    '@type': 'ImageObject';
    url: string;
    width?: number | string;
    height?: number | string;
    caption?: string;
    description?: string;
}

export interface PostalAddress {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
}

export interface Thing {
    '@type': string;
    name?: string;
    url?: string;
    description?: string;
    image?: ImageObject | string;
    sameAs?: string[];
}

export interface WebPage extends JsonLdBase {
    '@type': 'WebPage';
    name?: string;
    url?: string;
    description?: string;
    isPartOf?: WebSite;
    inLanguage?: string;
}


export type JsonLdOutput =
    | Organization
    | WebSite
    | Article
    | HowTo
    | Recipe
    | FAQPage
    | Review
    | Thing
    | Array<Organization | WebSite | Article | HowTo | Recipe | FAQPage | Review | Thing>;