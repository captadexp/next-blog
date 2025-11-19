import {describe, expect, it} from 'bun:test';
import {
    contentObjectToHtml,
    contentObjectToPlainText,
    createEmptyContentObject,
    createParagraphBlock,
    isValidContentObject,
    parseContent
} from './converters';
import type {ContentObject} from './types';

describe('Content Converters', () => {
    describe('contentObjectToHtml', () => {
        it('should convert inline code elements to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'Here is some '
                            },
                            {
                                name: 'InlineCode',
                                version: 1,
                                data: 'console.log("hello")'
                            },
                            {
                                name: 'Text',
                                version: 1,
                                data: ' in the middle.'
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p>Here is some <code class="inline-code">console.log(&quot;hello&quot;)</code> in the middle.</p>');
        });

        it('should convert code blocks to HTML with pre tags', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Code',
                        version: 1,
                        data: {
                            code: 'function hello() {\n  return "world";\n}',
                            language: 'javascript'
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<pre><code>function hello() {\n  return &quot;world&quot;;\n}</code></pre>');
        });

        it('should preserve newlines and formatting in inline code', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'InlineCode',
                                version: 1,
                                data: '{\n  json: 1\n}'
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p><code class="inline-code">{\n  json: 1\n}</code></p>');
        });

        it('should escape HTML in code content', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'InlineCode',
                                version: 1,
                                data: '<div>HTML content</div>'
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p><code class="inline-code">&lt;div&gt;HTML content&lt;/div&gt;</code></p>');
        });

        it('should handle code blocks with special characters', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Code',
                        version: 1,
                        data: {
                            code: 'const obj = {\n  "key": "value & <tag>"\n};'
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<pre><code>const obj = {\n  &quot;key&quot;: &quot;value &amp; &lt;tag&gt;&quot;\n};</code></pre>');
        });

        it('should handle complex content with mixed code types', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'Use '
                            },
                            {
                                name: 'InlineCode',
                                version: 1,
                                data: 'console.log()'
                            },
                            {
                                name: 'Text',
                                version: 1,
                                data: ' for debugging:'
                            }
                        ]
                    },
                    {
                        name: 'Code',
                        version: 1,
                        data: {
                            code: 'console.log("Debug info");'
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            const expected = '<p>Use <code class="inline-code">console.log()</code> for debugging:</p>\n<pre><code>console.log(&quot;Debug info&quot;);</code></pre>';
            expect(html).toBe(expected);
        });

        it('should convert subheadings to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Subheading',
                        version: 1,
                        data: {
                            subheading: 'Main Title',
                            level: 1
                        }
                    },
                    {
                        name: 'Subheading',
                        version: 1,
                        data: {
                            subheading: 'Subtitle',
                            level: 3
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<h1>Main Title</h1>\n<h3>Subtitle</h3>');
        });

        it('should convert subheadings with default level', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Subheading',
                        version: 1,
                        data: {
                            subheading: 'Default Level'
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<h2>Default Level</h2>');
        });

        it('should convert lists to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'List',
                        version: 1,
                        data: {
                            style: 'unordered',
                            items: [
                                {data: 'Item 1'},
                                {data: 'Item 2'}
                            ]
                        }
                    },
                    {
                        name: 'List',
                        version: 1,
                        data: {
                            style: 'ordered',
                            items: [
                                {data: 'First'},
                                {data: 'Second'}
                            ]
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>\n<ol><li>First</li><li>Second</li></ol>');
        });

        it('should convert tables with headings to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Table',
                        version: 1,
                        data: {
                            withHeadings: true,
                            content: [
                                ['Name', 'Age'],
                                ['John', '25'],
                                ['Jane', '30']
                            ]
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>John</td><td>25</td></tr><tr><td>Jane</td><td>30</td></tr></tbody></table>');
        });

        it('should convert tables without headings to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Table',
                        version: 1,
                        data: {
                            withHeadings: false,
                            content: [
                                ['Data 1', 'Data 2'],
                                ['Data 3', 'Data 4']
                            ]
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<table><tbody><tr><td>Data 1</td><td>Data 2</td></tr><tr><td>Data 3</td><td>Data 4</td></tr></tbody></table>');
        });

        it('should convert images to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Image',
                        version: 1,
                        data: {
                            src: 'https://example.com/image.jpg',
                            alt: 'Test image'
                        }
                    },
                    {
                        name: 'Image',
                        version: 1,
                        data: {
                            src: 'https://example.com/image2.jpg'
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<img src="https://example.com/image.jpg" alt="Test image">\n<img src="https://example.com/image2.jpg">');
        });

        it('should convert quotes to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Quote',
                        version: 1,
                        data: {
                            text: 'To be or not to be',
                            caption: 'Shakespeare'
                        }
                    },
                    {
                        name: 'Quote',
                        version: 1,
                        data: {
                            text: 'Quote without caption'
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<blockquote>To be or not to be<cite>Shakespeare</cite></blockquote>\n<blockquote>Quote without caption</blockquote>');
        });

        it('should convert internal embeds to HTML', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Internal Embed',
                        version: 1,
                        data: {
                            name: 'youtubeEmbed',
                            data: {
                                url: 'https://youtube.com/watch?v=123'
                            }
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<div data-embed-type="youtubeEmbed" data-embed-url="https://youtube.com/watch?v=123"></div>');
        });

        it('should handle text blocks directly', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Text',
                        version: 1,
                        data: 'Direct text block'
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p>Direct text block</p>');
        });

        it('should handle link blocks directly', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Link',
                        version: 1,
                        data: {
                            url: 'https://example.com',
                            content: [
                                {
                                    name: 'Text',
                                    version: 1,
                                    data: 'Example Link'
                                }
                            ]
                        }
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p><a href="https://example.com">Example Link</a></p>');
        });

        it('should handle highlight (bold) inline elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'This is '
                            },
                            {
                                name: 'Highlight',
                                version: 1,
                                data: [
                                    {
                                        name: 'Text',
                                        version: 1,
                                        data: 'bold text'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p>This is <b>bold text</b></p>');
        });

        it('should handle italic inline elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'This is '
                            },
                            {
                                name: 'Italic',
                                version: 1,
                                data: [
                                    {
                                        name: 'Text',
                                        version: 1,
                                        data: 'italic text'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p>This is <i>italic text</i></p>');
        });

        it('should handle link inline elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'Visit '
                            },
                            {
                                name: 'Link',
                                version: 1,
                                data: {
                                    url: 'https://example.com',
                                    content: [
                                        {
                                            name: 'Text',
                                            version: 1,
                                            data: 'our site'
                                        }
                                    ]
                                }
                            },
                            {
                                name: 'Text',
                                version: 1,
                                data: ' today'
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p>Visit <a href="https://example.com">our site</a> today</p>');
        });

        it('should handle nested inline formatting', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Highlight',
                                version: 1,
                                data: [
                                    {
                                        name: 'Text',
                                        version: 1,
                                        data: 'Bold with '
                                    },
                                    {
                                        name: 'Italic',
                                        version: 1,
                                        data: [
                                            {
                                                name: 'Text',
                                                version: 1,
                                                data: 'italic nested'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p><b>Bold with <i>italic nested</i></b></p>');
        });

        it('should handle string input by parsing JSON', () => {
            const jsonString = JSON.stringify({
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'Parsed from JSON string'
                            }
                        ]
                    }
                ]
            });

            const html = contentObjectToHtml(jsonString);
            expect(html).toBe('<p>Parsed from JSON string</p>');
        });

        it('should handle invalid JSON string input', () => {
            const invalidJson = 'This is not JSON';
            const html = contentObjectToHtml(invalidJson);
            expect(html).toBe('This is not JSON');
        });

        it('should add br tags between consecutive text elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: '-hello'
                            },
                            {
                                name: 'Text',
                                version: 1,
                                data: '-world'
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p>-hello<br/>-world</p>');
        });

        it('should not add br tags between non-consecutive text elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'Start '
                            },
                            {
                                name: 'InlineCode',
                                version: 1,
                                data: 'code'
                            },
                            {
                                name: 'Text',
                                version: 1,
                                data: ' end'
                            }
                        ]
                    }
                ]
            };

            const html = contentObjectToHtml(contentObject);
            expect(html).toBe('<p>Start <code class="inline-code">code</code> end</p>');
        });
    });

    describe('contentObjectToPlainText', () => {
        it('should extract text from inline code elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'Here is some '
                            },
                            {
                                name: 'InlineCode',
                                version: 1,
                                data: 'console.log("hello")'
                            },
                            {
                                name: 'Text',
                                version: 1,
                                data: ' in the middle.'
                            }
                        ]
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('Here is some console.log("hello") in the middle.');
        });

        it('should extract text from code blocks', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Code',
                        version: 1,
                        data: {
                            code: 'function hello() {\n  return "world";\n}'
                        }
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('function hello() {\n  return "world";\n}');
        });

        it('should extract text from subheadings', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Subheading',
                        version: 1,
                        data: {
                            subheading: 'Main Title'
                        }
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('Main Title');
        });

        it('should extract text from lists', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'List',
                        version: 1,
                        data: {
                            style: 'unordered',
                            items: [
                                {data: 'Item 1'},
                                {data: 'Item 2'}
                            ]
                        }
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('• Item 1\n• Item 2');
        });

        it('should extract text from tables', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Table',
                        version: 1,
                        data: {
                            content: [
                                ['Name', 'Age'],
                                ['John', '25']
                            ]
                        }
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('Name | Age\n\nJohn | 25');
        });

        it('should extract text from quotes', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Quote',
                        version: 1,
                        data: {
                            text: 'To be or not to be',
                            caption: 'Shakespeare'
                        }
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('"To be or not to be"\n\n— Shakespeare');
        });

        it('should extract text from quotes without caption', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Quote',
                        version: 1,
                        data: {
                            text: 'Quote without caption'
                        }
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('"Quote without caption"');
        });

        it('should extract text from direct text blocks', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Text',
                        version: 1,
                        data: 'Direct text block'
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('Direct text block');
        });

        it('should extract text from highlight elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Highlight',
                                version: 1,
                                data: [
                                    {
                                        name: 'Text',
                                        version: 1,
                                        data: 'bold text'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('bold text');
        });

        it('should extract text from italic elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Italic',
                                version: 1,
                                data: [
                                    {
                                        name: 'Text',
                                        version: 1,
                                        data: 'italic text'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('italic text');
        });

        it('should extract text from link elements', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Link',
                                version: 1,
                                data: {
                                    url: 'https://example.com',
                                    content: [
                                        {
                                            name: 'Text',
                                            version: 1,
                                            data: 'link text'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('link text');
        });

        it('should handle complex content with multiple block types', () => {
            const contentObject: ContentObject = {
                version: 1,
                content: [
                    {
                        name: 'Subheading',
                        version: 1,
                        data: {
                            subheading: 'Title'
                        }
                    },
                    {
                        name: 'Paragraph',
                        version: 1,
                        data: [
                            {
                                name: 'Text',
                                version: 1,
                                data: 'Some text with '
                            },
                            {
                                name: 'InlineCode',
                                version: 1,
                                data: 'code()'
                            }
                        ]
                    },
                    {
                        name: 'List',
                        version: 1,
                        data: {
                            items: [{data: 'Item'}]
                        }
                    }
                ]
            };

            const text = contentObjectToPlainText(contentObject);
            expect(text).toBe('Title\n\nSome text with code()\n\n• Item');
        });

        it('should handle string input by parsing JSON', () => {
            const jsonString = JSON.stringify({
                version: 1,
                content: [
                    {
                        name: 'Text',
                        version: 1,
                        data: 'Parsed from JSON'
                    }
                ]
            });

            const text = contentObjectToPlainText(jsonString);
            expect(text).toBe('Parsed from JSON');
        });

        it('should handle invalid JSON string input', () => {
            const invalidJson = 'Plain text';
            const text = contentObjectToPlainText(invalidJson);
            expect(text).toBe('Plain text');
        });
    });

    describe('Helper Functions', () => {
        it('should create empty content object', () => {
            const empty = createEmptyContentObject();
            expect(empty.version).toBe(1);
            expect(empty.content).toEqual([]);
        });

        it('should create paragraph block from text', () => {
            const paragraph = createParagraphBlock('Test text');
            expect(paragraph.name).toBe('Paragraph');
            expect(paragraph.version).toBe(1);
            expect(paragraph.data).toEqual([{
                name: 'Text',
                version: 1,
                data: 'Test text'
            }]);
        });

        it('should validate valid content object JSON', () => {
            const validJson = JSON.stringify({
                version: 1,
                content: []
            });
            expect(isValidContentObject(validJson)).toBe(true);
        });

        it('should invalidate malformed JSON', () => {
            expect(isValidContentObject('invalid json')).toBe(false);
            expect(isValidContentObject('null')).toBe(false);
            expect(isValidContentObject(JSON.stringify({version: 1}))).toBe(false);
            expect(isValidContentObject(JSON.stringify({content: []}))).toBe(false);
        });

        it('should parse valid content object', () => {
            const validJson = JSON.stringify({
                version: 1,
                content: [{name: 'Text', version: 1, data: 'test'}]
            });
            const parsed = parseContent(validJson);
            expect(parsed?.version).toBe(1);
            expect(parsed?.content).toHaveLength(1);
        });

        it('should parse plain text to content object', () => {
            const parsed = parseContent('Simple text');
            expect(parsed?.version).toBe(1);
            expect(parsed?.content).toHaveLength(1);
            expect(parsed?.content[0].name).toBe('Paragraph');
        });

        it('should parse existing content object', () => {
            const contentObject = {
                version: 1,
                content: [{name: 'Text', version: 1, data: 'test'}]
            };
            const parsed = parseContent(contentObject);
            expect(parsed).toBe(contentObject);
        });

        it('should return null for invalid input', () => {
            expect(parseContent(null as any)).toBe(null);
            expect(parseContent(undefined as any)).toBe(null);
            expect(parseContent({} as any)).toBe(null);
        });
    });
});