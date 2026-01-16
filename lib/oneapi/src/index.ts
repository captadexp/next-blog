/**
 * @supergrowthai/oneapi
 *
 * Universal API router - framework agnostic core
 *
 * For framework-specific implementations:
 * - Express: import from '@supergrowthai/oneapi/express'
 * - Next.js: import from '@supergrowthai/oneapi/nextjs'
 */

// Error classes
export * from './errors.js';

// Type definitions
export * from './types.js';

// Path parsing utilities
export * from './parse-path.js';

// Generic router
export {GenericRouter, createGenericRouter, defaultLogger} from './router/generic-router.js';
export type {GenericRouterConfig, OneApiLogger} from './router/generic-router.js';
export {GenericIronSessionHandler} from './auth/generic-iron-session-handler.js';

// Authentication base classes
export * from './auth/iron-session-handler.js';
