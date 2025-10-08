/**
 * Sanitize JSON-LD output before HTML injection
 * Uses proper Unicode escaping to prevent XSS attacks
 */
export function sanitizeJsonLd(jsonLd: any): string {
    return JSON.stringify(jsonLd, null, 0)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\//g, '\\u002f');
}