// Server-side SDK for Node.js plugins
export {
    type ServerSDK,
    type ServerPluginModule,
    type Logger,
    type User,
    type APIResponse,
} from '@supergrowthai/types';

// Re-export server-specific types
export type {
    // SEO Hook types
    SeoHookPayload,
    SeoHookPayloadWithDb,
    LlmsData,
    LlmsSection,
    SitemapData,
    RobotsData,
    RssData,

    // Database entities
    Blog,
    Category,
    ContentObject,
} from '@supergrowthai/types';

// Re-export from @supergrowthai/types/server subpath
export type {ServerSDK as ServerSDKType} from '@supergrowthai/types/server';

export {createMockServerSDK} from './mock-sdk';
export {testServerPlugin} from './test-harness';