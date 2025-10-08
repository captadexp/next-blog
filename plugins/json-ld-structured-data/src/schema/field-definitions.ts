import type {SchemaFieldDefinition} from '../types/plugin-types.js';

// Common field definitions that can be reused
export const commonFields = {
    headline: {
        key: 'headline',
        label: 'Headline',
        type: 'text' as const,
        required: true,
        description: 'The main title of the content',
        defaultFrom: 'blog' as const,
        validation: {minLength: 10, maxLength: 110}
    },
    description: {
        key: 'description',
        label: 'Description',
        type: 'textarea' as const,
        description: 'A brief description of the content',
        defaultFrom: 'blog' as const,
        validation: {minLength: 50, maxLength: 160}
    },
    image: {
        key: 'image',
        label: 'Images',
        type: 'array' as const,
        description: 'Featured images for the content',
        defaultFrom: 'blog' as const
    },
    author: {
        key: 'author',
        label: 'Author',
        type: 'text' as const,
        description: 'Content author name',
        defaultFrom: 'blog' as const
    },
    datePublished: {
        key: 'datePublished',
        label: 'Published Date',
        type: 'date' as const,
        description: 'When the content was first published',
        defaultFrom: 'blog' as const
    },
    dateModified: {
        key: 'dateModified',
        label: 'Modified Date',
        type: 'date' as const,
        description: 'When the content was last updated',
        defaultFrom: 'blog' as const
    },
    keywords: {
        key: 'keywords',
        label: 'Keywords',
        type: 'multiselect' as const,
        description: 'Relevant keywords and topics',
        defaultFrom: 'blog' as const
    },
    language: {
        key: 'language',
        label: 'Language',
        type: 'select' as const,
        description: 'Content language code',
        defaultFrom: 'global' as const,
        options: [
            {value: 'en-US', label: 'English (US)'},
            {value: 'en-GB', label: 'English (UK)'},
            {value: 'es-ES', label: 'Spanish'},
            {value: 'fr-FR', label: 'French'},
            {value: 'de-DE', label: 'German'},
            {value: 'it-IT', label: 'Italian'},
            {value: 'pt-BR', label: 'Portuguese (Brazil)'},
            {value: 'zh-CN', label: 'Chinese (Simplified)'},
            {value: 'ja-JP', label: 'Japanese'},
            {value: 'ko-KR', label: 'Korean'}
        ]
    },
    url: {
        key: 'url',
        label: 'URL',
        type: 'url' as const,
        description: 'Canonical URL for this content',
        defaultFrom: 'auto' as const
    }
} satisfies Record<string, SchemaFieldDefinition>;