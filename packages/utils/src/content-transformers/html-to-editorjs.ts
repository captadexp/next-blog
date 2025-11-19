import type {OutputData} from '@editorjs/editorjs';
import {parseDocument} from 'htmlparser2';
import {AnyNode, Element, isTag, isText} from 'domhandler';

export function htmlToEditorJS(html: string): OutputData {
    const doc = parseDocument(html);
    const blocks: any[] = [];

    function processNode(node: AnyNode) {
        if (isTag(node)) {
            switch (node.name) {
                case 'p':
                    const text = getInlineContent(node);
                    if (text.trim()) {
                        blocks.push({
                            type: 'paragraph',
                            data: {text}
                        });
                    }
                    break;

                case 'div':
                    // Check if it's an embed div first
                    if (node.attribs['data-type'] && ['youtubeEmbed', 'twitterEmbed', 'instagramEmbed', 'spotifyEmbed', 'redditEmbed'].includes(node.attribs['data-type'])) {
                        blocks.push({
                            type: node.attribs['data-type'],
                            data: {
                                url: node.attribs['data-url']
                            }
                        });
                    } else {
                        // Handle as paragraph if it has text content
                        const divText = getInlineContent(node);
                        if (divText.trim()) {
                            blocks.push({
                                type: 'paragraph',
                                data: {text: divText}
                            });
                        }
                    }
                    break;

                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    blocks.push({
                        type: 'header',
                        data: {
                            text: getInlineContent(node),
                            level: parseInt(node.name.substring(1))
                        }
                    });
                    break;

                case 'ul':
                case 'ol':
                    blocks.push({
                        type: 'list',
                        data: {
                            style: node.name === 'ol' ? 'ordered' : 'unordered',
                            items: node.children.filter(isTag).map(child => getInlineContent(child))
                        }
                    });
                    break;

                case 'img':
                    blocks.push({
                        type: 'image',
                        data: {
                            src: node.attribs.src,
                            alt: node.attribs.alt,
                            caption: node.attribs.title || ''
                        }
                    });
                    break;

                case 'figure':
                    const img = node.children.find(c => isTag(c) && c.name === 'img') as Element;
                    const caption = node.children.find(c => isTag(c) && c.name === 'figcaption') as Element;
                    if (img) {
                        blocks.push({
                            type: 'image',
                            data: {
                                src: img.attribs.src,
                                alt: img.attribs.alt,
                                caption: caption ? getInlineContent(caption) : ''
                            }
                        });
                    }
                    break;

                case 'blockquote':
                    blocks.push({
                        type: 'quote',
                        data: {
                            text: getInlineContent(node),
                            caption: ''
                        }
                    });
                    break;

                case 'pre':
                    const codeNode = node.children.find(c => isTag(c) && c.name === 'code') as Element;
                    if (codeNode) {
                        const language = codeNode.attribs.class?.replace('language-', '') || '';
                        blocks.push({
                            type: 'code',
                            data: {
                                code: getInlineContent(codeNode, true),
                                language
                            }
                        });
                    } else {
                        blocks.push({
                            type: 'code',
                            data: {
                                code: getInlineContent(node, true)
                            }
                        });
                    }
                    break;

                case 'table':
                    const rows: string[][] = [];
                    let withHeadings = false;

                    const processRows = (container: Element) => {
                        container.children.forEach(child => {
                            if (isTag(child) && child.name === 'tr') {
                                const rowData = child.children
                                    .filter(isTag)
                                    .map(cell => getInlineContent(cell));
                                rows.push(rowData);
                                if (child.children.some(c => isTag(c) && c.name === 'th')) {
                                    withHeadings = true;
                                }
                            }
                        });
                    };

                    const thead = node.children.find(c => isTag(c) && c.name === 'thead') as Element;
                    const tbody = node.children.find(c => isTag(c) && c.name === 'tbody') as Element;

                    if (thead) {
                        withHeadings = true;
                        processRows(thead);
                    }
                    if (tbody) {
                        processRows(tbody);
                    }
                    if (!thead && !tbody) {
                        processRows(node);
                    }

                    blocks.push({
                        type: 'table',
                        data: {
                            withHeadings,
                            content: rows
                        }
                    });
                    break;
            }
        }
    }

    doc.children.forEach(node => {
        if (isTag(node)) {
            if (node.name === 'div' && !node.attribs['data-type']) {
                const hasBlockChildren = node.children.some(c => isTag(c) && ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'div', 'table', 'blockquote', 'pre', 'figure'].includes(c.name));
                if (hasBlockChildren) {
                    node.children.forEach(processNode);
                    return;
                }
            }
            processNode(node);
        }
    });

    return {
        time: Date.now(),
        blocks,
        version: '2.30.0'
    };
}

function getInlineContent(node: AnyNode, preserveWhitespace = false): string {
    if (isText(node)) {
        return preserveWhitespace ? node.data : node.data;
    }
    if (isTag(node)) {
        if (node.name === 'br') return '<br>';

        const content = node.children.map(c => getInlineContent(c, preserveWhitespace)).join('');

        switch (node.name) {
            case 'b':
            case 'strong':
                return `<b>${content}</b>`;
            case 'i':
            case 'em':
                return `<i>${content}</i>`;
            case 'u':
                return `<u>${content}</u>`;
            case 'a':
                return `<a href="${node.attribs.href}">${content}</a>`;
            case 'code':
                return `<code class="inline-code">${content}</code>`;
            case 'mark':
                return `<mark class="cdx-marker">${content}</mark>`;
            default:
                return content;
        }
    }
    return '';
}
