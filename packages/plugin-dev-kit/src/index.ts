export {
    definePlugin,
    defineClient,
    defineServer,
    createComponent,
    createAsyncHook,
} from './helpers/plugin-builder.js';

// Re-export common types that plugins frequently use
export type {
    // SEO types
    LlmsData,
    LlmsSection,
    SeoHookPayload,
    SeoHookPayloadWithDb,
    SitemapData,
    SitemapUrl,
    RobotsData,
    RssData,
    RssItem,

    // Common types
    ContentObject,
    Blog,
    Category,
    User,
    APIResponse,

    // Plugin types
    PluginManifest,
    ClientPluginModule,
    ServerPluginModule,
} from '@supergrowthai/next-blog-types';

// Re-export interface for module augmentation
export type {RPCMethods} from '@supergrowthai/next-blog-types';

// Re-export jsx-runtime for plugins
export * as jsx from '@supergrowthai/jsx-runtime';