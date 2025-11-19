import type {AnyNode, Element} from 'domhandler';
import {isTag, isText} from 'domhandler';
import type {ContentObject, ContentObjectLayout, InlineNode} from '@supergrowthai/next-blog-types';
import {parseDocument} from 'htmlparser2';

export function htmlToContentObject(html: string): ContentObject {
    const doc = parseDocument(html)
    const content: ContentObjectLayout[] = []

    doc.children.forEach(child => {
        const processed = processBlockNode(child)
        if (processed) {
            if (Array.isArray(processed)) {
                content.push(...processed)
            } else {
                content.push(processed)
            }
        }
    })

    return {
        version: 1,
        content: content.filter(c => !!c)
    }
}

function processBlockNode(node: AnyNode): ContentObjectLayout | ContentObjectLayout[] | null {
    if (!isTag(node)) return null

    switch (node.name) {
        case 'p':
        case 'div':
            return {
                name: 'Paragraph',
                version: 1,
                data: processInlineChildren(node)
            }

        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            return {
                name: 'Subheading',
                version: 1,
                data: {
                    subheading: getInnerText(node),
                    level: parseInt(node.name.substring(1))
                }
            }

        case 'ul':
        case 'ol':
            return {
                name: 'List',
                version: 1,
                data: {
                    style: node.name === 'ol' ? 'ordered' : 'unordered',
                    items: node.children.filter(isTag).map(li => ({
                        name: 'ListItem',
                        version: 1,
                        data: getInnerText(li)
                    }))
                }
            }

        case 'img':
            return {
                name: 'Image',
                version: 1,
                data: {
                    src: node.attribs.src,
                    alt: node.attribs.alt,
                    mediaId: '' // Optional or needs extraction
                }
            }

        case 'figure':
            const img = node.children.find(c => isTag(c) && c.name === 'img') as Element
            if (img) {
                return {
                    name: 'Image',
                    version: 1,
                    data: {
                        src: img.attribs.src,
                        alt: img.attribs.alt,
                        mediaId: ''
                    }
                }
            }
            return null

        case 'blockquote':
            return {
                name: 'Quote',
                version: 1,
                data: {
                    text: getInnerText(node),
                    caption: ''
                }
            }

        case 'pre':
            const codeNode = node.children.find(c => isTag(c) && c.name === 'code') as Element
            const codeText = codeNode ? getInnerText(codeNode, true) : getInnerText(node, true)
            const language = codeNode?.attribs.class?.replace('language-', '') || ''
            return {
                name: 'Code',
                version: 1,
                data: {
                    code: codeText,
                    language
                }
            }

        case 'table':
            const rows: string[][] = []
            let withHeadings = false

            const processRows = (container: Element) => {
                container.children.forEach(child => {
                    if (isTag(child) && child.name === 'tr') {
                        const rowData = child.children
                            .filter(isTag)
                            .map(cell => getInnerText(cell))
                        rows.push(rowData)
                        if (child.children.some(c => isTag(c) && c.name === 'th')) {
                            withHeadings = true
                        }
                    }
                })
            }

            const thead = node.children.find(c => isTag(c) && c.name === 'thead') as Element
            const tbody = node.children.find(c => isTag(c) && c.name === 'tbody') as Element

            if (thead) {
                withHeadings = true
                processRows(thead)
            }
            if (tbody) {
                processRows(tbody)
            }
            if (!thead && !tbody) {
                processRows(node)
            }

            return {
                name: 'Table',
                version: 1,
                data: {
                    withHeadings,
                    content: rows
                }
            }

        default:
            // Fallback for unknown tags, maybe treat as paragraph if it has text?
            // Or ignore.
            return null
    }
}

function processInlineChildren(node: Element): InlineNode[] {
    return node.children.map(child => processInlineNode(child)).filter((n): n is InlineNode => n !== null)
}

function processInlineNode(node: AnyNode): InlineNode | null {
    if (isText(node)) {
        if (!node.data.trim()) return null // Skip empty text nodes? Or preserve spaces?
        // Let's preserve spaces but maybe collapse multiple?
        return {
            name: 'Text',
            version: 1,
            data: node.data
        }
    }

    if (isTag(node)) {
        switch (node.name) {
            case 'br':
                return {name: 'Text', version: 1, data: '\n'}
            case 'b':
            case 'strong':
                return {
                    name: 'Highlight',
                    version: 1,
                    data: processInlineChildren(node)
                }
            case 'i':
            case 'em':
                return {
                    name: 'Italic',
                    version: 1,
                    data: processInlineChildren(node)
                }
            case 'a':
                return {
                    name: 'Link',
                    version: 1,
                    data: {
                        url: node.attribs.href,
                        content: processInlineChildren(node)
                    }
                }
            case 'code':
                return {
                    name: 'InlineCode',
                    version: 1,
                    data: getInnerText(node)
                }
            default:
                // Flatten unknown inline tags
                const children = processInlineChildren(node)
                // This is tricky because we need to return a single node, but we might have multiple children.
                // For now, let's just return the text content as a Text node if we can't preserve structure.
                // Or we could change return type to InlineNode[]
                // But for simplicity, let's just extract text.
                return {
                    name: 'Text',
                    version: 1,
                    data: getInnerText(node)
                }
        }
    }
    return null
}

function getInnerText(node: AnyNode, preserveWhitespace = false): string {
    if (isText(node)) return node.data
    if (isTag(node)) {
        if (node.name === 'br') return '\n'
        return node.children.map(c => getInnerText(c, preserveWhitespace)).join('')
    }
    return ''
}