import {describe, expect, it as test} from 'bun:test';
import {
    cleanSchema,
    isValidUrl,
    parseCustomJson,
    sanitizeString,
    sanitizeUrl,
    validateRequiredFields
} from './validators.js';
import {JsonLdSchema} from './types.js';

describe('String Sanitization', () => {
    test('removes script tags', () => {
        const input = 'Hello <script>alert("xss")</script> World';
        expect(sanitizeString(input)).toBe('Hello World');
    });

    test('removes event handlers', () => {
        const input = 'Click <div onclick="alert()">here</div>';
        expect(sanitizeString(input)).toBe('Click <div>here</div>');
    });

    test('removes javascript URLs', () => {
        const input = 'Link: javascript:alert("xss")';
        expect(sanitizeString(input)).toBe('Link: "xss")');
    });

    test('handles undefined input', () => {
        expect(sanitizeString(undefined)).toBeUndefined();
    });

    test('handles empty strings', () => {
        expect(sanitizeString('')).toBeUndefined();
    });

    test('preserves safe content', () => {
        const input = 'Safe content with <strong>HTML</strong> tags';
        expect(sanitizeString(input)).toBe('Safe content with <strong>HTML</strong> tags');
    });
});

describe('URL Validation', () => {
    test('validates HTTP URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true);
        expect(isValidUrl('https://example.com')).toBe(true);
    });

    test('rejects invalid protocols', () => {
        expect(isValidUrl('ftp://example.com')).toBe(false);
        expect(isValidUrl('file:///etc/passwd')).toBe(false);
        expect(isValidUrl('javascript:alert()')).toBe(false);
    });

    test('rejects malformed URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('')).toBe(false);
    });

    test('sanitizes URLs correctly', () => {
        expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
        expect(sanitizeUrl('/relative/path')).toBe('/relative/path');
        expect(sanitizeUrl('javascript:alert()')).toBeUndefined();
        expect(sanitizeUrl(undefined)).toBeUndefined();
    });
});

describe('Custom JSON Parsing', () => {
    test('parses valid JSON objects', () => {
        const json = '{"key": "value", "number": 123}';
        const result = parseCustomJson(json);
        expect(result).toEqual({key: 'value', number: 123});
    });

    test('sanitizes string values in JSON', () => {
        const json = '{"safe": "normal", "danger": "<script>alert()</script>"}';
        const result = parseCustomJson(json);
        expect(result).toEqual({safe: 'normal'});
        expect(result!.danger).toBeUndefined();
    });

    test('handles arrays with strings', () => {
        const json = '{"tags": ["safe", "<script>evil</script>"]}';
        const result = parseCustomJson(json);
        expect(result!.tags).toHaveLength(2);
        expect(result!.tags[0]).toBe('safe');
        expect(result!.tags[1]).toBeUndefined();
    });

    test('throws on invalid JSON', () => {
        expect(() => parseCustomJson('invalid json {')).toThrow('Invalid custom JSON');
    });

    test('throws on non-object JSON', () => {
        expect(() => parseCustomJson('"just a string"')).toThrow('Custom JSON must be an object');
        expect(() => parseCustomJson('123')).toThrow('Custom JSON must be an object');
    });

    test('returns null for empty input', () => {
        expect(parseCustomJson('')).toBeNull();
    });
});

describe('Schema Cleaning', () => {
    test('removes undefined values', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            title: 'Test',
            description: undefined,
            url: 'https://example.com'
        };
        const cleaned = cleanSchema(schema);
        expect(cleaned).not.toHaveProperty('description');
        expect(cleaned.title).toBe('Test');
    });

    test('removes empty strings', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            title: '',
            url: 'https://example.com'
        };
        const cleaned = cleanSchema(schema);
        expect(cleaned).not.toHaveProperty('title');
    });

    test('removes empty objects', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            author: {},
            publisher: {name: 'Test'}
        };
        const cleaned = cleanSchema(schema);
        expect(cleaned).not.toHaveProperty('author');
        expect(cleaned.publisher).toEqual({name: 'Test'});
    });

    test('removes empty arrays', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            keywords: [],
            image: ['test.jpg']
        };
        const cleaned = cleanSchema(schema);
        expect(cleaned).not.toHaveProperty('keywords');
        expect(cleaned.image).toEqual(['test.jpg']);
    });

    test('preserves meaningful falsy values', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            rating: 0,
            published: false
        };
        const cleaned = cleanSchema(schema);
        expect(cleaned.rating).toBe(0);
        expect(cleaned.published).toBe(false);
    });
});

describe('Required Field Validation', () => {
    test('validates basic schema requirements', () => {
        expect(() => validateRequiredFields({} as JsonLdSchema, 'Article'))
            .toThrow('@context is required');

        expect(() => validateRequiredFields({
            '@context': 'https://schema.org'
        } as JsonLdSchema, 'Article'))
            .toThrow('@type is required');
    });

    test('validates HowTo requirements', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'HowTo'
        };

        expect(() => validateRequiredFields(schema, 'HowTo'))
            .toThrow('HowTo requires at least one step');

        schema.step = [];
        expect(() => validateRequiredFields(schema, 'HowTo'))
            .toThrow('HowTo requires at least one step');

        schema.step = [{name: 'Step 1', text: 'Do something'}];
        expect(() => validateRequiredFields(schema, 'HowTo')).not.toThrow();
    });

    test('validates FAQ requirements', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'FAQ'
        };

        expect(() => validateRequiredFields(schema, 'FAQ'))
            .toThrow('FAQ requires at least one question');

        schema.mainEntity = [];
        expect(() => validateRequiredFields(schema, 'FAQ'))
            .toThrow('FAQ requires at least one question');

        schema.mainEntity = [{question: 'Q?', answer: 'A.'}];
        expect(() => validateRequiredFields(schema, 'FAQ')).not.toThrow();
    });

    test('validates Recipe requirements', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Recipe'
        };

        expect(() => validateRequiredFields(schema, 'Recipe'))
            .toThrow('Recipe requires at least one ingredient');

        schema.recipeIngredient = [];
        expect(() => validateRequiredFields(schema, 'Recipe'))
            .toThrow('Recipe requires at least one ingredient');

        schema.recipeIngredient = ['flour'];
        expect(() => validateRequiredFields(schema, 'Recipe')).not.toThrow();
    });

    test('validates Review requirements', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Review'
        };

        expect(() => validateRequiredFields(schema, 'Review'))
            .toThrow('Review requires itemReviewed');

        schema.itemReviewed = {name: 'Product'};
        expect(() => validateRequiredFields(schema, 'Review'))
            .toThrow('Review requires reviewRating');

        schema.reviewRating = {ratingValue: 5};
        expect(() => validateRequiredFields(schema, 'Review')).not.toThrow();
    });

    test('passes for valid schemas', () => {
        const schema: JsonLdSchema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'Test Article'
        };

        expect(() => validateRequiredFields(schema, 'Article')).not.toThrow();
    });
});

describe('Security Edge Cases', () => {
    test('handles nested script attacks', () => {
        const input = '<div><script>alert()</script>nested</div>';
        expect(sanitizeString(input)).toBe('<div>nested</div>');
    });

    test('handles multiple event handlers', () => {
        const input = '<div onclick="bad()" onmouseover="worse()">content</div>';
        expect(sanitizeString(input)).toBe('<div>content</div>');
    });

    test('handles case variations', () => {
        const input = '<SCRIPT>alert()</SCRIPT><span>test</span>';
        expect(sanitizeString(input)).toBe('<span>test</span>');
    });

    test('handles deeply nested JSON attacks', () => {
        const json = '{"level1": {"level2": {"evil": "<script>alert()</script>"}}}';
        const result = parseCustomJson(json)!;
        expect(result.level1.level2.evil).toBeUndefined();
    });
});