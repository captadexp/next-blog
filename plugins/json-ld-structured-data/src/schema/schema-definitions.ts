import type {SchemaTypeDefinition} from '../types/plugin-types.js';
import {commonFields} from './field-definitions.js';

// Schema type definitions
export const schemaTypes: SchemaTypeDefinition[] = [
    {
        type: 'Article',
        label: 'Article',
        description: 'General article content - blog posts, news, etc.',
        icon: '📄',
        fields: [
            commonFields.headline,
            commonFields.description,
            commonFields.image,
            commonFields.author,
            commonFields.datePublished,
            commonFields.dateModified,
            commonFields.keywords,
            {
                key: 'articleSection',
                label: 'Article Section',
                type: 'multiselect' as const,
                description: 'Categories or sections this article belongs to',
                defaultFrom: 'blog' as const
            },
            {
                key: 'wordCount',
                label: 'Word Count',
                type: 'number' as const,
                description: 'Number of words in the article',
                defaultFrom: 'auto' as const
            },
            commonFields.language,
            commonFields.url
        ],
        requiredFields: ['headline']
    },
    {
        type: 'BlogPosting',
        label: 'Blog Post',
        description: 'Blog post content with enhanced blog-specific properties',
        icon: '📝',
        fields: [
            commonFields.headline,
            commonFields.description,
            commonFields.image,
            commonFields.author,
            commonFields.datePublished,
            commonFields.dateModified,
            commonFields.keywords,
            {
                key: 'articleSection',
                label: 'Blog Categories',
                type: 'multiselect' as const,
                description: 'Blog categories this post belongs to',
                defaultFrom: 'blog' as const
            },
            {
                key: 'wordCount',
                label: 'Word Count',
                type: 'number' as const,
                description: 'Number of words in the post',
                defaultFrom: 'auto' as const
            },
            commonFields.language,
            commonFields.url
        ],
        requiredFields: ['headline']
    },
    {
        type: 'NewsArticle',
        label: 'News Article',
        description: 'News content with journalistic properties',
        icon: '📰',
        fields: [
            commonFields.headline,
            commonFields.description,
            commonFields.image,
            commonFields.author,
            commonFields.datePublished,
            commonFields.dateModified,
            {
                key: 'articleSection',
                label: 'News Section',
                type: 'select' as const,
                description: 'News category or section',
                options: [
                    {value: 'politics', label: 'Politics'},
                    {value: 'business', label: 'Business'},
                    {value: 'technology', label: 'Technology'},
                    {value: 'sports', label: 'Sports'},
                    {value: 'entertainment', label: 'Entertainment'},
                    {value: 'health', label: 'Health'},
                    {value: 'science', label: 'Science'},
                    {value: 'world', label: 'World News'},
                    {value: 'local', label: 'Local News'}
                ]
            },
            {
                key: 'dateline',
                label: 'Dateline',
                type: 'text' as const,
                description: 'Location where the news occurred'
            },
            commonFields.keywords,
            commonFields.language,
            commonFields.url
        ],
        requiredFields: ['headline', 'datePublished']
    },
    {
        type: 'TechArticle',
        label: 'Technical Article',
        description: 'Technical documentation, tutorials, and guides',
        icon: '⚙️',
        fields: [
            commonFields.headline,
            commonFields.description,
            commonFields.image,
            commonFields.author,
            commonFields.datePublished,
            commonFields.dateModified,
            {
                key: 'dependencies',
                label: 'Dependencies',
                type: 'multiselect' as const,
                description: 'Required tools, software, or knowledge'
            },
            {
                key: 'proficiencyLevel',
                label: 'Difficulty Level',
                type: 'select' as const,
                description: 'Target skill level',
                options: [
                    {value: 'Beginner', label: 'Beginner'},
                    {value: 'Intermediate', label: 'Intermediate'},
                    {value: 'Advanced', label: 'Advanced'},
                    {value: 'Expert', label: 'Expert'}
                ]
            },
            commonFields.keywords,
            commonFields.language,
            commonFields.url
        ],
        requiredFields: ['headline']
    },
    {
        type: 'HowTo',
        label: 'How-To Guide',
        description: 'Step-by-step instructional content',
        icon: '📋',
        fields: [
            {
                key: 'name',
                label: 'Guide Title',
                type: 'text' as const,
                required: true,
                description: 'Title of the how-to guide',
                defaultFrom: 'blog' as const
            },
            commonFields.description,
            commonFields.image,
            commonFields.author,
            commonFields.datePublished,
            commonFields.dateModified,
            {
                key: 'totalTime',
                label: 'Total Time',
                type: 'text' as const,
                description: 'Total time needed (e.g., PT30M for 30 minutes)',
                placeholder: 'PT30M'
            },
            {
                key: 'prepTime',
                label: 'Preparation Time',
                type: 'text' as const,
                description: 'Time needed for preparation',
                placeholder: 'PT10M'
            },
            {
                key: 'performTime',
                label: 'Performance Time',
                type: 'text' as const,
                description: 'Time to actually perform the task',
                placeholder: 'PT20M'
            },
            {
                key: 'tool',
                label: 'Required Tools',
                type: 'multiselect' as const,
                description: 'Tools needed to complete the task'
            },
            {
                key: 'supply',
                label: 'Required Supplies',
                type: 'multiselect' as const,
                description: 'Materials or supplies needed'
            },
            {
                key: 'estimatedCost',
                label: 'Estimated Cost',
                type: 'text' as const,
                description: 'Estimated cost to complete (e.g., $25)',
                placeholder: '$25'
            },
            {
                key: 'yield',
                label: 'Yield/Output',
                type: 'text' as const,
                description: 'What the process produces or how much',
                placeholder: '4 servings'
            },
            {
                key: 'steps',
                label: 'How-To Steps',
                type: 'array' as const,
                description: 'Step-by-step instructions for completing the task',
                itemSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'text',
                            label: 'Step Title',
                            description: 'Optional title for this step'
                        },
                        text: {
                            type: 'textarea',
                            label: 'Step Instructions',
                            description: 'Detailed instructions for this step',
                            required: true
                        },
                        image: {
                            type: 'url',
                            label: 'Step Image',
                            description: 'Optional image showing this step'
                        }
                    }
                }
            },
            commonFields.language,
            commonFields.url
        ],
        requiredFields: ['name','totalTime']
    },
    {
        type: 'Recipe',
        label: 'Recipe',
        description: 'Cooking and food preparation instructions',
        icon: '👨‍🍳',
        fields: [
            {
                key: 'name',
                label: 'Recipe Name',
                type: 'text' as const,
                required: true,
                description: 'Name of the recipe',
                defaultFrom: 'blog' as const
            },
            commonFields.description,
            commonFields.image,
            commonFields.author,
            commonFields.datePublished,
            {
                key: 'recipeCategory',
                label: 'Recipe Category',
                type: 'select' as const,
                description: 'Type of recipe',
                options: [
                    {value: 'appetizer', label: 'Appetizer'},
                    {value: 'main course', label: 'Main Course'},
                    {value: 'side dish', label: 'Side Dish'},
                    {value: 'dessert', label: 'Dessert'},
                    {value: 'beverage', label: 'Beverage'},
                    {value: 'snack', label: 'Snack'},
                    {value: 'breakfast', label: 'Breakfast'},
                    {value: 'lunch', label: 'Lunch'},
                    {value: 'dinner', label: 'Dinner'}
                ]
            },
            {
                key: 'recipeCuisine',
                label: 'Cuisine',
                type: 'text' as const,
                description: 'Cuisine type (e.g., Italian, Mexican, Asian)',
                placeholder: 'Italian'
            },
            {
                key: 'prepTime',
                label: 'Prep Time',
                type: 'text' as const,
                description: 'Preparation time (e.g., PT15M)',
                placeholder: 'PT15M'
            },
            {
                key: 'cookTime',
                label: 'Cook Time',
                type: 'text' as const,
                description: 'Cooking time (e.g., PT30M)',
                placeholder: 'PT30M'
            },
            {
                key: 'totalTime',
                label: 'Total Time',
                type: 'text' as const,
                description: 'Total time needed',
                placeholder: 'PT45M'
            },
            {
                key: 'recipeYield',
                label: 'Servings',
                type: 'text' as const,
                description: 'Number of servings',
                placeholder: '4 servings'
            },
            {
                key: 'calories',
                label: 'Calories',
                type: 'number' as const,
                description: 'Calories per serving'
            },
            commonFields.language,
            commonFields.url
        ],
        requiredFields: ['name']
    },
    {
        type: 'FAQPage',
        label: 'FAQ Page',
        description: 'Frequently Asked Questions content',
        icon: '❓',
        fields: [
            {
                key: 'name',
                label: 'FAQ Page Title',
                type: 'text' as const,
                description: 'Title of the FAQ page',
                defaultFrom: 'blog' as const
            },
            commonFields.description,
            commonFields.author,
            commonFields.datePublished,
            commonFields.dateModified,
            {
                key: 'about',
                label: 'Topic/Subject',
                type: 'text' as const,
                description: 'What the FAQ is about'
            },
            commonFields.language,
            commonFields.url
        ],
        requiredFields: []
    },
    {
        type: 'Review',
        label: 'Review',
        description: 'Product, service, or content review',
        icon: '⭐',
        fields: [
            {
                key: 'name',
                label: 'Review Title',
                type: 'text' as const,
                description: 'Title of the review',
                defaultFrom: 'blog' as const
            },
            commonFields.description,
            commonFields.author,
            commonFields.datePublished,
            {
                key: 'itemName',
                label: 'Item Being Reviewed',
                type: 'text' as const,
                required: true,
                description: 'Name of the product/service being reviewed'
            },
            {
                key: 'itemType',
                label: 'Item Type',
                type: 'select' as const,
                description: 'Type of item being reviewed',
                options: [
                    {value: 'Product', label: 'Product'},
                    {value: 'Service', label: 'Service'},
                    {value: 'Book', label: 'Book'},
                    {value: 'Movie', label: 'Movie'},
                    {value: 'Restaurant', label: 'Restaurant'},
                    {value: 'Software', label: 'Software'},
                    {value: 'Game', label: 'Game'},
                    {value: 'Course', label: 'Course'}
                ]
            },
            {
                key: 'ratingValue',
                label: 'Rating',
                type: 'number' as const,
                required: true,
                description: 'Rating value (1-5)',
                validation: {min: 1, max: 5}
            },
            {
                key: 'bestRating',
                label: 'Best Possible Rating',
                type: 'number' as const,
                description: 'Highest rating possible (default: 5)',
                placeholder: '5'
            },
            {
                key: 'worstRating',
                label: 'Worst Possible Rating',
                type: 'number' as const,
                description: 'Lowest rating possible (default: 1)',
                placeholder: '1'
            },
            commonFields.language,
            commonFields.url
        ],
        requiredFields: ['itemName', 'ratingValue']
    }
];

// Get schema type definition by type
export function getSchemaTypeDefinition(type: string): SchemaTypeDefinition | undefined {
    return schemaTypes.find(def => def.type === type);
}

// Get all available schema types
export function getAllSchemaTypes(): SchemaTypeDefinition[] {
    return schemaTypes;
}

// Get fields for a specific schema type
export function getFieldsForType(type: string): any[] {
    const definition = getSchemaTypeDefinition(type);
    return definition?.fields || [];
}

// Get required fields for a specific schema type
export function getRequiredFieldsForType(type: string): string[] {
    const definition = getSchemaTypeDefinition(type);
    return definition?.requiredFields || [];
}