import {OutputData} from '@editorjs/editorjs'
import {htmlToContentObject} from './html-to-contentobject'
import {ContentObject, ParagraphLayout} from './custom-types'

export default function editorJSToContentObject(content: OutputData): ContentObject {
    const blockContent: ContentObject = {
        version: 1,
        content: []
    }

    for (let i = 0; i < content.blocks.length; i++) {
        const item: any = content.blocks[i]
        switch (item.type) {
            case 'paragraph':
                if (item.data.text) {
                    const newContent: ParagraphLayout = {
                        name: 'Paragraph',
                        version: 1,
                        data: htmlToContentObject(item.data.text).content as any
                    }
                    blockContent.content.push(newContent)
                }
                break
            case 'youtubeEmbed':
            case 'twitterEmbed':
            case 'instagramEmbed':
            case 'spotifyEmbed':
            case 'redditEmbed':
                blockContent.content.push(
                    {
                        name: 'Internal Embed',
                        version: 1,
                        data: {
                            name: item.type,
                            data: {
                                url: item.data.url
                            }
                        }
                    }
                )
                break

            case 'image':
                blockContent.content.push({
                    name: 'Image',
                    version: 1,
                    data: {
                        src: item.data.src,
                        alt: item.data.alt,
                        mediaId: item.data.mediaId
                    }
                })
                break

            case 'subHeading':

                blockContent.content.push({
                    name: 'Subheading',
                    version: 1,
                    data: {
                        subheading: item.data.subheading
                    }
                })
                break

            case 'list':
                blockContent.content.push({
                    name: 'List',
                    version: 1,
                    data: {
                        style: item.data.style,
                        items: item.data.items
                    }
                })
                break

            case 'table':
                blockContent.content.push({
                    name: 'Table',
                    version: 1,
                    data: {
                        withHeadings: item.data.withHeadings,
                        content: item.data.content
                    }
                })
                break

            case 'quote':
                blockContent.content.push({
                    name: 'Quote',
                    version: 1,
                    data: {
                        text: item.data.text,
                        caption: item.data.caption || ''
                    }
                })
                break

            case 'header':
                blockContent.content.push({
                    name: 'Subheading',
                    version: 1,
                    data: {
                        subheading: item.data.text,
                        level: item.data.level || 2
                    }
                })
                break

            case 'code':
                blockContent.content.push({
                    name: 'Code',
                    version: 1,
                    data: {
                        code: item.data.code
                    }
                })
                break

            // Add additional cases as needed
        }
    }

    return blockContent
}
