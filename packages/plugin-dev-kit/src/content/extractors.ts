/**
 * Content Extractors
 * Utilities to extract specific data from ContentObject structures
 */

import type {
    ContentObject,
    InlineNode,
    ExtractedLink,
    ExtractedImage,
    ExtractedHeading
} from './types';

/**
 * Extract plain text from inline nodes
 */
function extractTextFromInlineNode(node: InlineNode): string {
    switch (node.name) {
        case 'Text':
            return node.data;
        case 'Italic':
        case 'Highlight':
            return node.data.map(extractTextFromInlineNode).join('');
        case 'Link':
            return node.data.content.map(extractTextFromInlineNode).join('');
        case 'Underline':
        case 'StrickThrough':
            return node.data;
        default:
            return '';
    }
}

/**
 * Extract all plain text from a ContentObject
 */
export function extractTextFromContent(content: ContentObject | string): string {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return typeof content === 'string' ? content : ''; // Return as-is if not JSON
        }
    }

    const textParts: string[] = [];

    for (const block of content.content) {
        switch (block.name) {
            case 'Paragraph':
                textParts.push(block.data.map(extractTextFromInlineNode).join(''));
                break;
            case 'Subheading':
                textParts.push(block.data.subheading);
                break;
            case 'List':
                textParts.push(...block.data.items.map(item => item.data));
                break;
            case 'Table':
                for (const row of block.data.content) {
                    textParts.push(...row);
                }
                break;
            case 'Quote':
                textParts.push(block.data.text);
                if (block.data.caption) {
                    textParts.push(block.data.caption);
                }
                break;
            case 'Code':
                textParts.push(block.data.code);
                break;
            case 'Text':
                textParts.push(block.data);
                break;
            // Skip images, embeds, and other non-text content
        }
    }

    return textParts.join(' ').trim();
}

/**
 * Extract links from inline nodes
 */
function extractLinksFromInlineNode(node: InlineNode, links: ExtractedLink[]): void {
    switch (node.name) {
        case 'Link':
            const linkText = node.data.content.map(extractTextFromInlineNode).join('');
            links.push({
                url: node.data.url,
                text: linkText,
                type: 'link'
            });
            break;
        case 'Italic':
        case 'Highlight':
            node.data.forEach(child => extractLinksFromInlineNode(child, links));
            break;
    }
}

/**
 * Extract all links from a ContentObject
 */
export function extractLinksFromContent(content: ContentObject | string): ExtractedLink[] {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return [];
        }
    }

    const links: ExtractedLink[] = [];

    for (const block of content.content) {
        switch (block.name) {
            case 'Paragraph':
                block.data.forEach(node => extractLinksFromInlineNode(node, links));
                break;
            case 'Image':
                links.push({
                    url: block.data.src,
                    text: block.data.alt,
                    type: 'image'
                });
                break;
            case 'Internal Embed':
                links.push({
                    url: block.data.data.url,
                    text: block.data.name,
                    type: 'embed'
                });
                break;
            case 'Link':
                const linkText = block.data.content.map(extractTextFromInlineNode).join('');
                links.push({
                    url: block.data.url,
                    text: linkText,
                    type: 'link'
                });
                break;
        }
    }

    return links;
}

/**
 * Extract all images from a ContentObject
 */
export function extractImagesFromContent(content: ContentObject | string): ExtractedImage[] {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return [];
        }
    }

    const images: ExtractedImage[] = [];

    for (const block of content.content) {
        if (block.name === 'Image') {
            images.push({
                src: block.data.src,
                alt: block.data.alt
            });
        }
    }

    return images;
}

/**
 * Extract all headings from a ContentObject
 */
export function extractHeadingsFromContent(content: ContentObject | string): ExtractedHeading[] {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return [];
        }
    }

    const headings: ExtractedHeading[] = [];

    for (const block of content.content) {
        if (block.name === 'Subheading') {
            headings.push({
                text: block.data.subheading,
                level: block.data.level || 2
            });
        }
    }

    return headings;
}

/**
 * Get word count from a ContentObject
 */
export function getWordCount(content: ContentObject | string): number {
    const text = extractTextFromContent(content);
    // Split by whitespace and filter out empty strings
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.length;
}

/**
 * Get character count from a ContentObject
 */
export function getCharacterCount(content: ContentObject | string, includeSpaces: boolean = true): number {
    const text = extractTextFromContent(content);
    return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

/**
 * Check if content has a specific block type
 */
export function hasBlockType(content: ContentObject | string, blockType: string): boolean {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return false;
        }
    }

    return content.content.some(block => block.name === blockType);
}

/**
 * Count blocks of a specific type
 */
export function countBlockType(content: ContentObject | string, blockType: string): number {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return 0;
        }
    }

    return content.content.filter(block => block.name === blockType).length;
}