import {fixMalformedHtmlBrowserDomParser, htmlToContentObject} from './html-to-contentobject';
import contentObjectToEditorJS from './contentobject-to-editorjs';
import editorJSToContentObject from './editorjs-to-contentobject';

// Bad HTML to test with
const badHtml = `<p>When it comes to going from <a href="https://en.wikipedia.org/wiki/Zero" target="_blank" rel="noopener">zero to hero</a> on Instagram, there&#8217;s no one doing it quite like Sydney Sweeney. In the past few years, the actress has not only taken over the silver screen but also social media with her hot, happening posts. Following up with the trend, the <em>Immaculate</em> star has once again <strong>shared a sensational thread from her stunt on Saturday Night Live. And the entire team behind the actress&#8217;s team is looking uber-dapper</strong> along with <strong>makeup artist Melissa Hernandez, stylist Molly Dickson and their team. </strong></p>
<p>Article continues below this ad</p>
<blockquote><p><strong>I love me, my TEAM!! @melissamakeupx @mollyddickson </strong>❤️❤️❤️</p></blockquote>
<p>For the actress, it was <strong>both <em>&#8220;terrifying&#8221;</em> and </strong><em><strong>&#8220;a dream come true. </strong></em><strong><em>&#8220;</em></strong> Even though Sweeney was ready to host the show a week before the episode, nothing could have prepared her for the day she would walk onto that stage. The actress has since then revealed, <strong>&#8220;<em>No one could&#8217;ve prepared me for what a unique, incredible, adrenaline-pumping, wild experience it was.&#8221;</em> </strong>Not only was the team important for her, but SNL too was special and memorable for the actress, <strong>She later revealed in an interview, </strong><em><strong>&#8220;It was Saturday! How insane is this! (She also sang the theme intro song).&#8221;</strong></em></p>
<p>Article continues below this ad</p>
<h2><strong>Back when Sydney Sweeney posted with her team on Instagram</strong></h2>
<p><span style="font-weight: 400;">Behind the shiny get-ups and stunning wardrobe reveal, Sweeney's team has a good hand of magic involved in it. And to showcase her appreciation for them, she posted a thread with her team during her press tour for <em>Anyone but You.</em> Seizing the opportunity for Samsung's brand promotion, <strong>the actress shared<em> "a peek behind the press tour"</em> with Ropez, Hernandez, Dickson, Mc Gregory, Ganzorigt, and Guy.</strong></p>
<p><span style="font-weight: 400;">In the thread, countless selfies from the Christmas release gang came flooding in.<strong> Sweeney even channeled her quirky side with her tongue-in-the-cheek and winking expressions.</strong> From the looks of it, the actress was clearly having the time of her life. Therefore, her gesture for the behind-the-scenes artists seems all worth it, given the share of levity is so strong between them.</p>
<p><strong>ALSO READ:</strong><a href="https://www.netflixjunkie.com/hollywood-news-sydney-sweeney-shows-off-her-adventurous-spirit-and-favorite-things-with-2023-dump/" target="_blank" rel="noopener">Sydney Sweeney Shows Off Her Adventurous Spirit and "favorite things" With 2023 Dump</a></p>
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

    // Test 11: Inline Code
    results.push(runTest(
        'Inline Code',
        '<p>Use the <code>console.log()</code> function to debug.</p>',
        (l1, l2, l3) => {
            const hasInlineCode = JSON.stringify(l3).includes('InlineCode') || JSON.stringify(l1).includes('InlineCode')
            const hasCodeContent = JSON.stringify(l3).includes('console.log()')
            console.log(`Inline code detected: ${hasInlineCode ? '✅' : '❌'}`)
            console.log(`Code content preserved: ${hasCodeContent ? '✅' : '❌'}`)
            return hasInlineCode && hasCodeContent
        }
    ))

    // Test 12: Code Block with Language
    results.push(runTest(
        'Code Block with Language',
        '<pre><code class="language-javascript">function hello() {\n  console.log("Hello!");\n}</code></pre>',
        (l1, l2, l3) => {
            const codeBlock = l3.content.find((b: any) => b.name === 'Code')
            const hasLanguage = codeBlock && codeBlock.data && codeBlock.data.language === 'javascript'
            const hasFormatting = codeBlock && codeBlock.data && codeBlock.data.code.includes('\n')
            console.log(`Language detected: ${hasLanguage ? '✅' : '❌'}`)
            console.log(`Formatting preserved: ${hasFormatting ? '✅' : '❌'}`)
            return hasLanguage && hasFormatting
        }
    ))

    // Test 13: Code Block with Tabs and Spaces
    results.push(runTest(
        'Code Block Formatting',
        '<pre><code>if (condition) {\n\tconsole.log("indented");\n    let x = 5;\n}</code></pre>',
        (l1, l2, l3) => {
            const codeBlock = l3.content.find((b: any) => b.name === 'Code')
            const hasNewlines = codeBlock && codeBlock.data && codeBlock.data.code.includes('\n')
            const hasTabs = codeBlock && codeBlock.data && codeBlock.data.code.includes('\t')
            const hasSpaces = codeBlock && codeBlock.data && codeBlock.data.code.includes('    ')
            console.log(`Newlines preserved: ${hasNewlines ? '✅' : '❌'}`)
            console.log(`Tabs preserved: ${hasTabs ? '✅' : '❌'}`)
            console.log(`Spaces preserved: ${hasSpaces ? '✅' : '❌'}`)
            return hasNewlines && hasTabs && hasSpaces
        }
    ))

    // Test 14: Multi-line Code
    results.push(runTest(
        'Multi-line Code',
        '<code>const data = {\n  name: "test",\n  value: 42\n};</code>',
        (l1, l2, l3) => {
            const codeBlock = l3.content.find((b: any) => b.name === 'Code')
            const hasMultiline = codeBlock && codeBlock.data && codeBlock.data.code.split('\n').length > 1
            const hasCorrectContent = codeBlock && codeBlock.data && codeBlock.data.code.includes('name: "test"')
            console.log(`Multi-line preserved: ${hasMultiline ? '✅' : '❌'}`)
            console.log(`Content preserved: ${hasCorrectContent ? '✅' : '❌'}`)
            return hasMultiline && hasCorrectContent
        }
    ))

    // Test 15: Code with data-language attribute
    results.push(runTest(
        'Code with data-language',
        '<pre><code data-language="python">def hello():\n    print("Hello!")</code></pre>',
        (l1, l2, l3) => {
            const codeBlock = l3.content.find((b: any) => b.name === 'Code')
            const hasLanguage = codeBlock && codeBlock.data && codeBlock.data.language === 'python'
            const hasContent = codeBlock && codeBlock.data && codeBlock.data.code.includes('def hello()')
            console.log(`Data-language detected: ${hasLanguage ? '✅' : '❌'}`)
            console.log(`Python code preserved: ${hasContent ? '✅' : '❌'}`)
            return hasLanguage && hasContent
        }
    ))

    // Test 16: Complex newline preservation test
    results.push(runTest(
        'Complex Newline Preservation',
        '<p>asdf</p><p>-hello\n-world</p><pre><code>{\n\tdata:1\n}</code></pre>',
        (l1, l2, l3) => {
            // Check first paragraph
            const firstPara = l1.content.find((b: any) => b.name === 'Paragraph' && b.data.some((d: any) => d.data === 'asdf'))
            const hasFirstPara = !!firstPara

            // Check second paragraph with newlines
            const secondPara = l1.content.find((b: any) => b.name === 'Paragraph' && b.data.some((d: any) => d.data && d.data.includes('-hello\n-world')))
            const hasNewlinesInText = !!secondPara

            // Check code block with formatting
            const codeBlock = l1.content.find((b: any) => b.name === 'Code')
            const hasCodeFormatting = codeBlock && codeBlock.data && codeBlock.data.code.includes('{\n\tdata:1\n}')

            console.log(`First paragraph: ${hasFirstPara ? '✅' : '❌'}`)
            console.log(`Newlines in text preserved: ${hasNewlinesInText ? '✅' : '❌'}`)
            console.log(`Code formatting preserved: ${hasCodeFormatting ? '✅' : '❌'}`)

            return hasFirstPara && hasNewlinesInText && hasCodeFormatting
        }
    ))

    // Test 17: EditorJS Output Conversion
    results.push(runTest(
        'EditorJS Output Conversion',
        '<p>asdf</p><p>-hello<br>-world</p><p><code class="inline-code">{<br>json:1<br>}</code></p>',
        (l1, l2, l3) => {
            // Check first paragraph
            const firstPara = l1.content.find((b: any) => b.name === 'Paragraph' && b.data.some((d: any) => d.data === 'asdf'))
            const hasFirstPara = !!firstPara

            // Check second paragraph with br converted to newlines
            const secondPara = l1.content.find((b: any) => b.name === 'Paragraph')
            const hasNewlineFromBr = secondPara && JSON.stringify(secondPara).includes('-hello') && JSON.stringify(secondPara).includes('-world')

            // Check inline code with class detection
            const hasInlineCode = JSON.stringify(l1).includes('InlineCode')
            const hasCodeContent = JSON.stringify(l1).includes('json:1')

            // Check round-trip conversion: l2 should have <br> tags for EditorJS
            const editorJSHasBr = JSON.stringify(l2).includes('<br>')
            const editorJSHasInlineCodeClass = JSON.stringify(l2).includes('class="inline-code"')

            console.log(`First paragraph: ${hasFirstPara ? '✅' : '❌'}`)
            console.log(`BR to newline conversion: ${hasNewlineFromBr ? '✅' : '❌'}`)
            console.log(`Inline code class detected: ${hasInlineCode ? '✅' : '❌'}`)
            console.log(`Code content preserved: ${hasCodeContent ? '✅' : '❌'}`)
            console.log(`EditorJS has BR tags: ${editorJSHasBr ? '✅' : '❌'}`)
            console.log(`EditorJS has inline-code class: ${editorJSHasInlineCodeClass ? '✅' : '❌'}`)

            return hasFirstPara && hasNewlineFromBr && hasInlineCode && hasCodeContent && editorJSHasBr && editorJSHasInlineCodeClass
        }
    ))

    // Test 18: Header Tool Support (h1-h6)
    results.push(runTest(
        'Header Tool Support',
        '<h1>Main Title</h1><h2>Subtitle</h2><h3>Section</h3><h4>Subsection</h4><h5>Minor Heading</h5><h6>Smallest Heading</h6>',
        (l1, l2, l3) => {
            const headers = l3.content.filter((b: any) => b.name === 'Subheading')
            const hasH1 = headers.some((h: any) => h.data.level === 1 && h.data.subheading === 'Main Title')
            const hasH2 = headers.some((h: any) => h.data.level === 2 && h.data.subheading === 'Subtitle')
            const hasH6 = headers.some((h: any) => h.data.level === 6 && h.data.subheading === 'Smallest Heading')
            const hasCorrectCount = headers.length === 6

            // Check EditorJS conversion
            const editorJSHeaders = l2.blocks.filter((b: any) => b.type === 'header')
            const editorJSHasCorrectCount = editorJSHeaders.length === 6
            const editorJSHasLevels = editorJSHeaders.every((h: any) => h.data.level >= 1 && h.data.level <= 6)

            console.log(`H1 preserved: ${hasH1 ? '✅' : '❌'}`)
            console.log(`H2 preserved: ${hasH2 ? '✅' : '❌'}`)
            console.log(`H6 preserved: ${hasH6 ? '✅' : '❌'}`)
            console.log(`Header count correct: ${hasCorrectCount ? '✅' : '❌'} (${headers.length}/6)`)
            console.log(`EditorJS header count: ${editorJSHasCorrectCount ? '✅' : '❌'} (${editorJSHeaders.length}/6)`)
            console.log(`EditorJS levels valid: ${editorJSHasLevels ? '✅' : '❌'}`)

            return hasH1 && hasH2 && hasH6 && hasCorrectCount && editorJSHasCorrectCount && editorJSHasLevels
        }
    ))

    // Test 19: List Tool Support (ordered and unordered)
    results.push(runTest(
        'List Tool Support',
        '<ul><li>Bullet 1</li><li>Bullet 2</li><li>Bullet 3</li></ul><ol><li>Number 1</li><li>Number 2</li></ol>',
        (l1, l2, l3) => {
            const lists = l3.content.filter((b: any) => b.name === 'List')
            const unorderedList = lists.find((l: any) => l.data.style === 'unordered')
            const orderedList = lists.find((l: any) => l.data.style === 'ordered')
            const hasUnorderedItems = unorderedList && unorderedList.data.items.length === 3
            const hasOrderedItems = orderedList && orderedList.data.items.length === 2
            const hasCorrectItems = unorderedList && unorderedList.data.items.some((i: any) => i.data === 'Bullet 1')

            // Check EditorJS conversion
            const editorJSLists = l2.blocks.filter((b: any) => b.type === 'list')
            const hasEditorJSLists = editorJSLists.length === 2
            const editorJSHasStyles = editorJSLists.some((l: any) => l.data.style === 'unordered') && editorJSLists.some((l: any) => l.data.style === 'ordered')

            console.log(`Unordered list preserved: ${hasUnorderedItems ? '✅' : '❌'}`)
            console.log(`Ordered list preserved: ${hasOrderedItems ? '✅' : '❌'}`)
            console.log(`List items correct: ${hasCorrectItems ? '✅' : '❌'}`)
            console.log(`EditorJS lists count: ${hasEditorJSLists ? '✅' : '❌'} (${editorJSLists.length}/2)`)
            console.log(`EditorJS list styles: ${editorJSHasStyles ? '✅' : '❌'}`)

            return hasUnorderedItems && hasOrderedItems && hasCorrectItems && hasEditorJSLists && editorJSHasStyles
        }
    ))

    // Test 20: Quote Tool Support
    results.push(runTest(
        'Quote Tool Support',
        '<blockquote>"The only way to do great work is to love what you do." <cite>Steve Jobs</cite></blockquote><blockquote>Quote without citation</blockquote>',
        (l1, l2, l3) => {
            const quotes = l3.content.filter((b: any) => b.name === 'Quote')
            const quoteWithCitation = quotes.find((q: any) => q.data.caption)
            const quoteWithoutCitation = quotes.find((q: any) => !q.data.caption)
            const hasCorrectQuoteText = quoteWithCitation && quoteWithCitation.data.text.includes('great work')
            const hasCorrectCitation = quoteWithCitation && quoteWithCitation.data.caption === 'Steve Jobs'
            const hasQuoteWithoutCitation = quoteWithoutCitation && quoteWithoutCitation.data.text === 'Quote without citation'

            // Check EditorJS conversion
            const editorJSQuotes = l2.blocks.filter((b: any) => b.type === 'quote')
            const hasEditorJSQuotes = editorJSQuotes.length === 2
            const editorJSHasCitation = editorJSQuotes.some((q: any) => q.data.caption === 'Steve Jobs')
            const editorJSHasEmptyCaption = editorJSQuotes.some((q: any) => q.data.caption === '')

            console.log(`Quote with citation: ${hasCorrectQuoteText && hasCorrectCitation ? '✅' : '❌'}`)
            console.log(`Quote without citation: ${hasQuoteWithoutCitation ? '✅' : '❌'}`)
            console.log(`EditorJS quotes count: ${hasEditorJSQuotes ? '✅' : '❌'} (${editorJSQuotes.length}/2)`)
            console.log(`EditorJS citation preserved: ${editorJSHasCitation ? '✅' : '❌'}`)
            console.log(`EditorJS empty caption: ${editorJSHasEmptyCaption ? '✅' : '❌'}`)

            return hasCorrectQuoteText && hasCorrectCitation && hasQuoteWithoutCitation && hasEditorJSQuotes && editorJSHasCitation
        }
    ))

    // Test 21: Table Tool Support
    results.push(runTest(
        'Table Tool Support',
        '<table><thead><tr><th>Name</th><th>Age</th><th>City</th></tr></thead><tbody><tr><td>John</td><td>25</td><td>NYC</td></tr><tr><td>Jane</td><td>30</td><td>LA</td></tr></tbody></table>',
        (l1, l2, l3) => {
            const tables = l3.content.filter((b: any) => b.name === 'Table')
            const table = tables[0]
            const hasTable = !!table
            const hasHeadings = table && table.data.withHeadings === true
            const hasCorrectRows = table && table.data.content.length === 3 // header + 2 data rows
            const hasCorrectColumns = table && table.data.content[0].length === 3
            const hasCorrectData = table && table.data.content[1][0] === 'John'

            // Check EditorJS conversion
            const editorJSTables = l2.blocks.filter((b: any) => b.type === 'table')
            const hasEditorJSTable = editorJSTables.length === 1
            const editorJSTable = editorJSTables[0]
            const editorJSHasHeadings = editorJSTable && editorJSTable.data.withHeadings === true
            const editorJSHasData = editorJSTable && editorJSTable.data.content.length === 3

            console.log(`Table preserved: ${hasTable ? '✅' : '❌'}`)
            console.log(`Table headings detected: ${hasHeadings ? '✅' : '❌'}`)
            console.log(`Correct row count: ${hasCorrectRows ? '✅' : '❌'} (${table?.data.content.length}/3)`)
            console.log(`Correct column count: ${hasCorrectColumns ? '✅' : '❌'} (${table?.data.content[0]?.length}/3)`)
            console.log(`Data preserved: ${hasCorrectData ? '✅' : '❌'}`)
            console.log(`EditorJS table: ${hasEditorJSTable ? '✅' : '❌'}`)
            console.log(`EditorJS headings: ${editorJSHasHeadings ? '✅' : '❌'}`)
            console.log(`EditorJS data: ${editorJSHasData ? '✅' : '❌'}`)

            return hasTable && hasHeadings && hasCorrectRows && hasCorrectColumns && hasCorrectData && hasEditorJSTable && editorJSHasHeadings
        }
    ))

    // Test 22: Image Tool Support
    results.push(runTest(
        'Image Tool Support',
        '<img src="https://example.com/image1.jpg" alt="Test Image 1"><img src="https://example.com/image2.png" alt="Test Image 2" data-media-id="123">',
        (l1, l2, l3) => {
            const images = l3.content.filter((b: any) => b.name === 'Image')
            const hasImages = images.length === 2
            const firstImage = images[0]
            const secondImage = images[1]
            const hasCorrectSrc = firstImage && firstImage.data.src === 'https://example.com/image1.jpg'
            const hasCorrectAlt = firstImage && firstImage.data.alt === 'Test Image 1'
            const hasMediaId = secondImage && secondImage.data.mediaId === '123'

            // Check EditorJS conversion
            const editorJSImages = l2.blocks.filter((b: any) => b.type === 'image')
            const hasEditorJSImages = editorJSImages.length === 2
            const editorJSFirstImage = editorJSImages[0]
            const editorJSHasSrc = editorJSFirstImage && editorJSFirstImage.data.src === 'https://example.com/image1.jpg'
            const editorJSHasAlt = editorJSFirstImage && editorJSFirstImage.data.alt === 'Test Image 1'
            const editorJSHasMediaId = editorJSImages[1] && editorJSImages[1].data.mediaId === '123'

            console.log(`Images preserved: ${hasImages ? '✅' : '❌'} (${images.length}/2)`)
            console.log(`Image src correct: ${hasCorrectSrc ? '✅' : '❌'}`)
            console.log(`Image alt correct: ${hasCorrectAlt ? '✅' : '❌'}`)
            console.log(`Media ID preserved: ${hasMediaId ? '✅' : '❌'}`)
            console.log(`EditorJS images: ${hasEditorJSImages ? '✅' : '❌'} (${editorJSImages.length}/2)`)
            console.log(`EditorJS src: ${editorJSHasSrc ? '✅' : '❌'}`)
            console.log(`EditorJS alt: ${editorJSHasAlt ? '✅' : '❌'}`)
            console.log(`EditorJS media ID: ${editorJSHasMediaId ? '✅' : '❌'}`)

            return hasImages && hasCorrectSrc && hasCorrectAlt && hasMediaId && hasEditorJSImages && editorJSHasSrc && editorJSHasAlt && editorJSHasMediaId
        }
    ))

    // Test 23: Code Tool with Language Support
    results.push(runTest(
        'Code Tool with Language Support',
        '<pre><code class="language-javascript">function hello() {\n  console.log("Hello World!");\n  return true;\n}</code></pre><pre><code data-language="python">def hello():\n    print("Hello World!")\n    return True</code></pre>',
        (l1, l2, l3) => {
            const codeBlocks = l3.content.filter((b: any) => b.name === 'Code')
            const hasCodeBlocks = codeBlocks.length === 2
            const jsBlock = codeBlocks.find((c: any) => c.data.language === 'javascript')
            const pyBlock = codeBlocks.find((c: any) => c.data.language === 'python')
            const hasJSLanguage = !!jsBlock
            const hasPyLanguage = !!pyBlock
            const hasJSCode = jsBlock && jsBlock.data.code.includes('function hello()')
            const hasPyCode = pyBlock && pyBlock.data.code.includes('def hello():')
            const hasNewlines = jsBlock && jsBlock.data.code.includes('\n')

            // Check EditorJS conversion
            const editorJSCodeBlocks = l2.blocks.filter((b: any) => b.type === 'code')
            const hasEditorJSCodeBlocks = editorJSCodeBlocks.length === 2
            const editorJSHasCode = editorJSCodeBlocks.every((c: any) => c.data.code && c.data.code.length > 0)

            console.log(`Code blocks preserved: ${hasCodeBlocks ? '✅' : '❌'} (${codeBlocks.length}/2)`)
            console.log(`JavaScript language: ${hasJSLanguage ? '✅' : '❌'}`)
            console.log(`Python language: ${hasPyLanguage ? '✅' : '❌'}`)
            console.log(`JavaScript code: ${hasJSCode ? '✅' : '❌'}`)
            console.log(`Python code: ${hasPyCode ? '✅' : '❌'}`)
            console.log(`Newlines preserved: ${hasNewlines ? '✅' : '❌'}`)
            console.log(`EditorJS code blocks: ${hasEditorJSCodeBlocks ? '✅' : '❌'} (${editorJSCodeBlocks.length}/2)`)
            console.log(`EditorJS has code: ${editorJSHasCode ? '✅' : '❌'}`)

            return hasCodeBlocks && hasJSLanguage && hasPyLanguage && hasJSCode && hasPyCode && hasNewlines && hasEditorJSCodeBlocks && editorJSHasCode
        }
    ))

    // Test 24: InlineCode Tool Support
    results.push(runTest(
        'InlineCode Tool Support',
        '<p>Use <code>console.log()</code> and <code class="inline-code">JSON.stringify()</code> for debugging. Also try <code>Array.map()</code> method.</p>',
        (l1, l2, l3) => {
            const paragraph = l3.content.find((b: any) => b.name === 'Paragraph')
            const hasInlineCodeElements = paragraph && paragraph.data.some((d: any) => d.name === 'InlineCode')
            const inlineCodeElements = paragraph ? paragraph.data.filter((d: any) => d.name === 'InlineCode') : []
            const hasCorrectCount = inlineCodeElements.length === 3
            const hasConsoleLog = inlineCodeElements.some((e: any) => e.data === 'console.log()')
            const hasJSONStringify = inlineCodeElements.some((e: any) => e.data === 'JSON.stringify()')
            const hasArrayMap = inlineCodeElements.some((e: any) => e.data === 'Array.map()')

            // Check EditorJS conversion (inline code should be HTML with class)
            const editorJSBlock = l2.blocks.find((b: any) => b.type === 'paragraph')
            const editorJSHasInlineCodeClass = editorJSBlock && editorJSBlock.data.text.includes('class="inline-code"')
            const editorJSHasCodeElements = editorJSBlock && (editorJSBlock.data.text.match(/<code[^>]*>/g) || []).length === 3

            console.log(`Inline code elements: ${hasInlineCodeElements ? '✅' : '❌'}`)
            console.log(`Correct count: ${hasCorrectCount ? '✅' : '❌'} (${inlineCodeElements.length}/3)`)
            console.log(`console.log(): ${hasConsoleLog ? '✅' : '❌'}`)
            console.log(`JSON.stringify(): ${hasJSONStringify ? '✅' : '❌'}`)
            console.log(`Array.map(): ${hasArrayMap ? '✅' : '❌'}`)
            console.log(`EditorJS inline-code class: ${editorJSHasInlineCodeClass ? '✅' : '❌'}`)
            console.log(`EditorJS code elements: ${editorJSHasCodeElements ? '✅' : '❌'}`)

            return hasInlineCodeElements && hasCorrectCount && hasConsoleLog && hasJSONStringify && hasArrayMap && editorJSHasInlineCodeClass && editorJSHasCodeElements
        }
    ))

    // Test 25: Mixed Content with All Tools
    results.push(runTest(
        'Mixed Content with All Tools',
        '<h1>Complete Guide</h1><p>This guide covers <code>console.log()</code> usage.</p><ul><li>Basic usage</li><li>Advanced tips</li></ul><blockquote>"Code is poetry" <cite>Author</cite></blockquote><pre><code class="language-js">console.log("Hello!");</code></pre><table><tr><th>Function</th><th>Use</th></tr><tr><td>log</td><td>Debug</td></tr></table><img src="/image.jpg" alt="Demo">',
        (l1, l2, l3) => {
            // Check all block types are preserved
            const hasSubheading = l3.content.some((b: any) => b.name === 'Subheading')
            const hasParagraph = l3.content.some((b: any) => b.name === 'Paragraph')
            const hasList = l3.content.some((b: any) => b.name === 'List')
            const hasQuote = l3.content.some((b: any) => b.name === 'Quote')
            const hasCode = l3.content.some((b: any) => b.name === 'Code')
            const hasTable = l3.content.some((b: any) => b.name === 'Table')
            const hasImage = l3.content.some((b: any) => b.name === 'Image')
            const hasInlineCode = JSON.stringify(l3).includes('InlineCode')

            // Check EditorJS conversion has all tool types
            const editorJSTypes = new Set(l2.blocks.map((b: any) => b.type))
            const hasAllEditorJSTypes = ['header', 'paragraph', 'list', 'quote', 'code', 'table', 'image'].every(type => editorJSTypes.has(type))

            const allBlocksPreserved = hasSubheading && hasParagraph && hasList && hasQuote && hasCode && hasTable && hasImage && hasInlineCode

            console.log(`Subheading: ${hasSubheading ? '✅' : '❌'}`)
            console.log(`Paragraph: ${hasParagraph ? '✅' : '❌'}`)
            console.log(`List: ${hasList ? '✅' : '❌'}`)
            console.log(`Quote: ${hasQuote ? '✅' : '❌'}`)
            console.log(`Code: ${hasCode ? '✅' : '❌'}`)
            console.log(`Table: ${hasTable ? '✅' : '❌'}`)
            console.log(`Image: ${hasImage ? '✅' : '❌'}`)
            console.log(`Inline Code: ${hasInlineCode ? '✅' : '❌'}`)
            console.log(`All EditorJS types: ${hasAllEditorJSTypes ? '✅' : '❌'}`)
            console.log(`Total blocks: ${l3.content.length}`)

            return allBlocksPreserved && hasAllEditorJSTypes
        }
    ))

    // Summary
    console.log('\n' + '='.repeat(50))
    const passed = results.filter(r => r).length
    const total = results.length
    console.log(`📊 Test Summary: ${passed}/${total} tests passed`)

    if (passed < total) {
        console.log(`❌ ${total - passed} tests failed:`)
        results.forEach((result, index) => {
            if (!result) {
                console.log(`  • Test ${index + 1} failed`)
            }
        })
    }

    console.log(passed === total ? '✅ All tests PASSED!' : `❌ ${total - passed} tests failed`)

    return passed === total
}

// EditorJS specific test with your exact data
function runEditorJSTest() {
    console.log('\n🔬 Running EditorJS Specific Test')
    console.log('='.repeat(50))

    const editorJSData = {
        "time": 1763552443805,
        "blocks": [
            {
                "id": "6f0ltrq5gns0000000000",
                "type": "paragraph",
                "data": {
                    "text": "asdf"
                }
            },
            {
                "id": "75zfatd13q80000000000",
                "type": "paragraph",
                "data": {
                    "text": "-hello<br>-world"
                }
            },
            {
                "id": "5zemr0mnhao0000000000",
                "type": "paragraph",
                "data": {
                    "text": "<code class=\"inline-code\">{<br>json:1<br>}</code>"
                }
            }
        ],
        "version": "2.31.0"
    }

    try {
        const contentObject = editorJSToContentObject(editorJSData)
        const backToEditorJS = contentObjectToEditorJS(contentObject)

        console.log('Converted blocks:', contentObject.content.length)
        console.log('Content structure:', JSON.stringify(contentObject, null, 2))
        console.log('Back to EditorJS:', JSON.stringify(backToEditorJS, null, 2))

        // Check structure
        const hasThreeBlocks = contentObject.content.length === 3
        const hasFirstPara = contentObject.content[0]?.name === 'Paragraph'
        const hasInlineCode = JSON.stringify(contentObject).includes('InlineCode')
        const hasNewlines = JSON.stringify(contentObject).includes('\\n')

        // Check round-trip conversion
        const editorJSHasBrTags = JSON.stringify(backToEditorJS).includes('<br>')
        const editorJSHasInlineCodeClass = JSON.stringify(backToEditorJS).includes('inline-code')

        // Check specific content matching your exact input
        const secondBlock = backToEditorJS.blocks[1]?.data?.text
        const thirdBlock = backToEditorJS.blocks[2]?.data?.text
        const hasCorrectSecondBlock = secondBlock === '-hello<br>-world'
        const hasCorrectThirdBlock = thirdBlock && thirdBlock.includes('{<br>json:1<br>}') && thirdBlock.includes('inline-code')

        console.log(`Three blocks: ${hasThreeBlocks ? '✅' : '❌'}`)
        console.log(`First paragraph: ${hasFirstPara ? '✅' : '❌'}`)
        console.log(`Inline code detected: ${hasInlineCode ? '✅' : '❌'}`)
        console.log(`Newlines preserved: ${hasNewlines ? '✅' : '❌'}`)
        console.log(`Round-trip BR tags: ${editorJSHasBrTags ? '✅' : '❌'}`)
        console.log(`Round-trip inline-code class: ${editorJSHasInlineCodeClass ? '✅' : '❌'}`)
        console.log(`Exact second block match: ${hasCorrectSecondBlock ? '✅' : '❌'} (got: "${secondBlock}")`)
        console.log(`Exact third block match: ${hasCorrectThirdBlock ? '✅' : '❌'} (got: "${thirdBlock}")`)

        const success = hasThreeBlocks && hasFirstPara && hasInlineCode && editorJSHasBrTags && editorJSHasInlineCodeClass && hasCorrectSecondBlock && hasCorrectThirdBlock
        console.log(success ? '✅ EditorJS test PASSED!' : '❌ EditorJS test FAILED')
        return success
    } catch (error) {
        console.log('❌ ERROR:', error)
        return false
    }
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
    const editorJSTestPassed = runEditorJSTest()
    const complexTestPassed = runComplexTest()

    console.log('\n' + '='.repeat(50))
    console.log('🏁 FINAL RESULTS')
    console.log('Simple Tests:', simpleTestsPassed ? '✅ PASSED' : '❌ FAILED')
    console.log('EditorJS Test:', editorJSTestPassed ? '✅ PASSED' : '❌ FAILED')
    console.log('Complex Test:', complexTestPassed ? '✅ PASSED' : '❌ FAILED')
    console.log('\n' + (simpleTestsPassed && editorJSTestPassed && complexTestPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ Some tests failed'))
}

//@ts-ignore because require isnt available in browser. and this is just for local testing
if (require.main === module) {
    main();
}