/**
 * Content Object Types for Next-Blog
 * These types define the block-based content structure used by the blog system
 */

/* ================================
 * Base Types
 * ================================ */

export type ContentObjectBase<N extends string, D> = {
    name: N;
    version: number;
    data: D;
};

/* ================================
 * Inline Elements
 * ================================ */

export type TextItem = ContentObjectBase<"Text", string>;
export type ItalicItem = ContentObjectBase<"Italic", InlineNode[]>;
export type HighlightItem = ContentObjectBase<"Highlight", InlineNode[]>;
export type LinkItem = ContentObjectBase<"Link", { content: InlineNode[]; url: string; }>;
export type UnderlineItem = ContentObjectBase<"Underline", string>;
export type StrikeThroughItem = ContentObjectBase<"StrickThrough", string>; // Note: typo preserved from original

// Inline union
export type InlineNode = TextItem | ItalicItem | HighlightItem | LinkItem | UnderlineItem | StrikeThroughItem;

/* ================================
 * Block Elements
 * ================================ */

export type ParagraphLayout = ContentObjectBase<"Paragraph", InlineNode[]>;
export type SubheadingLayout = ContentObjectBase<"Subheading", { 
    subheading: string;
    level?: number;
}>;
export type ListItem = ContentObjectBase<"ListItem", string>;
export type ListLayout = ContentObjectBase<"List", { 
    style: "unordered" | "ordered"; 
    items: ListItem[];
}>;
export type TableLayout = ContentObjectBase<"Table", { 
    withHeadings: boolean; 
    content: string[][];
}>;
export type ImageLayout = ContentObjectBase<"Image", { 
    src: string; 
    alt?: string;
}>;
export type QuoteLayout = ContentObjectBase<"Quote", {
    text: string;
    caption?: string;
}>;
export type CodeLayout = ContentObjectBase<"Code", {
    code: string;
    language?: string;
}>;
export type IgnoreLayout = ContentObjectBase<"Ignore", unknown>;

/* ================================
 * Embed Types
 * ================================ */

export type InternalEmbed =
    | ContentObjectBase<"Internal Embed", { name: "youtubeEmbed"; data: { url: string } }>
    | ContentObjectBase<"Internal Embed", { name: "twitterEmbed"; data: { url: string } }>
    | ContentObjectBase<"Internal Embed", { name: "spotifyEmbed"; data: { url: string } }>
    | ContentObjectBase<"Internal Embed", { name: "instagramEmbed"; data: { url: string; } }>
    | ContentObjectBase<"Internal Embed", { name: "redditEmbed"; data: { url: string } }>;

/* ================================
 * Content Structure
 * ================================ */

// Layout union - all possible content blocks
export type ContentObjectLayout =
    | ParagraphLayout
    | ImageLayout
    | SubheadingLayout
    | TableLayout
    | ListLayout
    | QuoteLayout
    | CodeLayout
    | IgnoreLayout
    | InlineNode
    | InternalEmbed;

// Root content object
export type ContentObject = {
    version: number;
    content: ContentObjectLayout[];
};

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