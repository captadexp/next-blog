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

function getText(element: AnyNode): string {
    switch (element.type) {
        case ElementType.Text:
            return element.data
        case ElementType.Tag:
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

function recursiveMagic(element: AnyNode): any {
    switch (element.type) {
        case ElementType.Text:
            return createTextItem(element.data)
        case ElementType.Root: {
            const contentObject: ContentObject = {version: 1, content: []}
            contentObject.content = element.children.map(child => recursiveMagic(child))
                .filter(a => !!a)
                .filter(item => item.name === 'Text' ? item.data !== '\n' : true)
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
                    paragraphObject.data = element.children.map(child => recursiveMagic(child))

                    return flattenParagraph1Level(paragraphObject)
                }
                case 'span': {
                    const paragraphObject: ParagraphLayout = {
                        name: 'Paragraph',
                        version: 1,
                        data: []
                    }
                    paragraphObject.data = element.children.map(child => recursiveMagic(child))
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
                    paragraphObject.data.content = element.children.map(child => recursiveMagic(child))
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
                        data: element.children.map(child => recursiveMagic(child))
                    }
                case 'b':
                case 'strong':
                    return {
                        name: 'Highlight',
                        version: 1,
                        data: element.children.map(child => recursiveMagic(child))
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
                    return {name: 'Ignore', version: 1, data: []}
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