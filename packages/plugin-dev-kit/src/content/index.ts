/**
 * Content Utilities for Next-Blog Plugins
 *
 * This module provides utilities for working with ContentObject,
 * the block-based content structure used by the blog system.
 */

// Export types
export type {
    ContentObject,
    ContentObjectLayout,
    ContentObjectBase,
    // Inline elements
    InlineNode,
    TextItem,
    ItalicItem,
    HighlightItem,
    LinkItem,
    // Block elements
    ParagraphLayout,
    SubheadingLayout,
    ListItem,
    ListLayout,
    TableLayout,
    ImageLayout,
    QuoteLayout,
    CodeLayout,
    IgnoreLayout,
    // Embeds
    InternalEmbed,
    // Utility types
    ExtractedLink,
    ExtractedImage,
    ExtractedHeading
} from './types';

// Export extractors
export {
    extractTextFromContent,
    extractLinksFromContent,
    extractImagesFromContent,
    extractHeadingsFromContent,
    getWordCount,
    getCharacterCount,
    hasBlockType,
    countBlockType
} from './extractors';

// Export converters
export {
    contentObjectToHtml,
    contentObjectToPlainText,
    createEmptyContentObject,
    createParagraphBlock,
    isValidContentObject,
    parseContent
} from './converters';