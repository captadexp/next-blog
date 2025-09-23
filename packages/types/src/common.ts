/**
 * Common type definitions shared between server and client
 */

// Re-export entities - used by both
export * from './database/entities';

// Re-export base SDK types - used by both
export type {
    BaseSDK,
    PluginSettings,
    PluginCache,
    PluginEvents,
    Logger
} from './sdk/base';

// Re-export configuration - may be used by both
export * from './configuration';

// Re-export events - used by both
export * from './events';