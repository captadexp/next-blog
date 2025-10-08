import {extractTextFromContent, getWordCount} from '@supergrowthai/plugin-dev-kit/content';
import type {Article, Organization, Person} from '../types/core-types.js';
import type {MergeContext} from '../types/plugin-types.js';
import {getFieldValue, generateAuthorField} from '../utils/field-utils.js';
import {getImages} from '../utils/image-utils.js';

/**
 * Generate Article schema (and its subtypes)
 */
export function generateArticleSchema(context: MergeContext, schemaType: string): Article {
    const {blogData, globalSettings, overrides, baseUrl} = context;

    // Build canonical URL
    const canonicalUrl = getFieldValue('url', context) || `${baseUrl}/blog/${blogData.slug}`;

    const article: Article = {
        '@context': 'https://schema.org',
        '@type': schemaType as Article['@type'],
        headline: getFieldValue('headline', context) || blogData.title,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl
    };

    // Description
    const description = getFieldValue('description', context) || blogData.excerpt || extractTextFromContent(blogData.content).substring(0, 160);
    if (description) {
        article.description = description;
    }

    // Author
    const author = generateAuthorField(context);
    if (author) {
        article.author = author;
    }

    // Publisher
    if (globalSettings.article?.defaultPublisher && globalSettings.organization?.name && globalSettings.organization?.url) {
        article.publisher = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: globalSettings.organization.name,
            url: globalSettings.organization.url,
            ...(globalSettings.organization.logo && {
                logo: {
                    '@type': 'ImageObject',
                    url: globalSettings.organization.logo
                }
            })
        };
    }

    // Dates
    if (blogData.publishedAt || blogData.createdAt) {
        article.datePublished = getFieldValue('datePublished', context) || blogData.publishedAt || blogData.createdAt;
    }

    if (blogData.updatedAt) {
        article.dateModified = getFieldValue('dateModified', context) || blogData.updatedAt;
    }

    // Images
    const images = getImages(context);
    if (images.length > 0) {
        article.image = images.length === 1 ? images[0] : images;
    }

    // Keywords
    const keywords = getFieldValue('keywords', context);
    if (keywords?.length) {
        article.keywords = keywords;
    } else if (blogData.tags?.length) {
        article.keywords = blogData.tags.map(tag => tag.name);
    }

    // Article sections/categories
    const articleSection = getFieldValue('articleSection', context);
    if (articleSection?.length) {
        article.articleSection = articleSection;
    } else if (blogData.categories?.length) {
        article.articleSection = blogData.categories.map(cat => cat.name);
    }

    // Word count
    const wordCount = getWordCount(blogData.content);
    if (wordCount > 0) {
        article.wordCount = wordCount;
    }

    // Language
    const language = getFieldValue('language', context) || globalSettings.defaultLanguage;
    if (language) {
        article.inLanguage = language;
    }

    // About and mentions for custom fields
    if (overrides.custom?.about?.length) {
        article.about = overrides.custom.about.map(topic => ({
            '@type': 'Thing',
            name: topic
        }));
    }

    if (overrides.custom?.mentions?.length) {
        article.mentions = overrides.custom.mentions.map(mention => ({
            '@type': 'Thing',
            name: mention
        }));
    }

    return article;
}