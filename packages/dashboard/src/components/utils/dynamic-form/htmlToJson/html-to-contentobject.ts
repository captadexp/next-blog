import {AnyNode, Document, isTag} from 'domhandler'
import {ContentObject, ContentObjectLayout, LinkItem, ParagraphLayout, SubheadingLayout} from './custom-types'
import {parseDocument} from 'htmlparser2'
import render from 'dom-serializer'
import {ElementType} from 'domelementtype'
import contentObjectToEditorJS from './contentobject-to-editorjs'
import editorJSToContentObject from './editorjs-to-contentobject'

export default function htmlToContentObject(html: string): ContentObject {
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

function fixMalformedHtmlBrowserDomParser(htmlString: string): string {
    const doc = parseDocument(htmlString)
    return render(doc)
}

const badHtml = `<p><span style="font-weight: 400;"><a href="https://netflixjunkie.com/tag/sydney-sweeney/">Sydney Sweeney</a> is both a giver and a friend whose share of success is for one and all. After fanning the flames of anticipation with her tropical romance during the Christmas season with <em>Anyone but You</em>, Sweeney explored the holiday hiatus doing the things she adores. In the most recent development of her fresh start, a glimpse has emerged, shifting from possessions to the people she holds dear.</p>
<p><span style="font-weight: 400;">Not only that, but a testament to how far Sydney Sweeney would go for the sake of her friendship has also come to the surface along with.</p>
<h2><strong>Sydney Sweeney goes all in for her best pals</strong></h2>
<p><span style="font-weight: 400;"><a href="https://www.netflixjunkie.com/hollywood-news-with-just-9-million-collection-on-box-office-sydney-sweeney-and-glen-powell-anyone-but-you-is-far-from-being-a-flop/" target="_blank" rel="noopener"><em>Anyone but You’s</em> box office figure vouches for its success.</a> But the star player of the screen attests to it even more profoundly. To celebrate her achievements in grandeur, Sweeney had the best plan up her sleeve and it included her closest allies from the sets of <em>Anyone but You</em>. <strong>The <em>Euphoria</em> actress chose to present a Cartier Leve Bracelet to her friends, <a href="https://www.instagram.com/stories/glencocoforhair/3273793540958433870/?utm_source=ig_story_item_share&amp;igsh=MXNuN2d6eXRoY2o1NA%3D%3D" target="_blank" rel="noopener">which was shared by Gleno Coco Oropeza</a> and included Melissa Hernandez, Molly Dickson, Kaylee Mc Gregory, Zola Ganzorigt, and Guy Cory.</strong></p>
<p><span style="font-weight: 400;">Sweeney spent almost over 10k to gift them the shiny bracelets. The entire team in question was showered with the <strong>responsibility of hair, makeup, styling, nails, and more for Sweeney’s appearances.</strong> Oropeza shared it on his Instagram story with a picture of everyone flaunting their bracelets and he captioned it <em>“🥺 team syd 🥺”.</em> Molly Dickson too, smitten by the gesture, proudly showcased it on her story to extend her gratefulness to the actress.</p>
<p><strong>ALSO READ:</strong><a href="https://www.netflixjunkie.com/hollywood-news-there-are-different-versions-sydney-sweeney-bares-the-truth-on-who-she-really-is/" target="_blank" rel="noopener">“There are different versions…” – Sydney Sweeney Bares the Truth on Who She Really Is</a></p>
<p><span style="font-weight: 400;">While the gesture was enough to woo anyone, this is not the first time Sweeney exhibited her team with love showers.</p>
<h2><strong>Back when Sydney Sweeney posted with her team on Instagram</strong></h2>
<p><span style="font-weight: 400;">Behind the shiny get-ups and stunning wardrobe reveal, Sweeney’s team has a good hand of magic involved in it. And to showcase her appreciation for them, she posted a thread with her team during her press tour for <em>Anyone but You.</em> Seizing the opportunity for Samsung’s brand promotion, <strong>the actress shared<em> “a peek behind the press tour”</em> with Ropez, Hernandez, Dickson, Mc Gregory, Ganzorigt, and Guy.</strong></p>
<p><span style="font-weight: 400;">In the thread, countless selfies from the Christmas release gang came flooding in.<strong> Sweeney even channeled her quirky side with her tongue-in-the-cheek and winking expressions.</strong> From the looks of it, the actress was clearly having the time of her life. Therefore, her gesture for the behind-the-scenes artists seems all worth it, given the share of levity is so strong between them.</p>
<p><strong>ALSO READ:</strong><a href="https://www.netflixjunkie.com/hollywood-news-sydney-sweeney-shows-off-her-adventurous-spirit-and-favorite-things-with-2023-dump/" target="_blank" rel="noopener">Sydney Sweeney Shows Off Her Adventurous Spirit and “favorite things” With 2023 Dump</a></p>
<p>What do you think of Sydney Sweeney&#8217;s gesture for her team? Let us know in the comments below.</p>`

// Test helper function
function runTest(name: string, html: string, expectedChecks?: (l1: any, l2: any, l3: any) => boolean) {
    console.log(`\n🧪 Test: ${name}`)
    console.log('-'.repeat(40))

    try {
        // Transform pipeline
        const fixed = fixMalformedHtmlBrowserDomParser(html)
        const l1 = htmlToContentObject(fixed)
        const l2 = contentObjectToEditorJS(l1)
        const l3 = editorJSToContentObject(l2)

        // Basic checks
        const blocksMatch = l1.content.length === l3.content.length
        console.log(`Blocks preserved: ${l1.content.length} → ${l3.content.length} ${blocksMatch ? '✅' : '❌'}`)

        // Custom checks if provided
        let customCheckPassed = true
        if (expectedChecks) {
            customCheckPassed = expectedChecks(l1, l2, l3)
        }

        const passed = blocksMatch && customCheckPassed
        console.log(`Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`)
        return passed
    } catch (error) {
        console.log(`❌ ERROR: ${error}`)
        return false
    }
}

// Simple test cases
function runSimpleTests() {
    console.log('🔬 Running Simple Tests')
    console.log('='.repeat(50))

    const results: boolean[] = []

    // Test 1: Plain text
    results.push(runTest(
        'Plain Text',
        '<p>This is simple plain text.</p>',
        (l1, l2, l3) => {
            const hasText = JSON.stringify(l3).includes('This is simple plain text')
            console.log(`Text preserved: ${hasText ? '✅' : '❌'}`)
            return hasText
        }
    ))

    // Test 2: Bold and Italic
    results.push(runTest(
        'Bold and Italic',
        '<p>This has <b>bold</b> and <i>italic</i> text.</p>',
        (l1, l2, l3) => {
            const hasBold = JSON.stringify(l1).includes('Highlight')
            const hasItalic = JSON.stringify(l1).includes('Italic')
            console.log(`Bold detected: ${hasBold ? '✅' : '❌'}`)
            console.log(`Italic detected: ${hasItalic ? '✅' : '❌'}`)
            return hasBold && hasItalic
        }
    ))

    // Test 3: Simple Link
    results.push(runTest(
        'Simple Link',
        '<p>Visit <a href="https://example.com">our website</a> for more.</p>',
        (l1, l2, l3) => {
            const hasLink = JSON.stringify(l3).includes('https://example.com')
            const hasLinkText = JSON.stringify(l3).includes('our website')
            console.log(`Link URL preserved: ${hasLink ? '✅' : '❌'}`)
            console.log(`Link text preserved: ${hasLinkText ? '✅' : '❌'}`)
            return hasLink && hasLinkText
        }
    ))

    // Test 4: Headings
    results.push(runTest(
        'Headings',
        '<h1>Main Title</h1><h2>Subtitle</h2><p>Content here</p>',
        (l1, l2, l3) => {
            const hasSubheading = l3.content.some((b: any) => b.name === 'Subheading')
            const hasParagraph = l3.content.some((b: any) => b.name === 'Paragraph')
            console.log(`Subheading preserved: ${hasSubheading ? '✅' : '❌'}`)
            console.log(`Paragraph preserved: ${hasParagraph ? '✅' : '❌'}`)
            return hasSubheading && hasParagraph
        }
    ))

    // Test 5: Lists
    results.push(runTest(
        'Lists',
        '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>',
        (l1, l2, l3) => {
            const hasList = l3.content.some((b: any) => b.name === 'List')
            const hasItems = JSON.stringify(l3).includes('Item 1') && JSON.stringify(l3).includes('Second')
            console.log(`Lists preserved: ${hasList ? '✅' : '❌'}`)
            console.log(`List items preserved: ${hasItems ? '✅' : '❌'}`)
            return hasList && hasItems
        }
    ))

    // Test 6: Empty content
    results.push(runTest(
        'Empty Paragraph',
        '<p></p>',
        (l1, l2, l3) => {
            console.log(`Handled empty content: ✅`)
            return true
        }
    ))

    // Test 7: Special characters
    results.push(runTest(
        'Special Characters',
        '<p>Special chars: &lt; &gt; &amp; &#8217; &quot;</p>',
        (l1, l2, l3) => {
            const hasSpecialChars = JSON.stringify(l3).includes('<') && JSON.stringify(l3).includes('>')
            console.log(`Special chars preserved: ${hasSpecialChars ? '✅' : '❌'}`)
            return hasSpecialChars
        }
    ))

    // Test 8: Nested formatting
    results.push(runTest(
        'Nested Formatting',
        '<p>Text with <b>bold and <i>italic nested</i> inside</b> it.</p>',
        (l1, l2, l3) => {
            const hasNested = JSON.stringify(l1).includes('Highlight') && JSON.stringify(l1).includes('Italic')
            console.log(`Nested formatting detected: ${hasNested ? '✅' : '❌'}`)
            return hasNested
        }
    ))

    // Test 9: Multiple paragraphs
    results.push(runTest(
        'Multiple Paragraphs',
        '<p>First paragraph.</p><p>Second paragraph.</p><p>Third paragraph.</p>',
        (l1, l2, l3) => {
            const paragraphCount = l3.content.filter((b: any) => b.name === 'Paragraph').length
            console.log(`Paragraph count: ${paragraphCount} (expected 3)`)
            return paragraphCount === 3
        }
    ))

    // Test 10: Image
    results.push(runTest(
        'Image',
        '<img src="https://example.com/image.jpg" alt="Test image">',
        (l1, l2, l3) => {
            const hasImage = l3.content.some((b: any) => b.name === 'Image')
            const hasImageData = JSON.stringify(l3).includes('https://example.com/image.jpg')
            console.log(`Image preserved: ${hasImage ? '✅' : '❌'}`)
            console.log(`Image URL preserved: ${hasImageData ? '✅' : '❌'}`)
            return hasImage && hasImageData
        }
    ))

    // Summary
    console.log('\n' + '='.repeat(50))
    const passed = results.filter(r => r).length
    const total = results.length
    console.log(`📊 Test Summary: ${passed}/${total} tests passed`)
    console.log(passed === total ? '✅ All tests PASSED!' : `❌ ${total - passed} tests failed`)

    return passed === total
}

// Complex test with the original badHtml
function runComplexTest() {
    console.log('\n🔬 Running Complex Test (Original badHtml)')
    console.log('='.repeat(50))

    const l0 = fixMalformedHtmlBrowserDomParser(badHtml)
    const l1 = htmlToContentObject(l0)
    const l2 = contentObjectToEditorJS(l1)
    const l3 = editorJSToContentObject(l2)

    console.log('ContentObject blocks:', l1.content.length)
    console.log('EditorJS blocks:', l2.blocks.length)
    console.log('Roundtrip blocks:', l3.content.length)

    const hasLinks = l1.content.some(b => JSON.stringify(b).includes('Link'))
    const hasLinksAfter = l3.content.some(b => JSON.stringify(b).includes('Link'))
    const hasSubheadings = l1.content.some(b => b.name === 'Subheading')
    const hasSubheadingsAfter = l3.content.some(b => b.name === 'Subheading')

    const success = l1.content.length === l3.content.length && hasLinks === hasLinksAfter && hasSubheadings === hasSubheadingsAfter
    console.log(success ? '✅ Complex test PASSED!' : '❌ Complex test FAILED')

    return success
}

// Main test runner
function main() {
    console.log('🚀 HTML Transformer Test Suite')
    console.log('='.repeat(50))

    const simpleTestsPassed = runSimpleTests()
    const complexTestPassed = runComplexTest()

    console.log('\n' + '='.repeat(50))
    console.log('🏁 FINAL RESULTS')
    console.log('Simple Tests:', simpleTestsPassed ? '✅ PASSED' : '❌ FAILED')
    console.log('Complex Test:', complexTestPassed ? '✅ PASSED' : '❌ FAILED')
    console.log('\n' + (simpleTestsPassed && complexTestPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed'))
}

if (require.main === module) {
    main();
}
