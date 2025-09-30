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