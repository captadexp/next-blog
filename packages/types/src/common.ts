/**
 * Common type definitions shared between server and client
 */

// Re-export entities - used by both
export * from './database/entities';

// Re-export type-safe hydration utilities
export * from './type-base-hydration';

// Re-export configuration - may be used by both
export * from './configuration';

// Re-export events - used by both
export * from './events';