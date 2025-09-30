/**
 * @supergrowthai/oneapi
 *
 * Universal API router for Express and Next.js
 *
 * Usage:
 * - For Express: import from '@supergrowthai/oneapi/express'
 * - For Next.js: import from '@supergrowthai/oneapi/nextjs'
 */

// Error classes
export * from './errors';

// Type definitions
export * from './types';

// Path parsing utilities
export * from './parse-path';

// Authentication handlers
export * from './auth/auth-handler';
export * from './auth/iron-session-handler';
export * from './auth/express-iron-session-handler'
export * from './auth/nextjs-iron-session-handler'