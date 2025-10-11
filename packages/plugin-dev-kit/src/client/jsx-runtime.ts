// Re-export all JSX runtime types and functions from the main jsx-runtime package
// This eliminates duplication and ensures a single source of truth
export {
    // Core JSX functions
    jsx,
    jsxs,
    jsxDEV,
    Fragment,

    // Types
    type PluginRuntime,

    // Symbols
    JSX_ELEMENT,
    JSX_FRAGMENT,

    // Utilities
    utils
} from '@supergrowthai/jsx-runtime';