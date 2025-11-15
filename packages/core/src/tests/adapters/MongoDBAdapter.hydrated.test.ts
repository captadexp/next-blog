import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'bun:test';
import {MongoClient} from 'mongodb';
import {MongoDBAdapter} from '../../adapters';
import {clearDatabase, setupTestDb, teardownTestDb} from './setup.js';
import {BrandedId} from "@supergrowthai/next-blog-types";

describe('MongoDBAdapter - Hydrated Queries', () => {
    let client: MongoClient;
    let adapter: MongoDBAdapter;
    const TEST_DB = 'test-hydrated';

    // Test data IDs
    let userId1: BrandedId<"User">;
    let userId2: BrandedId<"User">;
    let categoryId1: BrandedId<"Category">;
    let categoryId2: BrandedId<"Category">;
    let tagId1: BrandedId<"Tag">;
    let tagId2: BrandedId<"Tag">;
    let tagId3: BrandedId<"Tag">;
    let mediaId1: BrandedId<"Media">;
    let mediaId2: BrandedId<"Media">;

    beforeAll(async () => {
        const setup = await setupTestDb();
        client = setup.client;
        adapter = new MongoDBAdapter(TEST_DB, client);
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    beforeEach(async () => {
        await clearDatabase(client, TEST_DB);

        // Create test users
        const user1 = await adapter.users.create({
            slug: 'author-1',
            bio: '',
            username: 'author1',
            email: 'author1@example.com',
            password: 'pass',
            name: 'Author One'
        });
        userId1 = user1._id;

        const user2 = await adapter.users.create({
            slug: 'author-2',
            bio: '',
            username: 'author2',
            email: 'author2@example.com',
            password: 'pass',
            name: 'Author Two'
        });
        userId2 = user2._id;

        // Create test categories
        const cat1 = await adapter.categories.create({
            name: 'Technology',
            slug: 'technology',
            description: 'Tech posts'
        });
        categoryId1 = cat1._id;

        const cat2 = await adapter.categories.create({
            name: 'Travel',
            slug: 'travel',
            description: 'Travel posts'
        });
        categoryId2 = cat2._id;

        // Create test tags
        const tag1 = await adapter.tags.create({
            name: 'JavaScript',
            slug: 'javascript',
            description: 'JS tag'
        });
        tagId1 = tag1._id;

        const tag2 = await adapter.tags.create({
            name: 'React',
            slug: 'react',
            description: 'React tag'
        });
        tagId2 = tag2._id;

        const tag3 = await adapter.tags.create({
            name: 'Node.js',
            slug: 'nodejs',
            description: 'Node tag'
        });
        tagId3 = tag3._id;

        // Create test media
        const media1 = await adapter.media.create({
            filename: 'featured1.jpg',
            mimeType: 'image/jpeg',
            size: 100000,
            url: 'https://cdn.example.com/featured1.jpg',
            userId: userId1
        });
        mediaId1 = media1._id;

        const media2 = await adapter.media.create({
            filename: 'featured2.jpg',
            mimeType: 'image/jpeg',
            size: 200000,
            url: 'https://cdn.example.com/featured2.jpg',
            userId: userId2
        });
        mediaId2 = media2._id;
    });

    describe('Hydrated Blog Queries', () => {
        it('should get hydrated blog with all relationships', async () => {
            const blog = await adapter.blogs.create({
                title: 'Test Blog',
                slug: 'test-blog',
                content: {version: 1, content: [{data: 'Test content', name: "Text", version: 1}]},
                excerpt: 'Test excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId1, tagId2],
                featuredMediaId: mediaId1
            });

            const hydrated = await adapter.generated.getHydratedBlog({_id: blog._id});

            expect(hydrated).toBeDefined();
            expect(hydrated?._id).toBe(blog._id);
            expect(hydrated?.title).toBe('Test Blog');

            // Check user relationship
            expect(hydrated?.user).toBeDefined();
            expect(hydrated?.user._id).toBe(userId1);
            expect(hydrated?.user.username).toBe('author1');
            expect(hydrated?.user.name).toBe('Author One');

            // Check category relationship
            expect(hydrated?.category).toBeDefined();
            expect(hydrated?.category._id).toBe(categoryId1);
            expect(hydrated?.category.name).toBe('Technology');
            expect(hydrated?.category.slug).toBe('technology');

            // Check tags relationship
            expect(hydrated?.tags).toHaveLength(2);
            expect(hydrated?.tags.map(t => t._id).sort()).toEqual([tagId1, tagId2].sort());
            expect(hydrated?.tags.map(t => t.slug).sort()).toEqual(['javascript', 'react']);

            // Check featured media relationship
            expect(hydrated?.featuredMedia).toBeDefined();
            expect(hydrated?.featuredMedia?._id).toBe(mediaId1);
            expect(hydrated?.featuredMedia?.filename).toBe('featured1.jpg');
        });

        it('should get multiple hydrated blogs', async () => {
            await adapter.blogs.create({
                title: 'Blog 1',
                slug: 'blog-1',
                content: {version: 1, content: [{data: 'Content 1', name: "Text", version: 1}]},
                excerpt: 'Excerpt 1',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId1],
                featuredMediaId: mediaId1
            });

            await adapter.blogs.create({
                title: 'Blog 2',
                slug: 'blog-2',
                content: {version: 1, content: [{data: 'Content 2', name: "Text", version: 1}]},
                excerpt: 'Excerpt 2',
                status: 'published',
                userId: userId2,
                categoryId: categoryId2,
                tagIds: [tagId2, tagId3],
                featuredMediaId: mediaId2
            });

            await adapter.blogs.create({
                title: 'Blog 3',
                slug: 'blog-3',
                content: {version: 1, content: [{data: 'Content 3', name: "Text", version: 1}]},
                excerpt: 'Excerpt 3',
                status: 'draft',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [],
                featuredMediaId: undefined
            });

            const hydrated = await adapter.generated.getHydratedBlogs({status: 'published'});

            expect(hydrated).toHaveLength(2);

            const blog1 = hydrated.find(b => b.slug === 'blog-1');
            expect(blog1?.user.username).toBe('author1');
            expect(blog1?.category.slug).toBe('technology');
            expect(blog1?.tags).toHaveLength(1);
            expect(blog1?.featuredMedia?.filename).toBe('featured1.jpg');

            const blog2 = hydrated.find(b => b.slug === 'blog-2');
            expect(blog2?.user.username).toBe('author2');
            expect(blog2?.category.slug).toBe('travel');
            expect(blog2?.tags).toHaveLength(2);
            expect(blog2?.featuredMedia?.filename).toBe('featured2.jpg');
        });

        it('should handle hydrated blogs with parent relationships', async () => {
            const parentBlog = await adapter.blogs.create({
                title: 'Parent Blog',
                slug: 'parent-blog',
                content: {version: 1, content: [{data: 'Parent content', name: "Text", version: 1}]},
                excerpt: 'Parent excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId1]
            });

            const childBlog = await adapter.blogs.create({
                title: 'Child Blog',
                slug: 'child-blog',
                content: {version: 1, content: [{data: 'Child content', name: "Text", version: 1}]},
                excerpt: 'Child excerpt',
                status: 'published',
                userId: userId2,
                categoryId: categoryId2,
                tagIds: [tagId2],
                parentId: parentBlog._id
            });

            const hydratedChild = await adapter.generated.getHydratedBlog({_id: childBlog._id});

            expect(hydratedChild).toBeDefined();
            expect(hydratedChild?.parent).toBeDefined();
            expect(hydratedChild?.parent?._id).toBe(parentBlog._id);
            expect(hydratedChild?.parent?.title).toBe('Parent Blog');
            expect(hydratedChild?.parent?.slug).toBe('parent-blog');
        });

        it('should handle projections on hydrated queries', async () => {
            await adapter.blogs.create({
                title: 'Projection Test',
                slug: 'projection-test',
                content: {version: 1, content: [{data: 'Long content here...', name: "Text", version: 1}]},
                excerpt: 'Short excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId1, tagId2],
                featuredMediaId: mediaId1,
                metadata: {
                    views: 100,
                    likes: 50
                }
            });

            // Test blog-level projections (inclusion only)
            const projected = await adapter.generated.getHydratedBlogs(
                {status: 'published'},
                {
                    projection: {
                        _id: 1,
                        title: 1,
                        slug: 1,
                        excerpt: 1
                    }
                }
            );

            expect(projected).toHaveLength(1);
            const blog = projected[0];
            expect(blog.title).toBe('Projection Test');
            expect(blog.slug).toBe('projection-test');
            expect(blog.excerpt).toBe('Short excerpt');

            // Test relationship-level projections
            const withRelProjections = await adapter.generated.getHydratedBlogs(
                {status: 'published'},
                {
                    projections: {
                        user: {username: 1, email: 1},
                        category: {name: 1, slug: 1},
                        tag: {name: 1},
                        featuredMedia: {filename: 1, url: 1}
                    }
                }
            );

            expect(withRelProjections).toHaveLength(1);
            const projectedBlog = withRelProjections[0];
            expect(projectedBlog.user.username).toBe('author1');
            expect(projectedBlog.category.name).toBe('Technology');
            expect(projectedBlog.tags[0].name).toBeDefined();
            expect(projectedBlog.featuredMedia?.filename).toBe('featured1.jpg');
        });

        it('should get recent blogs', async () => {
            // Create blogs with different timestamps
            for (let i = 0; i < 5; i++) {
                await adapter.blogs.create({
                    title: `Blog ${i}`,
                    slug: `blog-${i}`,
                    content: {version: 1, content: [{data: `Content ${i}`, name: "Text", version: 1}]},
                    excerpt: `Excerpt ${i}`,
                    status: 'published',
                    userId: userId1,
                    categoryId: categoryId1,
                    tagIds: []
                });

                // Small delay to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const recent = await adapter.generated.getRecentBlogs(3);

            expect(recent).toHaveLength(3);
            // Most recent should be first
            expect(recent[0].title).toBe('Blog 4');
            expect(recent[1].title).toBe('Blog 3');
            expect(recent[2].title).toBe('Blog 2');
        });

        it('should get related blogs', async () => {
            const mainBlog = await adapter.blogs.create({
                title: 'Main Blog',
                slug: 'main-blog',
                content: {version: 1, content: [{data: 'Main content', name: "Text", version: 1}]},
                excerpt: 'Main excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId1, tagId2]
            });

            // Related by category and tags
            const related1 = await adapter.blogs.create({
                title: 'Related 1',
                slug: 'related-1',
                content: {version: 1, content: [{data: 'Related content 1', name: "Text", version: 1}]},
                excerpt: 'Related excerpt 1',
                status: 'published',
                userId: userId2,
                categoryId: categoryId1, // Same category
                tagIds: [tagId1, tagId3] // One shared tag
            });

            // Related by tags only
            const related2 = await adapter.blogs.create({
                title: 'Related 2',
                slug: 'related-2',
                content: {version: 1, content: [{data: 'Related content 2', name: "Text", version: 1}]},
                excerpt: 'Related excerpt 2',
                status: 'published',
                userId: userId1,
                categoryId: categoryId2, // Different category
                tagIds: [tagId2] // One shared tag
            });

            // Not related
            await adapter.blogs.create({
                title: 'Unrelated',
                slug: 'unrelated',
                content: {version: 1, content: [{data: 'Unrelated content', name: "Text", version: 1}]},
                excerpt: 'Unrelated excerpt',
                status: 'published',
                userId: userId2,
                categoryId: categoryId2,
                tagIds: [tagId3]
            });

            const relatedBlogs = await adapter.generated.getRelatedBlogs(mainBlog._id, 5);

            expect(relatedBlogs.length).toBeGreaterThan(0);
            expect(relatedBlogs.length).toBeLessThanOrEqual(2);

            // Should not include the main blog itself
            expect(relatedBlogs.every(b => b._id !== mainBlog._id)).toBe(true);

            // Should include related blogs
            const slugs = relatedBlogs.map(b => b.slug);
            expect(slugs).toContain('related-1');
        });

        it('should get author blogs', async () => {
            await adapter.blogs.create({
                title: 'Author Blog 1',
                slug: 'author-blog-1',
                content: {version: 1, content: [{data: 'Content 1', name: "Text", version: 1}]},
                excerpt: 'Excerpt 1',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: []
            });

            await adapter.blogs.create({
                title: 'Author Blog 2',
                slug: 'author-blog-2',
                content: {version: 1, content: [{data: 'Content 2', name: "Text", version: 1}]},
                excerpt: 'Excerpt 2',
                status: 'published',
                userId: userId1,
                categoryId: categoryId2,
                tagIds: []
            });

            await adapter.blogs.create({
                title: 'Other Author Blog',
                slug: 'other-author-blog',
                content: {version: 1, content: [{data: 'Other content', name: "Text", version: 1}]},
                excerpt: 'Other excerpt',
                status: 'published',
                userId: userId2,
                categoryId: categoryId1,
                tagIds: []
            });

            const authorBlogs = await adapter.generated.getAuthorBlogs(userId1);

            expect(authorBlogs).toHaveLength(2);
            expect(authorBlogs.every(b => b.user._id === userId1)).toBe(true);
            expect(authorBlogs.map(b => b.slug).sort()).toEqual(['author-blog-1', 'author-blog-2']);
        });

        it('should get category with blogs', async () => {
            await adapter.blogs.create({
                title: 'Tech Blog 1',
                slug: 'tech-blog-1',
                content: {version: 1, content: [{data: 'Tech content 1', name: "Text", version: 1}]},
                excerpt: 'Tech excerpt 1',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: []
            });

            await adapter.blogs.create({
                title: 'Tech Blog 2',
                slug: 'tech-blog-2',
                content: {version: 1, content: [{data: 'Tech content 2', name: "Text", version: 1}]},
                excerpt: 'Tech excerpt 2',
                status: 'published',
                userId: userId2,
                categoryId: categoryId1,
                tagIds: []
            });

            await adapter.blogs.create({
                title: 'Travel Blog',
                slug: 'travel-blog',
                content: {version: 1, content: [{data: 'Travel content', name: "Text", version: 1}]},
                excerpt: 'Travel excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId2,
                tagIds: []
            });

            const result = await adapter.generated.getCategoryWithBlogs(categoryId1);

            console.log(JSON.stringify(result));

            expect(result.category).toBeDefined();
            expect(result.category?.name).toBe('Technology');
            expect(result.blogs).toHaveLength(2);
            expect(result.blogs.every(b => b.category._id === categoryId1)).toBe(true);
        });

        it('should get tag with blogs', async () => {
            await adapter.blogs.create({
                title: 'JS Blog 1',
                slug: 'js-blog-1',
                content: {version: 1, content: [{data: 'JS content 1', name: "Text", version: 1}]},
                excerpt: 'JS excerpt 1',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId1, tagId2]
            });

            await adapter.blogs.create({
                title: 'JS Blog 2',
                slug: 'js-blog-2',
                content: {version: 1, content: [{data: 'JS content 2', name: "Text", version: 1}]},
                excerpt: 'JS excerpt 2',
                status: 'published',
                userId: userId2,
                categoryId: categoryId2,
                tagIds: [tagId1]
            });

            await adapter.blogs.create({
                title: 'No JS Blog',
                slug: 'no-js-blog',
                content: {version: 1, content: [{data: 'Other content', name: "Text", version: 1}]},
                excerpt: 'Other excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId2, tagId3]
            });

            const result = await adapter.generated.getTagWithBlogs(tagId1);

            expect(result.tag).toBeDefined();
            expect(result.tag?.name).toBe('JavaScript');
            expect(result.blogs).toHaveLength(2);
            expect(result.blogs.every(b => b.tags.some(t => t._id === tagId1))).toBe(true);
        });

        it('should get blogs by tag slug', async () => {
            await adapter.blogs.create({
                title: 'React Blog',
                slug: 'react-blog',
                content: {version: 1, content: [{data: 'React content', name: "Text", version: 1}]},
                excerpt: 'React excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: [tagId2]
            });

            await adapter.blogs.create({
                title: 'Another React Blog',
                slug: 'another-react-blog',
                content: {version: 1, content: [{data: 'More React content', name: "Text", version: 1}]},
                excerpt: 'More React excerpt',
                status: 'published',
                userId: userId2,
                categoryId: categoryId2,
                tagIds: [tagId2, tagId3]
            });

            const blogs = await adapter.generated.getBlogsByTag('react');

            expect(blogs).toHaveLength(2);
            expect(blogs.every(b => b.tags.some(t => t.slug === 'react'))).toBe(true);
        });

        it('should get blogs by category slug', async () => {
            await adapter.blogs.create({
                title: 'Travel Blog 1',
                slug: 'travel-blog-1',
                content: {version: 1, content: [{data: 'Travel content 1', name: "Text", version: 1}]},
                excerpt: 'Travel excerpt 1',
                status: 'published',
                userId: userId1,
                categoryId: categoryId2,
                tagIds: []
            });

            await adapter.blogs.create({
                title: 'Travel Blog 2',
                slug: 'travel-blog-2',
                content: {version: 1, content: [{data: 'Travel content 2', name: "Text", version: 1}]},
                excerpt: 'Travel excerpt 2',
                status: 'published',
                userId: userId2,
                categoryId: categoryId2,
                tagIds: []
            });

            const blogs = await adapter.generated.getBlogsByCategory('travel');

            expect(blogs).toHaveLength(2);
            expect(blogs.every(b => b.category.slug === 'travel')).toBe(true);
        });

        it('should handle missing relationships gracefully', async () => {
            // Create a blog with minimal relationships
            const blog = await adapter.blogs.create({
                title: 'Minimal Blog',
                slug: 'minimal-blog',
                content: {version: 1, content: [{data: 'Minimal content', name: "Text", version: 1}]},
                excerpt: 'Minimal excerpt',
                status: 'published',
                userId: userId1,
                categoryId: categoryId1,
                tagIds: []
            });

            const hydrated = await adapter.generated.getHydratedBlog({_id: blog._id});

            expect(hydrated).toBeDefined();
            expect(hydrated?.user).toBeDefined();
            expect(hydrated?.category).toBeDefined();
            expect(hydrated?.tags).toEqual([]);
            expect(hydrated?.featuredMedia).toBeUndefined();
            expect(hydrated?.parent).toBeUndefined();
        });
    });
});