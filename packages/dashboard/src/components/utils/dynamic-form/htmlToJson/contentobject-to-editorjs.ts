import {OutputData} from '@editorjs/editorjs'
import {ContentObject, ContentObjectLayout} from './custom-types'


function processItem(item: any): string {
    switch (item.name) {
        case 'Text':
            return item.data.replace(/\n/g, '<br>')
        case 'Link':
            return `<a href=${item.data.url}>${item.data.content?.map(processItem).join('')}</a>`
        case 'Highlight':
            return `<b>${item.data?.map(processItem).join('')}</b>`
        case 'StrickThrough':
            return `<del>${item.data}</del>`
        case 'Underline':
            return `<u>${item.data}</u>`
        case 'Italic':
            return `<i>${item.data.map(processItem).join('')}</i>`
        case 'InlineCode':
            return `<code class="inline-code">${item.data.replace(/\n/g, '<br>')}</code>`
        default:
            return ''
    }
}

export default function contentObjectToEditorJS(contentObject: ContentObject | string): OutputData {
    const editorJSContent: OutputData = {
        time: +new Date(),
        version: '2.1.1',
        blocks: []
    }

    // Normalize input to ContentObject
    let normalizedContent: ContentObject;
    if (typeof contentObject === "string") {
        // Convert string to a paragraph block
        normalizedContent = {
            version: 1,
            content: [{
                name: "Paragraph",
                version: 1,
                data: [{name: "Text", version: 1, data: contentObject}]
            }]
        };
    } else {
        normalizedContent = contentObject;
    }

    for (let i = 0; i < normalizedContent.content.length; i++) {
        const item: ContentObjectLayout = normalizedContent.content[i]
        switch (item.name) {
            case 'Text':
                // Handle direct text blocks by converting them to paragraphs
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'paragraph',
                    data: {text: item.data}
                })
                break
            case 'Paragraph':
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'paragraph',
                    data: {
                        text: item.data.map((subItem: any, index: number) => {
                            const processed = processItem(subItem)
                            // Add <br> between consecutive Text elements (but not at the end)
                            if (subItem.name === 'Text' && index < item.data.length - 1 && item.data[index + 1]?.name === 'Text') {
                                return processed + '<br>'
                            }
                            return processed
                        }).join('')
                    }
                })
                break
            case 'Internal Embed':
                if (['youtubeEmbed', 'twitterEmbed', 'instagramEmbed', 'spotifyEmbed', 'redditEmbed']
                    .includes(item.data.name)) {
                    editorJSContent.blocks.push({
                        id: (Math.random() * 1e32).toString(36),
                        type: item.data.name,
                        data: {url: item.data.data.url}
                    })
                }
                break

            case 'Subheading':
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'header',
                    data: {
                        text: item.data.subheading,
                        level: item.data.level || 2
                    }
                })
                break

            case 'Image':
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'image',
                    data: {src: item.data.src, alt: item.data.alt, mediaId: item.data.mediaId},
                })
                break

            case 'List':
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'list',
                    data: {
                        style: item.data.style,
                        items: item.data.items.map((li) => li.data)
                    }
                })
                break

            case 'Table':
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'table',
                    data: {
                        withHeadings: item.data.withHeadings || false,
                        content: item.data.content
                    }
                })
                break

            case 'Quote':
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'quote',
                    data: {
                        text: item.data.text,
                        caption: item.data.caption || ''
                    }
                })
                break

            case 'Code':
                editorJSContent.blocks.push({
                    id: (Math.random() * 1e32).toString(36),
                    type: 'code',
                    data: {
                        code: item.data.code
                    }
                })
                break

            default:
                console.log('Unsupported item type', item.name)
        }
    }

    return editorJSContent
}
