/**
 * JSON-LD validation and sanitization
 */
import {JsonLdSchema} from './types.js';
import {ValidationError} from './errors.js';

/**
 * Sanitize string to prevent XSS in JSON-LD
 */
export function sanitizeString(str: string | undefined): string | undefined {
    if (!str) return undefined;
    if (typeof str !== 'string') return undefined;

    let sanitized = str
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers (more comprehensive)
        .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:[^\s"'<>]*/gi, '')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        .trim();

    return sanitized || undefined;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const sanitized = sanitizeString(url);
    if (!sanitized) return undefined;

    // Ensure it's a valid URL or a relative path
    if (sanitized.startsWith('/')) return sanitized;
    return isValidUrl(sanitized) ? sanitized : undefined;
}

/**
 * Recursively sanitize object values
 */
function sanitizeObjectValues(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObjectValues);
    }
    if (obj && typeof obj === 'object') {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObjectValues(value);
        }
        return sanitized;
    }
    return obj;
}

/**
 * Parse custom JSON safely
 */
export function parseCustomJson(jsonStr: string): Record<string, any> | null {
    if (!jsonStr) return null;

    try {
        const parsed = JSON.parse(jsonStr);
        if (typeof parsed !== 'object' || parsed === null) {
            throw new ValidationError('Custom JSON must be an object');
        }

        return sanitizeObjectValues(parsed);
    } catch (error) {
        if (error instanceof ValidationError) throw error;
        throw new ValidationError(`Invalid custom JSON: ${error.message}`);
    }
}

/**
 * Clean empty values from schema
 */
export function cleanSchema(jsonLd: JsonLdSchema): JsonLdSchema {
    const cleaned: JsonLdSchema = {} as JsonLdSchema;

    for (const [key, value] of Object.entries(jsonLd)) {
        // Keep falsy values that are meaningful (0, false)
        if (value === undefined || value === null || value === '') {
            continue;
        }

        // Remove empty objects and arrays
        if (typeof value === 'object') {
            if (Array.isArray(value) && value.length === 0) {
                continue;
            }
            if (!Array.isArray(value) && Object.keys(value).length === 0) {
                continue;
            }
        }

        cleaned[key] = value;
    }

    return cleaned;
}

/**
 * Validate required fields for schema type
 */
export function validateRequiredFields(schema: JsonLdSchema, type: string): void {
    const errors: string[] = [];

    // All schemas need @context and @type
    if (!schema['@context']) errors.push('@context is required');
    if (!schema['@type']) errors.push('@type is required');

    // Type-specific validation
    switch (type) {
        case 'HowTo':
            if (!schema.step || !Array.isArray(schema.step) || schema.step.length === 0) {
                errors.push('HowTo requires at least one step');
            }
            break;

        case 'FAQ':
            if (!schema.mainEntity || !Array.isArray(schema.mainEntity) || schema.mainEntity.length === 0) {
                errors.push('FAQ requires at least one question');
            }
            break;

        case 'Recipe':
            if (!schema.recipeIngredient || !Array.isArray(schema.recipeIngredient) || schema.recipeIngredient.length === 0) {
                errors.push('Recipe requires at least one ingredient');
            }
            break;

        case 'Review':
            if (!schema.itemReviewed) {
                errors.push('Review requires itemReviewed');
            }
            if (!schema.reviewRating) {
                errors.push('Review requires reviewRating');
            }
            break;
    }

    if (errors.length > 0) {
        throw new ValidationError(`Schema validation failed: ${errors.join(', ')}`);
    }
}