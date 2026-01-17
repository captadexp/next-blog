import {OutputData} from '@editorjs/editorjs';

export function editorJSToHTML(data: OutputData): string {
    if (!data || !data.blocks || !Array.isArray(data.blocks)) {
        return '';
    }

    return data.blocks.map(block => {
        switch (block.type) {
            case 'paragraph':
                return `<p>${block.data.text}</p>`;

            case 'header':
                const level = block.data.level || 2;
                return `<h${level}>${block.data.text}</h${level}>`;

            case 'list':
                const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
                const items = (block.data.items || []).map((item: any) => {
                    const content = typeof item === 'string' ? item : (item.content || '');
                    return `<li>${content}</li>`;
                }).join('');
                return `<${tag}>${items}</${tag}>`;

            case 'image':
                const caption = block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : '';
                return `<figure><img src="${block.data.src}" alt="${block.data.alt || ''}" />${caption}</figure>`;

            case 'quote':
                const quoteCaption = block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : '';
                return `<blockquote><p>${block.data.text}</p>${quoteCaption}</blockquote>`;

            case 'code':
                const languageClass = block.data.language ? ` class="language-${block.data.language}"` : '';
                return `<pre${languageClass}><code${languageClass}>${block.data.code}</code></pre>`;

            case 'table':
                const rows = (block.data.content || []).map((row: string[], index: number) => {
                    const isHead = block.data.withHeadings && index === 0;
                    const cellTag = isHead ? 'th' : 'td';
                    const cells = row.map(cell => `<${cellTag}>${cell}</${cellTag}>`).join('');
                    return `<tr>${cells}</tr>`;
                }).join('');

                if (block.data.withHeadings && rows.length > 0) {
                    const rowArray = (block.data.content || []);
                    if (rowArray.length === 0) return '<table></table>';

                    const headRow = rowArray[0].map((cell: string) => `<th>${cell}</th>`).join('');
                    const bodyRows = rowArray.slice(1).map((row: string[]) => {
                        const cells = row.map((cell: string) => `<td>${cell}</td>`).join('');
                        return `<tr>${cells}</tr>`;
                    }).join('');

                    return `<table><thead><tr>${headRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
                }

                return `<table><tbody>${rows}</tbody></table>`;

            case 'youtubeEmbed':
            case 'twitterEmbed':
            case 'instagramEmbed':
            case 'spotifyEmbed':
            case 'redditEmbed':
                return `<div data-type="${block.type}" data-url="${block.data.url}"></div>`;

            default:
                console.warn('Unknown block type:', block.type);
                return '';
        }
    }).join('');
}
