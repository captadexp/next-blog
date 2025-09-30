/**
 * Content Converters
 * Utilities to convert ContentObject to/from other formats
 */

import type {
    ContentObject,
    InlineNode,
    ParagraphLayout
} from './types';

/**
 * Convert inline nodes to HTML
 */
function inlineNodeToHtml(node: InlineNode): string {
    switch (node.name) {
        case 'Text':
            return escapeHtml(node.data);
        case 'Italic':
            return `<i>${node.data.map(inlineNodeToHtml).join('')}</i>`;
        case 'Highlight':
            return `<b>${node.data.map(inlineNodeToHtml).join('')}</b>`;
        case 'Link':
            const linkContent = node.data.content.map(inlineNodeToHtml).join('');
            return `<a href="${escapeHtml(node.data.url)}">${linkContent}</a>`;
        case 'Underline':
            return `<u>${escapeHtml(node.data)}</u>`;
        case 'StrickThrough':
            return `<del>${escapeHtml(node.data)}</del>`;
        default:
            return '';
    }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Convert ContentObject to HTML
 */
export function contentObjectToHtml(content: ContentObject | string): string {
    // Handle string content (might be JSON string)
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content) as ContentObject;
        } catch {
            return escapeHtml(typeof content === 'string' ? content : ''); // Return as-is if not JSON
        }
    }

    const htmlParts: string[] = [];

    for (const block of content.content) {
        switch (block.name) {
            case 'Paragraph':
                const paragraphHtml = block.data.map(inlineNodeToHtml).join('');
                if (paragraphHtml) {
                    htmlParts.push(`<p>${paragraphHtml}</p>`);
                }
                break;
            case 'Subheading':
                const level = block.data.level || 2;
                htmlParts.push(`<h${level}>${escapeHtml(block.data.subheading)}</h${level}>`);
                break;
            case 'List':
                const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
                const items = block.data.items.map(item => `<li>${escapeHtml(item.data)}</li>`).join('');
                htmlParts.push(`<${tag}>${items}</${tag}>`);
                break;
            case 'Table':
                let tableHtml = '<table>';
                if (block.data.withHeadings && block.data.content.length > 0) {
                    tableHtml += '<thead><tr>';
                    tableHtml += block.data.content[0].map(cell => `<th>${escapeHtml(cell)}</th>`).join('');
                    tableHtml += '</tr></thead>';
                    tableHtml += '<tbody>';
                    for (let i = 1; i < block.data.content.length; i++) {
                        tableHtml += '<tr>';
                        tableHtml += block.data.content[i].map(cell => `<td>${escapeHtml(cell)}</td>`).join('');
                        tableHtml += '</tr>';
                    }
                    tableHtml += '</tbody>';
                } else {
                    tableHtml += '<tbody>';
                    for (const row of block.data.content) {
                        tableHtml += '<tr>';
                        tableHtml += row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('');
                        tableHtml += '</tr>';
                    }
                    tableHtml += '</tbody>';
                }
                tableHtml += '</table>';
                htmlParts.push(tableHtml);
                break;
            case 'Image':
                const alt = block.data.alt ? ` alt="${escapeHtml(block.data.alt)}"` : '';
                htmlParts.push(`<img src="${escapeHtml(block.data.src)}"${alt}>`);
                break;
            case 'Quote':
                let quoteHtml = `<blockquote>${escapeHtml(block.data.text)}`;
                if (block.data.caption) {
                    quoteHtml += `<cite>${escapeHtml(block.data.caption)}</cite>`;
                }
                quoteHtml += '</blockquote>';
                htmlParts.push(quoteHtml);
                break;
            case 'Code':
                htmlParts.push(`<pre><code>${escapeHtml(block.data.code)}</code></pre>`);
                break;
            case 'Internal Embed':
                // For embeds, just create a placeholder div with data attributes
                htmlParts.push(`<div data-embed-type="${block.data.name}" data-embed-url="${escapeHtml(block.data.data.url)}"></div>`);
                break;
            case 'Text':
                // Handle direct text blocks
                htmlParts.push(`<p>${escapeHtml(block.data)}</p>`);
                break;
            case 'Link':
                // Handle direct link blocks
                const linkText = block.data.content.map(inlineNodeToHtml).join('');
                htmlParts.push(`<p><a href="${escapeHtml(block.data.url)}">${linkText}</a></p>`);
                break;
        }
    }

    return htmlParts.join('\n');
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
        case 'Underline':
        case 'StrickThrough':
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