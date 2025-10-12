/**
 * Content Object Types for Next-Blog
 * Re-export types from @supergrowthai/types package
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
} from '@supergrowthai/types';

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