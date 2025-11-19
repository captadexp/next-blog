import type {ContentObject, ContentObjectLayout, InlineNode} from '@supergrowthai/next-blog-types';

export function contentObjectToHTML(contentObject: ContentObject): string {
    if (!contentObject || !contentObject.content) {
        return '';
    }

    return contentObject.content.map(item => processLayout(item)).join('');
}

function processLayout(item: ContentObjectLayout): string {
    switch (item.name) {
        case 'Paragraph':
            return `<p>${item.data.map(processInline).join('')}</p>`;

        case 'Subheading':
            const level = item.data.level || 2;
            return `<h${level}>${item.data.subheading}</h${level}>`;

        case 'List':
            const tag = item.data.style === 'ordered' ? 'ol' : 'ul';
            const items = item.data.items.map(li => `<li>${li.data}</li>`).join('');
            return `<${tag}>${items}</${tag}>`;

        case 'Image':
            return `<figure><img src="${item.data.src}" alt="${item.data.alt || ''}" /></figure>`;

        case 'Quote':
            const caption = item.data.caption ? `<figcaption>${item.data.caption}</figcaption>` : '';
            return `<blockquote><p>${item.data.text}</p>${caption}</blockquote>`;

        case 'Code':
            const languageClass = item.data.language ? ` class="language-${item.data.language}"` : '';
            return `<pre${languageClass}><code${languageClass}>${item.data.code}</code></pre>`;

        case 'Table':
            const rows = item.data.content.map((row, index) => {
                const isHead = item.data.withHeadings && index === 0;
                const cellTag = isHead ? 'th' : 'td';
                const cells = row.map(cell => `<${cellTag}>${cell}</${cellTag}>`).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

            if (item.data.withHeadings && rows.length > 0) {
                // Similar logic to editorjs-to-html, split if needed or just return table
                // For simplicity here, let's just wrap in table. 
                // A more robust impl would split thead/tbody
                return `<table><tbody>${rows}</tbody></table>`;
            }
            return `<table><tbody>${rows}</tbody></table>`;

        case 'Internal Embed':
            return `<div data-type="${item.data.name}" data-url="${item.data.data.url}"></div>`;

        default:
            return '';
    }
}

function processInline(item: InlineNode): string {
    switch (item.name) {
        case 'Text':
            // Convert newlines to <br> tags for HTML rendering
            return item.data.replace(/\n/g, '<br>');
        case 'Italic':
            return `<i>${item.data.map(processInline).join('')}</i>`;
        case 'Highlight':
            return `<b>${item.data.map(processInline).join('')}</b>`;
        case 'Link':
            return `<a href="${item.data.url}">${item.data.content.map(processInline).join('')}</a>`;
        case 'InlineCode':
            // For inline code, also convert newlines to <br> to match EditorJS format
            return `<code class="inline-code">${item.data.replace(/\n/g, '<br>')}</code>`;
        default:
            return '';
    }
}
