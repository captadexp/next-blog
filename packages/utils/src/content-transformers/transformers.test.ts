import {describe, expect, test} from "bun:test";
import {htmlToContentObject} from "./html-to-contentobject";
import {contentObjectToHTML} from "./contentobject-to-html";
import {htmlToEditorJS} from "./html-to-editorjs";
import {editorJSToHTML} from "./editorjs-to-html";
import type {OutputData} from '@editorjs/editorjs';

describe("HTML-Centric Transformation Logic", () => {
    test("Plain Text", () => {
        const html = '<p>This is simple plain text.</p>';
        const contentObject = htmlToContentObject(html);

        expect(JSON.stringify(contentObject)).toContain('This is simple plain text');
    });

    test("Bold and Italic", () => {
        const html = '<p>This has <b>bold</b> and <i>italic</i> text.</p>';
        const contentObject = htmlToContentObject(html);

        expect(JSON.stringify(contentObject)).toContain('Highlight');
        expect(JSON.stringify(contentObject)).toContain('Italic');
    });

    test("Simple Link", () => {
        const html = '<p>Visit <a href="https://example.com">our website</a> for more.</p>';
        const contentObject = htmlToContentObject(html);

        expect(JSON.stringify(contentObject)).toContain('Link');
        expect(JSON.stringify(contentObject)).toContain('https://example.com');
        expect(JSON.stringify(contentObject)).toContain('our website');
    });

    test("Headings (h1-h6)", () => {
        const html = '<h1>Main Title</h1><h2>Subtitle</h2><h3>Section</h3><h4>Subsection</h4><h5>Minor Heading</h5><h6>Smallest Heading</h6>';
        const contentObject = htmlToContentObject(html);

        const headers = contentObject.content.filter((b: any) => b.name === 'Subheading');
        expect(headers.length).toBe(6);
        expect(headers.some((h: any) => h.data.level === 1 && h.data.subheading === 'Main Title')).toBe(true);
        expect(headers.some((h: any) => h.data.level === 6 && h.data.subheading === 'Smallest Heading')).toBe(true);
    });

    test("Lists (ordered and unordered)", () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>';
        const contentObject = htmlToContentObject(html);

        const lists = contentObject.content.filter((b: any) => b.name === 'List');
        expect(lists.length).toBe(2);
        expect(JSON.stringify(contentObject)).toContain('Item 1');
        expect(JSON.stringify(contentObject)).toContain('Second');
    });

    test("Empty Paragraph", () => {
        const html = '<p></p>';
        const contentObject = htmlToContentObject(html);

        expect(contentObject.content.length).toBe(1);
        expect(contentObject.content[0].name).toBe('Paragraph');
    });

    test("Special Characters", () => {
        const html = '<p>Special chars: &lt; &gt; &amp; &#8217; &quot;</p>';
        const contentObject = htmlToContentObject(html);

        expect(JSON.stringify(contentObject)).toContain('<');
        expect(JSON.stringify(contentObject)).toContain('>');
    });

    test("Nested Formatting", () => {
        const html = '<p>Text with <b>bold and <i>italic nested</i> inside</b> it.</p>';
        const contentObject = htmlToContentObject(html);

        expect(JSON.stringify(contentObject)).toContain('Highlight');
        expect(JSON.stringify(contentObject)).toContain('Italic');
    });

    test("Multiple Paragraphs", () => {
        const html = '<p>First paragraph.</p><p>Second paragraph.</p><p>Third paragraph.</p>';
        const contentObject = htmlToContentObject(html);

        const paragraphCount = contentObject.content.filter((b: any) => b.name === 'Paragraph').length;
        expect(paragraphCount).toBe(3);
    });

    test("Image", () => {
        const html = '<img src="https://example.com/image.jpg" alt="Test image">';
        const contentObject = htmlToContentObject(html);

        expect(contentObject.content.some((b: any) => b.name === 'Image')).toBe(true);
        expect(JSON.stringify(contentObject)).toContain('https://example.com/image.jpg');
    });

    test("Inline Code", () => {
        const html = '<p>Use the <code>console.log()</code> function to debug.</p>';
        const contentObject = htmlToContentObject(html);

        expect(JSON.stringify(contentObject)).toContain('InlineCode');
        expect(JSON.stringify(contentObject)).toContain('console.log()');
    });

    test("Code Block with Language", () => {
        const html = '<pre><code class="language-javascript">function hello() {\n  console.log("Hello!");\n}</code></pre>';
        const contentObject = htmlToContentObject(html);

        const codeBlock = contentObject.content.find((b: any) => b.name === 'Code');
        expect(codeBlock).toBeDefined();
        expect((codeBlock as any)?.data.language).toBe('javascript');
        expect((codeBlock as any)?.data.code).toContain('\n');
    });

    test("Code Block Formatting", () => {
        const html = '<pre><code>if (condition) {\n\tconsole.log("indented");\n    let x = 5;\n}</code></pre>';
        const contentObject = htmlToContentObject(html);

        const codeBlock = contentObject.content.find((b: any) => b.name === 'Code');
        expect((codeBlock as any)?.data.code).toContain('\n');
        expect((codeBlock as any)?.data.code).toContain('\t');
        expect((codeBlock as any)?.data.code).toContain('    ');
    });

    test("Multi-line Code", () => {
        const html = '<pre><code>const data = {\n  name: "test",\n  value: 42\n};</code></pre>';
        const contentObject = htmlToContentObject(html);

        const codeBlock = contentObject.content.find((b: any) => b.name === 'Code');
        expect(codeBlock).toBeDefined();
        expect((codeBlock as any)?.data.code.split('\n').length).toBeGreaterThan(1);
        expect((codeBlock as any)?.data.code).toContain('name: "test"');
    });

    test("Quote Support", () => {
        const html = '<blockquote>"The only way to do great work is to love what you do."</blockquote>';
        const contentObject = htmlToContentObject(html);

        const quote = contentObject.content.find((b: any) => b.name === 'Quote');
        expect(quote).toBeDefined();
        expect((quote as any)?.data.text).toContain('great work');
    });

    test("Table with headings", () => {
        const html = '<table><thead><tr><th>Name</th><th>Age</th><th>City</th></tr></thead><tbody><tr><td>John</td><td>25</td><td>NYC</td></tr><tr><td>Jane</td><td>30</td><td>LA</td></tr></tbody></table>';
        const contentObject = htmlToContentObject(html);

        const table = contentObject.content.find((b: any) => b.name === 'Table');
        expect(table).toBeDefined();
        expect((table as any)?.data.withHeadings).toBe(true);
        expect((table as any)?.data.content.length).toBe(3);
        expect((table as any)?.data.content[1][0]).toBe('John');
    });

    test("Multiple inline code elements", () => {
        const html = '<p>Use <code>console.log()</code> and <code class="inline-code">JSON.stringify()</code> for debugging. Also try <code>Array.map()</code> method.</p>';
        const contentObject = htmlToContentObject(html);

        const paragraph = contentObject.content.find((b: any) => b.name === 'Paragraph');
        const inlineCodeElements = (paragraph as any)?.data.filter((d: any) => d.name === 'InlineCode');
        expect(inlineCodeElements?.length).toBe(3);
    });

    test("Mixed content with all tools", () => {
        const html = '<h1>Complete Guide</h1><p>This guide covers <code>console.log()</code> usage.</p><ul><li>Basic usage</li><li>Advanced tips</li></ul><blockquote>"Code is poetry"</blockquote><pre><code class="language-js">console.log("Hello!");</code></pre><table><tr><th>Function</th><th>Use</th></tr><tr><td>log</td><td>Debug</td></tr></table><img src="/image.jpg" alt="Demo">';
        const contentObject = htmlToContentObject(html);

        expect(contentObject.content.some((b: any) => b.name === 'Subheading')).toBe(true);
        expect(contentObject.content.some((b: any) => b.name === 'Paragraph')).toBe(true);
        expect(contentObject.content.some((b: any) => b.name === 'List')).toBe(true);
        expect(contentObject.content.some((b: any) => b.name === 'Quote')).toBe(true);
        expect(contentObject.content.some((b: any) => b.name === 'Code')).toBe(true);
        expect(contentObject.content.some((b: any) => b.name === 'Table')).toBe(true);
        expect(contentObject.content.some((b: any) => b.name === 'Image')).toBe(true);
        expect(JSON.stringify(contentObject)).toContain('InlineCode');
    });

    test("HTML -> ContentObject -> HTML round trip", () => {
        const html = '<h1>Hello World</h1><p>This is a <b>bold</b> paragraph.</p><ul><li>Item 1</li><li>Item 2</li></ul>';
        const contentObject = htmlToContentObject(html);
        const htmlOutput = contentObjectToHTML(contentObject);

        expect(htmlOutput).toContain("Hello World");
        expect(htmlOutput).toContain("<b>");
        expect(htmlOutput).toContain("<li>Item 1</li>");
    });

    test("HTML -> EditorJS -> HTML round trip", () => {
        const html = '<h1>Hello World</h1><p>This is a <b>bold</b> paragraph.</p><ul><li>Item 1</li><li>Item 2</li></ul>';
        const editorJS = htmlToEditorJS(html);
        const htmlOutput = editorJSToHTML(editorJS);

        expect(htmlOutput).toContain("Hello World");
        expect(htmlOutput).toContain("<li>Item 1</li>");
    });

    test("Full round trip: ContentObject -> HTML -> EditorJS -> HTML -> ContentObject", () => {
        const html = '<h1>Test</h1><p>Content</p>';
        const contentObject = htmlToContentObject(html);
        const html1 = contentObjectToHTML(contentObject);
        const editorJS = htmlToEditorJS(html1);
        const html2 = editorJSToHTML(editorJS);
        const finalContentObject = htmlToContentObject(html2);

        expect(finalContentObject.content.length).toBeGreaterThan(0);
        expect(finalContentObject.content[0].name).toBe("Subheading");
    });

    test("EditorJS -> HTML -> ContentObject", () => {
        const editorJSData = {
            time: Date.now(),
            blocks: [
                {type: 'header', data: {text: 'Title', level: 1}},
                {type: 'paragraph', data: {text: 'Some <b>bold</b> text'}},
                {type: 'list', data: {style: 'unordered', items: ['A', 'B', 'C']}}
            ],
            version: '2.30.0'
        };

        const html = editorJSToHTML(editorJSData);
        const contentObject = htmlToContentObject(html);

        expect(contentObject.content.some(b => b.name === 'Subheading')).toBe(true);
        expect(contentObject.content.some(b => b.name === 'Paragraph')).toBe(true);
        expect(contentObject.content.some(b => b.name === 'List')).toBe(true);
    });

    test("ContentObject -> HTML -> EditorJS", () => {
        const contentObject = {
            version: 1,
            content: [
                {name: 'Subheading' as const, version: 1, data: {subheading: 'Title', level: 1}},
                {
                    name: 'Paragraph' as const, version: 1, data: [
                        {name: 'Text' as const, version: 1, data: 'Some '},
                        {
                            name: 'Highlight' as const,
                            version: 1,
                            data: [{name: 'Text' as const, version: 1, data: 'bold'}]
                        },
                        {name: 'Text' as const, version: 1, data: ' text'}
                    ]
                },
                {
                    name: 'List' as const, version: 1, data: {
                        style: 'unordered' as const,
                        items: [
                            {name: 'ListItem' as const, version: 1, data: 'A'},
                            {name: 'ListItem' as const, version: 1, data: 'B'}
                        ]
                    }
                }
            ]
        };

        const html = contentObjectToHTML(contentObject);
        const editorJS = htmlToEditorJS(html);

        expect(editorJS.blocks.some(b => b.type === 'header')).toBe(true);
        expect(editorJS.blocks.some(b => b.type === 'paragraph')).toBe(true);
        expect(editorJS.blocks.some(b => b.type === 'list')).toBe(true);
    });

    test("BR tags don't double in round-trip", () => {
        // This tests the specific issue: -hello<br>-world should not become -hello<br><br>-world
        const html = '<p>-hello<br>-world</p>';
        const contentObject = htmlToContentObject(html);
        const htmlOutput = contentObjectToHTML(contentObject);

        // Should have exactly one <br> tag, not two
        const brCount = (htmlOutput.match(/<br>/g) || []).length;
        expect(brCount).toBe(1);
        expect(htmlOutput).toContain('-hello<br>-world');
    });

    test("Embed divs convert to EditorJS embed blocks", () => {
        // Test that embed divs (YouTube, Twitter, etc.) are properly converted
        const html = '<div data-type="youtubeEmbed" data-url="https://youtube.com/watch?v=123"></div>';
        const editorJS = htmlToEditorJS(html);

        expect(editorJS.blocks.length).toBe(1);
        expect(editorJS.blocks[0].type).toBe('youtubeEmbed');
        expect(editorJS.blocks[0].data.url).toBe('https://youtube.com/watch?v=123');
    });

    test("Regular divs with text convert to paragraphs", () => {
        // Test that regular divs (without data-type) are treated as paragraphs
        const html = '<div>This is a div with text</div>';
        const editorJS = htmlToEditorJS(html);

        expect(editorJS.blocks.length).toBe(1);
        expect(editorJS.blocks[0].type).toBe('paragraph');
        expect(editorJS.blocks[0].data.text).toContain('This is a div with text');
    });

    test("editor to db to render roundtrip", () => {
        const editorJSData: OutputData = {
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
        };

        const html = editorJSToHTML(editorJSData);
        const contentObject = htmlToContentObject(html);
        const html2 = contentObjectToHTML(contentObject);
        const editorJS2 = htmlToEditorJS(html2);

        console.log(JSON.stringify(contentObject))
        console.log(html2);

        // HTML should match exactly
        expect(html).toBe(html2);

        // EditorJS blocks should match (ignoring time, id, version which will differ)
        expect(editorJS2.blocks.length).toBe(editorJSData.blocks.length);
        editorJSData.blocks.forEach((block, i) => {
            expect(editorJS2.blocks[i].type).toBe(block.type);
            expect(editorJS2.blocks[i].data).toEqual(block.data);
        });
    })
});