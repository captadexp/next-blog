/**
 * Content Object Types for Next-Blog
 * Re-export types from @supergrowthai/next-blog-types package
 */

export type {
    ContentObjectBase,
    TextItem,
    ItalicItem,
    HighlightItem,
    LinkItem,
    InlineNode,
    ParagraphLayout,
    SubheadingLayout,
    ListItem,
    ListLayout,
    TableLayout,
    ImageLayout,
    QuoteLayout,
    CodeLayout,
    IgnoreLayout,
    InternalEmbed,
    ContentObjectLayout,
    ContentObject,
} from '@supergrowthai/next-blog-types';

/* ================================
 * Utility Types
 * ================================ */

export interface ExtractedLink {
    url: string;
    text?: string;
    type: 'link' | 'image' | 'embed';
}

export interface ExtractedImage {
    src: string;
    alt?: string;
}

export interface ExtractedHeading {
    text: string;
    level: number;
}