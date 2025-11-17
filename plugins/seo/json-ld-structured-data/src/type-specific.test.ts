import {describe, expect, it as test} from 'bun:test';
import {
    addFaqFields,
    addHowToFields,
    addRecipeFields,
    addReviewFields,
    addTypeSpecificFields,
    applyCustomJson
} from './type-specific.js';
import {JsonLdOverrides, JsonLdSchema} from './types.js';

const createBaseSchema = (): JsonLdSchema => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Test'
});

describe('Review Fields', () => {
    test('adds valid review data', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            review: {
                itemName: 'Test Product',
                itemType: 'Product',
                imageMedia: {_id: '1', url: 'https://example.com/image.jpg'},
                rating: {value: 4, best: 5, worst: 1}
            }
        };

        const result = addReviewFields(schema, overrides);

        expect(result.itemReviewed).toEqual({
            '@type': 'Product',
            name: 'Test Product',
            image: 'https://example.com/image.jpg'
        });
        expect(result.reviewRating).toEqual({
            '@type': 'Rating',
            ratingValue: 4,
            bestRating: 5,
            worstRating: 1
        });
    });

    test('throws on missing itemName', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            review: {rating: {value: 5}}
        };

        expect(() => addReviewFields(schema, overrides))
            .toThrow('Review requires itemName');
    });

    test('throws on missing rating', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            review: {itemName: 'Product'}
        };

        expect(() => addReviewFields(schema, overrides))
            .toThrow('Review requires rating value');
    });

    test('handles malicious content', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            review: {
                itemName: '<script>alert()</script>Product',
                rating: {value: 5}
            }
        };

        const result = addReviewFields(schema, overrides);
        expect(result.itemReviewed.name).toBe('Product');
    });
});

describe('HowTo Fields', () => {
    test('adds complete HowTo data', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            howTo: {
                totalTime: 'PT30M',
                estimatedCost: '$50',
                tools: ['Hammer', 'Screwdriver'],
                steps: [
                    {name: 'Step 1', text: 'Do this first'},
                    {name: 'Step 2', text: 'Then do this', imageMedia: {_id: '1', url: 'https://example.com/step.jpg'}}
                ]
            }
        };

        const result = addHowToFields(schema, overrides);

        expect(result.totalTime).toBe('PT30M');
        expect(result.estimatedCost).toBe('$50');
        expect(result.tool).toHaveLength(2);
        expect(result.step).toHaveLength(2);
        expect(result.step[1].image).toBe('https://example.com/step.jpg');
    });

    test('throws on missing steps', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {howTo: {}};

        expect(() => addHowToFields(schema, overrides))
            .toThrow('HowTo requires at least one step');
    });

    test('throws on step without text', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            howTo: {
                steps: [{name: 'Step 1'}] // missing text
            }
        };

        expect(() => addHowToFields(schema, overrides))
            .toThrow('HowTo step 1 requires text');
    });

    test('sanitizes step content', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            howTo: {
                steps: [{
                    name: '<script>alert()</script>Clean Step',
                    text: 'Safe <strong>instructions</strong>'
                }]
            }
        };

        const result = addHowToFields(schema, overrides);
        expect(result.step[0].name).toBe('Clean Step');
        expect(result.step[0].text).toBe('Safe <strong>instructions</strong>');
    });
});

describe('FAQ Fields', () => {
    test('adds FAQ questions and answers', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            faq: {
                questions: [
                    {question: 'What is this?', answer: 'This is a test'},
                    {question: 'How does it work?', answer: 'It works like this'}
                ]
            }
        };

        const result = addFaqFields(schema, overrides);

        expect(result.mainEntity).toHaveLength(2);
        expect(result.mainEntity[0]).toEqual({
            '@type': 'Question',
            name: 'What is this?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'This is a test'
            }
        });
    });

    test('throws on missing questions', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {faq: {}};

        expect(() => addFaqFields(schema, overrides))
            .toThrow('FAQ requires at least one question');
    });

    test('throws on incomplete question', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            faq: {
                questions: [{question: 'What?'}] // missing answer
            }
        };

        expect(() => addFaqFields(schema, overrides))
            .toThrow('FAQ item 1 requires both question and answer');
    });

    test('sanitizes FAQ content', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            faq: {
                questions: [{
                    question: '<script>alert()</script>Safe question?',
                    answer: 'Safe answer'
                }]
            }
        };

        const result = addFaqFields(schema, overrides);
        expect(result.mainEntity[0].name).toBe('Safe question?');
    });
});

describe('Recipe Fields', () => {
    test('adds complete recipe data', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            recipe: {
                prepTime: 'PT15M',
                cookTime: 'PT30M',
                recipeYield: '4 servings',
                recipeCategory: 'Main Course',
                recipeIngredient: ['2 cups flour', '1 cup sugar'],
                imageMedia: {_id: '1', url: 'https://example.com/recipe.jpg'}
            }
        };

        const result = addRecipeFields(schema, overrides);

        expect(result.prepTime).toBe('PT15M');
        expect(result.cookTime).toBe('PT30M');
        expect(result.recipeYield).toBe('4 servings');
        expect(result.recipeIngredient).toEqual(['2 cups flour', '1 cup sugar']);
        expect(result.image).toContain('https://example.com/recipe.jpg');
    });

    test('throws on missing ingredients', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {recipe: {}};

        expect(() => addRecipeFields(schema, overrides))
            .toThrow('Recipe requires at least one ingredient');
    });

    test('handles existing images correctly', () => {
        const schema = createBaseSchema();
        schema.image = ['existing.jpg'];
        const overrides: JsonLdOverrides = {
            recipe: {
                recipeIngredient: ['flour'],
                imageMedia: {_id: '1', url: 'https://example.com/recipe.jpg'}
            }
        };

        const result = addRecipeFields(schema, overrides);
        expect(result.image).toEqual(['https://example.com/recipe.jpg', 'existing.jpg']);
    });
});

describe('Type-Specific Field Router', () => {
    test('routes to correct field handler', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            review: {itemName: 'Test', rating: {value: 5}}
        };

        const result = addTypeSpecificFields(schema, 'Review', overrides);
        expect(result.itemReviewed).toBeDefined();
    });

    test('returns unchanged schema for unknown types', () => {
        const schema = createBaseSchema();
        const result = addTypeSpecificFields(schema, 'UnknownType', {});
        expect(result).toEqual(schema);
    });
});

describe('Custom JSON Application', () => {
    test('applies valid custom JSON', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            customJson: '{"customField": "customValue", "priority": 1}'
        };

        const result = applyCustomJson(schema, overrides);
        expect(result.customField).toBe('customValue');
        expect(result.priority).toBe(1);
    });

    test('handles empty custom JSON', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {};

        const result = applyCustomJson(schema, overrides);
        expect(result).toEqual(schema);
    });

    test('throws on invalid JSON', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            customJson: 'invalid json {'
        };

        expect(() => applyCustomJson(schema, overrides))
            .toThrow('Invalid custom JSON');
    });

    test('sanitizes custom JSON content', () => {
        const schema = createBaseSchema();
        const overrides: JsonLdOverrides = {
            customJson: '{"danger": "<script>alert()</script>", "safe": "content"}'
        };

        const result = applyCustomJson(schema, overrides);
        expect(result.danger).toBeUndefined();
        expect(result.safe).toBe('content');
    });
});