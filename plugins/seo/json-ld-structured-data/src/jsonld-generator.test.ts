import {describe, expect, it} from 'bun:test';
import {
    type EntityData,
    generateBlogJsonLd,
    generateCategoryJsonLd,
    generateJsonLd,
    generateTagJsonLd,
    generateUserJsonLd,
    type JsonLdConfig,
    type JsonLdOverrides,
    type MediaData
} from './jsonld-generator.js';

// Mock data factories
const createMockConfig = (overrides: Partial<JsonLdConfig> = {}): JsonLdConfig => ({
    organization: {
        name: 'Test Organization',
        url: 'https://example.com',
        logoMediaId: 'logo-123',
        sameAs: ['https://twitter.com/test', 'https://facebook.com/test'],
        logoMedia: {
            mediaId: 'logo-123',
            url: 'https://example.com/logo.png',
            alt: 'Logo',
            width: 100,
            height: 100
        }
    },
    website: {
        name: 'Test Website',
        url: 'https://example.com',
        searchAction: true,
        searchUrlTemplate: 'https://example.com/search?q={search_term_string}'
    },
    article: {
        defaultType: 'Article',
        authorType: 'Person',
        useOrgAsPublisher: true,
        defaultImagePolicy: 'featured',
        includeDateModified: true
    },
    language: 'en-US',
    ...overrides
});

const createMockMedia = (overrides: Partial<MediaData> = {}): MediaData => ({
    mediaId: 'media-123',
    url: 'https://example.com/image.jpg',
    alt: 'Test image',
    width: 800,
    height: 600,
    ...overrides
});

const createMockBlog = (overrides: Partial<EntityData> = {}): EntityData => ({
    _id: 'blog-123',
    slug: 'test-blog-post',
    title: 'Test Blog Post',
    excerpt: 'This is a test blog post excerpt',
    content: {
        version: 1,
        content: [{name: 'Paragraph', version: 1, data: [{name: 'Text', data: 'Content', version: 1,}]}]
    },
    featuredMedia: createMockMedia(),
    createdAt: 1640995200000,
    updatedAt: 1641000000000,
    metadata: {},
    user: {
        _id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        slug: 'test-user',
        bio: 'Test user bio'
    },
    category: {
        _id: 'cat-123',
        name: 'Technology',
        slug: 'technology',
        description: 'Tech posts'
    },
    tags: [
        {_id: 'tag-1', name: 'JavaScript', slug: 'javascript', description: 'JS posts'},
        {_id: 'tag-2', name: 'TypeScript', slug: 'typescript', description: 'TS posts'}
    ],
    ...overrides
});

const createMockTag = (overrides: Partial<EntityData> = {}): EntityData => ({
    _id: 'tag-123',
    slug: 'javascript',
    name: 'JavaScript',
    description: 'JavaScript programming language',
    createdAt: 1640995200000,
    updatedAt: 1641000000000,
    metadata: {},
    ...overrides
});

const createMockCategory = (overrides: Partial<EntityData> = {}): EntityData => ({
    _id: 'cat-123',
    slug: 'technology',
    name: 'Technology',
    description: 'Technology related posts',
    createdAt: 1640995200000,
    updatedAt: 1641000000000,
    metadata: {},
    ...overrides
});

const createMockUser = (overrides: Partial<EntityData> = {}): EntityData => ({
    _id: 'user-123',
    slug: 'john-doe',
    username: 'johndoe',
    name: 'John Doe',
    bio: 'Software developer and blogger',
    createdAt: 1640995200000,
    updatedAt: 1641000000000,
    metadata: {jobTitle: 'Senior Developer'},
    ...overrides
});

describe('Blog JSON-LD Generation', () => {
    it('generates basic Article schema', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result['@context']).toBe('https://schema.org');
        expect(result['@type']).toBe('Article');
        expect(result.headline).toBe('Test Blog Post');
        expect(result.description).toBe('This is a test blog post excerpt');
        expect(result.url).toBe('https://example.com/test-blog-post');
        expect(result.datePublished).toBe('2022-01-01T00:00:00.000Z');
        expect(result.dateModified).toBe('2022-01-01T01:20:00.000Z');
        expect(result.inLanguage).toBe('en-US');
    });

    it('generates HowTo schema with required fields', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {
            type: 'HowTo',
            howTo: {
                totalTime: 'PT30M',
                estimatedCost: '$50',
                tools: ['Screwdriver', 'Hammer'],
                steps: [
                    {name: 'Step 1', text: 'First step'},
                    {name: 'Step 2', text: 'Second step'}
                ]
            }
        };
        const result = generateBlogJsonLd(blog, config, overrides);

        expect(result['@type']).toBe('HowTo');
        expect(result.name).toBe('Test Blog Post'); // HowTo uses name, not headline
        expect(result.totalTime).toBe('PT30M');
        expect(result.estimatedCost).toBe('$50');
        expect(result.step).toHaveLength(2);
        expect(result.step[0]).toEqual({
            '@type': 'HowToStep',
            name: 'Step 1',
            text: 'First step'
        });
        expect(result.tool).toHaveLength(2);
        expect(result.tool[0]).toEqual({
            '@type': 'HowToTool',
            name: 'Screwdriver'
        });
    });

    it('requires valid steps for HowTo', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {type: 'HowTo'};

        expect(() => generateBlogJsonLd(blog, config, overrides))
            .toThrow('HowTo requires at least one step');
    });

    it('generates Recipe schema', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {
            type: 'Recipe',
            recipe: {
                prepTime: 'PT15M',
                cookTime: 'PT45M',
                recipeYield: '4 servings',
                recipeCategory: 'Main Course',
                recipeIngredient: ['2 cups flour', '1 cup sugar']
            }
        };
        const result = generateBlogJsonLd(blog, config, overrides);

        expect(result['@type']).toBe('Recipe');
        expect(result.prepTime).toBe('PT15M');
        expect(result.cookTime).toBe('PT45M');
        expect(result.recipeYield).toBe('4 servings');
        expect(result.recipeIngredient).toEqual(['2 cups flour', '1 cup sugar']);
    });

    it('handles author configuration', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result.author).toEqual({
            '@type': 'Person',
            name: 'testuser'
        });
    });

    it('hides author when specified', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {hideAuthor: true};
        const result = generateBlogJsonLd(blog, config, overrides);

        expect(result.author).toBeUndefined();
    });

    it('handles publisher configuration', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result.publisher).toEqual({
            '@type': 'Organization',
            name: 'Test Organization',
            url: 'https://example.com',
            logo: {
                '@type': 'ImageObject',
                url: 'https://example.com/logo.png'
            }
        });
    });

    it('handles custom publisher', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {
            useCustomPublisher: true,
            publisherName: 'Custom Publisher',
            publisherUrl: 'https://custom.com',
            publisherLogo: 'https://custom.com/logo.png'
        };
        const result = generateBlogJsonLd(blog, config, overrides);

        expect(result.publisher).toEqual({
            '@type': 'Organization',
            name: 'Custom Publisher',
            url: 'https://custom.com',
            logo: {
                '@type': 'ImageObject',
                url: 'https://custom.com/logo.png'
            }
        });
    });

    it('handles images correctly', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result.image).toEqual(['https://example.com/image.jpg']);
    });

    it('handles keywords from tags', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result.keywords).toBe('JavaScript, TypeScript');
    });

    it('validates schema fields correctly', () => {
        const blog = createMockBlog();
        const config = createMockConfig();

        // Test Article type - should have headline, not name
        const articleResult = generateBlogJsonLd(blog, config);
        expect(articleResult.headline).toBeDefined();
        expect(articleResult.name).toBeUndefined();

        // Test HowTo type - should have name, not headline (but requires steps)
        expect(() => generateBlogJsonLd(blog, config, {type: 'HowTo'}))
            .toThrow('HowTo requires at least one step');
    });
});

describe('Tag JSON-LD Generation', () => {
    it('generates basic DefinedTerm schema', () => {
        const tag = createMockTag();
        const config = createMockConfig();
        const result = generateTagJsonLd(tag, config);

        expect(result['@context']).toBe('https://schema.org');
        expect(result['@type']).toBe('DefinedTerm');
        expect(result.name).toBe('JavaScript');
        expect(result.description).toBe('JavaScript programming language');
        expect(result.url).toBe('https://example.com/tags/javascript');
        expect(result.termCode).toBe('javascript');
    });

    it('handles custom schema type', () => {
        const tag = createMockTag();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {schemaType: 'Thing'};
        const result = generateTagJsonLd(tag, config, overrides);

        expect(result['@type']).toBe('Thing');
        expect(result.termCode).toBeUndefined(); // Only for DefinedTerm
    });
});

describe('Category JSON-LD Generation', () => {
    it('generates basic CategoryCode schema', () => {
        const category = createMockCategory();
        const config = createMockConfig();
        const result = generateCategoryJsonLd(category, config);

        expect(result['@context']).toBe('https://schema.org');
        expect(result['@type']).toBe('CategoryCode');
        expect(result.name).toBe('Technology');
        expect(result.description).toBe('Technology related posts');
        expect(result.url).toBe('https://example.com/categories/technology');
        expect(result.codeValue).toBe('technology');
    });

    it('handles Organization schema type', () => {
        const category = createMockCategory();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {schemaType: 'Organization'};
        const result = generateCategoryJsonLd(category, config, overrides);

        expect(result['@type']).toBe('Organization');
        expect(result.sameAs).toEqual(['https://twitter.com/test', 'https://facebook.com/test']);
        expect(result.codeValue).toBeUndefined(); // Only for CategoryCode
    });
});

describe('User JSON-LD Generation', () => {
    it('generates basic Person schema', () => {
        const user = createMockUser();
        const config = createMockConfig();
        const result = generateUserJsonLd(user, config);

        expect(result['@context']).toBe('https://schema.org');
        expect(result['@type']).toBe('Person');
        expect(result.name).toBe('John Doe');
        expect(result.description).toBe('Software developer and blogger');
        expect(result.url).toBe('https://example.com/authors/john-doe');
        expect(result.jobTitle).toBe('Senior Developer');
    });

    it('handles Organization schema type', () => {
        const user = createMockUser();
        const config = createMockConfig({
            organization: {
                ...createMockConfig().organization,
                email: 'contact@example.com'
            }
        });
        const overrides: JsonLdOverrides = {schemaType: 'Organization'};
        const result = generateUserJsonLd(user, config, overrides);

        expect(result['@type']).toBe('Organization');
        expect(result.sameAs).toEqual(['https://twitter.com/test', 'https://facebook.com/test']);
        expect(result.email).toBe('contact@example.com');
        expect(result.jobTitle).toBeUndefined(); // Only for Person
    });

    it('sanitizes malicious social URLs', () => {
        const user = createMockUser();
        const config = createMockConfig({
            organization: {
                ...createMockConfig().organization,
                sameAs: ['https://safe.com', 'javascript:evil()', 'https://another-safe.com']
            }
        });
        const result = generateUserJsonLd(user, config, {schemaType: 'Organization'});

        expect(result.sameAs).toEqual(['https://safe.com', 'https://another-safe.com']);
    });
});

describe('Universal generateJsonLd Function', () => {
    it('routes to correct generator functions', () => {
        const config = createMockConfig();

        // Test blog routing
        const blog = createMockBlog();
        const blogResult = generateJsonLd('blog', blog, config);
        expect(blogResult['@type']).toBe('Article');

        // Test tag routing
        const tag = createMockTag();
        const tagResult = generateJsonLd('tag', tag, config);
        expect(tagResult['@type']).toBe('DefinedTerm');

        // Test category routing
        const category = createMockCategory();
        const categoryResult = generateJsonLd('category', category, config);
        expect(categoryResult['@type']).toBe('CategoryCode');

        // Test user routing
        const user = createMockUser();
        const userResult = generateJsonLd('user', user, config);
        expect(userResult['@type']).toBe('Person');
    });

    it('throws error for unsupported entity type', () => {
        const config = createMockConfig();
        const entity = createMockBlog();

        expect(() => {
            generateJsonLd('unknown' as any, entity, config);
        }).toThrow('Unsupported entity type: unknown');
    });
});

describe('Edge Cases and Error Handling', () => {
    it('handles missing required fields gracefully', () => {
        const blog = createMockBlog({title: '', excerpt: ''});
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result.headline).toBeUndefined(); // Empty strings are filtered out
        expect(result.description).toBeUndefined(); // Empty strings are filtered out
    });

    it('handles missing config gracefully', () => {
        const blog = createMockBlog();
        const config = createMockConfig({
            organization: {name: '', url: '', logoMediaId: '', sameAs: []},
            website: {name: '', url: '', searchAction: false}
        });
        const result = generateBlogJsonLd(blog, config);

        expect(result.url).toBe('/test-blog-post'); // Fallback URL
        expect(result.publisher).toBeUndefined(); // No org name
    });

    it('handles custom JSON overrides', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {
            customJson: '{"customField": "customValue", "priority": 1}'
        };
        const result = generateBlogJsonLd(blog, config, overrides);

        expect(result.customField).toBe('customValue');
        expect(result.priority).toBe(1);
    });

    it('throws on invalid custom JSON', () => {
        const blog = createMockBlog();
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {
            customJson: 'invalid json {'
        };

        expect(() => generateBlogJsonLd(blog, config, overrides))
            .toThrow('Invalid custom JSON');
    });

    it('sanitizes malicious content', () => {
        const maliciousBlog = createMockBlog({
            title: '<script>alert("title")</script>Clean Title',
            excerpt: 'Description with <script>evil()</script> content',
            user: {
                _id: 'user-123',
                username: '<script>alert("user")</script>baduser',
                name: 'Clean Name',
                slug: 'clean-user',
                bio: 'Bio'
            }
        });
        const config = createMockConfig();
        const overrides: JsonLdOverrides = {
            authorUrl: 'javascript:alert("evil")',
            keywords: '<script>alert("keywords")</script>safe,normal'
        };
        const result = generateBlogJsonLd(maliciousBlog, config, overrides);

        expect(result.headline).toBe('Clean Title');
        expect(result.description).toBe('Description with content');
        expect(result.author.name).toBe('baduser');
        expect(result.author.url).toBeUndefined();
        // Keywords include both tags and override keywords
        expect(result.keywords).toContain('safe');
        expect(result.keywords).toContain('normal');
    });

    it('validates required fields for complex types', () => {
        const blog = createMockBlog();
        const config = createMockConfig();

        expect(() => generateBlogJsonLd(blog, config, {
            type: 'Recipe',
            recipe: {prepTime: 'PT30M'}
        })).toThrow('Recipe requires at least one ingredient');

        expect(() => generateBlogJsonLd(blog, config, {
            type: 'Review'
        })).toThrow('Review requires itemReviewed');

        expect(() => generateBlogJsonLd(blog, config, {
            type: 'FAQ'
        })).toThrow('FAQ requires at least one question');
    });

    it('validates media URLs', () => {
        const blog = createMockBlog({
            featuredMedia: {
                mediaId: 'img-1',
                url: 'javascript:alert("img")',
                alt: 'Safe alt'
            }
        });
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result.image).toBeUndefined();
    });

    it('cleans up empty and undefined values', () => {
        const blog = createMockBlog({featuredMedia: undefined, tags: []});
        const config = createMockConfig();
        const result = generateBlogJsonLd(blog, config);

        expect(result.image).toBeUndefined();
        expect(result.keywords).toBeUndefined();
    });
});