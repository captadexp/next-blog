import {AnyNode, Document, isTag} from 'domhandler'
import {ContentObject, ContentObjectLayout, LinkItem, ParagraphLayout, SubheadingLayout} from './custom-types'
import {parseDocument} from 'htmlparser2'
import render from 'dom-serializer'
import {ElementType} from 'domelementtype'

export function htmlToContentObject(html: string): ContentObject {
    const parser: Document = parseDocument(fixMalformedHtmlBrowserDomParser(html))
    const resp = recursiveMagic(parser)
    return resp
}

function getText(element: AnyNode, preserveFormatting = false): string {
    switch (element.type) {
        case ElementType.Text:
            return element.data
        case ElementType.Tag:
            if (element.name === 'br') {
                return preserveFormatting ? '\n' : ' '
            }
            if (preserveFormatting) {
                return element.children.map(child => getText(child, true)).join('')
            }
            return element.children.map(child => getText(child)).join(' ')
        default:
            console.log('Unknown element type')
            return ''
    }
}

function flattenParagraph1Level(node: ParagraphLayout): ParagraphLayout {
    const flattenedChildren: ContentObjectLayout[] = []
    for (let i = 0; i < node.data.length; i++) {
        const child: any = node.data[i]
        if (child?.name === 'Paragraph') {
            flattenedChildren.push(...flattenParagraph1Level(child).data)
        } else {
            flattenedChildren.push(child)
        }
    }

    // @ts-ignore
    node.data = flattenedChildren.filter(a => !!a)
    return node
}

function recursiveMagic(element: AnyNode, inlineContext = false): any {
    switch (element.type) {
        case ElementType.Text:
            return createTextItem(element.data)
        case ElementType.Root: {
            const contentObject: ContentObject = {version: 1, content: []}
            contentObject.content = element.children.map(child => recursiveMagic(child))
                .filter(a => !!a)
                .filter(item => item.name === 'Text' ? item.data.trim() !== '' : true)
            return contentObject
        }
        case ElementType.Tag: {
            switch (element.name) {
                case 'div':
                case 'p': {
                    const paragraphObject: ParagraphLayout = {
                        name: 'Paragraph',
                        version: 1,
                        data: []
                    }
                    paragraphObject.data = element.children.map(child => recursiveMagic(child, true))

                    return flattenParagraph1Level(paragraphObject)
                }
                case 'span': {
                    const paragraphObject: ParagraphLayout = {
                        name: 'Paragraph',
                        version: 1,
                        data: []
                    }
                    paragraphObject.data = element.children.map(child => recursiveMagic(child, true))
                    return paragraphObject
                }
                    break
                case 'a': {
                    const paragraphObject: LinkItem = {
                        name: 'Link',
                        version: 1,
                        data: {
                            content: [],
                            url: element.attribs.href
                        }
                    }
                    paragraphObject.data.content = element.children.map(child => recursiveMagic(child, true))
                    return paragraphObject
                }
                case 'h1':
                case 'h2': {
                    const object: SubheadingLayout = {
                        name: 'Subheading',
                        version: 1,
                        data: {subheading: getText(element)}
                    }
                    return object
                }
                case 'img': {
                    return {
                        name: 'Image',
                        version: 1,
                        data: {
                            src: element.attribs.src,
                            alt: element.attribs.alt
                        }
                    }
                }
                case 'i':
                case 'em':
                    return {
                        name: 'Italic',
                        version: 1,
                        data: element.children.map(child => recursiveMagic(child, true))
                    }
                case 'b':
                case 'strong':
                    return {
                        name: 'Highlight',
                        version: 1,
                        data: element.children.map(child => recursiveMagic(child, true))
                    }
                case 'ul':
                case 'ol': {
                    const object = {
                        name: 'List',
                        version: 1,
                        data: {
                            style: element.name === 'ol' ? 'ordered' : 'unordered',
                            items: element.children.map(child => recursiveMagic(child))
                        }
                    }
                    return object
                }
                case 'li':
                    return {
                        name: 'ListItem',
                        version: 1,
                        data: getText(element)
                    }
                case 'br':
                    return {name: 'Text', version: 1, data: '\n'}
                case 'table': {
                    const object = {
                        name: 'Table',
                        version: 1,
                        data: {
                            withHeadings: !!element.children.find(child => isTag(child) ? child.name === 'thead' : false),
                            content: element.children.map(child => recursiveMagic(child))
                        }
                    }
                    return object
                }
                case 'thead':
                case 'tbody': {
                    return element.children.map(child => recursiveMagic(child))
                }
                case 'td': {
                    return getText(element)
                }
                case 'tr': {
                    return element.children.map(child => recursiveMagic(child))
                }
                case 'figcaption': {
                    return {
                        name: 'FigureCaption',
                        version: 1,
                        data: getText(element)
                    }
                }
                case 'blockquote': {
                    const content = element.children.map(child => recursiveMagic(child))
                    return {
                        name: 'Quote',
                        version: 1,
                        data: {
                            text: content.map((c: any) => c.data || '').join(' '),
                            caption: ''
                        }
                    }
                }
                case 'code': {
                    const codeText = getText(element, true)
                    const hasInlineCodeClass = element.attribs?.class?.includes('inline-code')
                    if (inlineContext || hasInlineCodeClass) {
                        return {
                            name: 'InlineCode',
                            version: 1,
                            data: codeText
                        }
                    } else {
                        return {
                            name: 'Code',
                            version: 1,
                            data: {
                                code: codeText,
                                language: element.attribs?.['data-language'] || (element.attribs?.class?.includes('language-') ? element.attribs.class.replace(/.*language-(\w+).*/, '$1') : undefined)
                            }
                        }
                    }
                }
                case 'pre': {
                    const codeText = getText(element, true)
                    // Check for language in pre element or first code child
                    let language = element.attribs?.['data-language']
                    if (!language && element.attribs?.class?.includes('language-')) {
                        language = element.attribs.class.replace(/.*language-(\w+).*/, '$1')
                    }
                    // Check first code child for language
                    if (!language && element.children.length > 0) {
                        const firstChild = element.children[0]
                        if (isTag(firstChild) && firstChild.name === 'code') {
                            if (firstChild.attribs?.['data-language']) {
                                language = firstChild.attribs['data-language']
                            } else if (firstChild.attribs?.class?.includes('language-')) {
                                language = firstChild.attribs.class.replace(/.*language-(\w+).*/, '$1')
                            }
                        }
                    }
                    return {
                        name: 'Code',
                        version: 1,
                        data: {
                            code: codeText,
                            language
                        }
                    }
                }
                default:
                    console.log('Unknown tag element type', element.name)
            }
        }
            break
        default:
            console.log('Unknown element type', element.type)
    }
}

function createTextItem(data: string): any {
    return {
        name: 'Text',
        version: 1,
        data
    }
}

export function fixMalformedHtmlBrowserDomParser(htmlString: string): string {
    const doc = parseDocument(htmlString)
    return render(doc)
}