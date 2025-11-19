/**
 * Content Converters
 * Utilities to convert ContentObject to/from other formats
 */

import type {ContentObject, InlineNode, ParagraphLayout} from './types';
import {contentObjectToHTML as contentObjectToHtmlFromUtils} from '@supergrowthai/utils/content-transformers';

/**
 * Convert ContentObject to HTML
 * Now uses the shared implementation from utils package
 */
export function contentObjectToHtml(content: ContentObject | string): string {
    return contentObjectToHtmlFromUtils(
        typeof content === 'string' ? JSON.parse(content) : content
    );
}

/**
 * Escape HTML special characters while preserving valid HTML entities
 */
function escapeHtml(text: string): string {
    // First, temporarily replace valid HTML entities with placeholders
    const entityMap: Record<string, string> = {};
    let entityCounter = 0;

    // Common HTML entities to preserve
    const validEntities = /&(?:nbsp|amp|lt|gt|quot|apos|#(?:\d+|x[0-9a-fA-F]+));/g;
    const textWithPlaceholders = text.replace(validEntities, (entity) => {
        const placeholder = `__ENTITY_${entityCounter++}__`;
        entityMap[placeholder] = entity;
        return placeholder;
    });

    // Now escape remaining special characters
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    const escapedText = textWithPlaceholders.replace(/[&<>"']/g, m => map[m]);

    // Restore the preserved entities
    return escapedText.replace(/__ENTITY_\d+__/g, placeholder => entityMap[placeholder] || placeholder);
}

/**
 * Convert ContentObject to plain text
 */
export function contentObjectToPlainText(content: ContentObject | string): string {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return escapeHtml(typeof content === 'string' ? content : ''); // Return as-is if not JSON
        }
    }

    const textParts: string[] = [];

    for (const block of content.content) {
        switch (block.name) {
            case 'Paragraph':
                const paragraphText = block.data.map(node => extractTextFromInlineNode(node)).join('');
                if (paragraphText) {
                    textParts.push(paragraphText);
                }
                break;
            case 'Subheading':
                textParts.push(block.data.subheading);
                break;
            case 'List':
                textParts.push(...block.data.items.map(item => `• ${item.data}`));
                break;
            case 'Table':
                for (const row of block.data.content) {
                    textParts.push(row.join(' | '));
                }
                break;
            case 'Quote':
                textParts.push(`"${block.data.text}"`);
                if (block.data.caption) {
                    textParts.push(`— ${block.data.caption}`);
                }
                break;
            case 'Code':
                textParts.push(block.data.code);
                break;
            case 'Text':
                textParts.push(block.data);
                break;
        }
    }

    return textParts.join('\n\n').trim();
}

/**
 * Extract text from inline nodes (helper)
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
        case 'InlineCode':
            return node.data;
        default:
            return '';
    }
}

/**
 * Create an empty ContentObject
 */
export function createEmptyContentObject(): ContentObject {
    return {
        version: 1,
        content: []
    };
}

/**
 * Create a paragraph block from text
 */
export function createParagraphBlock(text: string): ParagraphLayout {
    return {
        name: 'Paragraph',
        version: 1,
        data: [{
            name: 'Text',
            version: 1,
            data: text
        }]
    };
}

/**
 * Validate if a string is a valid ContentObject JSON
 */
export function isValidContentObject(content: string): boolean {
    try {
        const parsed = JSON.parse(content);
        return parsed &&
            typeof parsed === 'object' &&
            typeof parsed.version === 'number' &&
            Array.isArray(parsed.content);
    } catch {
        return false;
    }
}

/**
 * Parse content safely (string or ContentObject)
 */
export function parseContent(content: string | ContentObject): ContentObject | null {
    if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content);
            if (isValidContentObject(JSON.stringify(parsed))) {
                return parsed as ContentObject;
            }
        } catch {
            // If it's not JSON, create a simple text block
            return {
                version: 1,
                content: [createParagraphBlock(content)]
            };
        }
    } else if (content && typeof content === 'object' && 'content' in content) {
        return content;
    }
    return null;
}