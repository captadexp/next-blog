import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'bun:test';
import {MongoClient} from 'mongodb';
import {MongoDBAdapter} from '../../adapters';
import {clearDatabase, setupTestDb, teardownTestDb} from './setup.js';
import {BlogData, createId} from '@supergrowthai/next-blog-types';

describe('MongoDBAdapter - Blog Operations', () => {
    let client: MongoClient;
    let adapter: MongoDBAdapter;
    const TEST_DB = 'test-blog';

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
    });

    describe('Blog CRUD Operations', () => {
        it('should create a blog with proper type conversion', async () => {
            const blogData: BlogData = {
                title: 'Test Blog',
                slug: 'test-blog',
                content: {version: 1, content: []},
                excerpt: 'Test excerpt',
                status: 'draft',
                userId: createId.user('507f1f77bcf86cd799439011'),
                categoryId: createId.category('507f1f77bcf86cd799439012'),
                tagIds: [
                    createId.tag('507f1f77bcf86cd799439013'),
                    createId.tag('507f1f77bcf86cd799439014')
                ],
                featuredMediaId: createId.media('507f1f77bcf86cd799439015'),
                metadata: {
                    views: 0,
                    likes: 0
                }
            };

            const created = await adapter.blogs.create(blogData);

            expect(created).toBeDefined();
            expect(created._id).toBeDefined();
            expect(created._id).toBeDefined();
            expect(typeof created._id).toBe('string');
            expect(created.title).toBe(blogData.title);
            expect(created.slug).toBe(blogData.slug);
            expect(created.userId).toBe(blogData.userId);
            expect(created.categoryId).toBe(blogData.categoryId);
            expect(created.tagIds).toEqual(blogData.tagIds);
            expect(created.featuredMediaId).toBe(blogData.featuredMediaId);
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
        });

        it('should find a blog by id', async () => {
            const blogData: BlogData = {
                title: 'Find Me',
                slug: 'find-me',
                content: {version: 1, content: []},
                excerpt: 'Excerpt',
                status: 'published',
                userId: createId.user('507f1f77bcf86cd799439011'),
                categoryId: createId.category('507f1f77bcf86cd799439012'),
                tagIds: []
            };

            const created = await adapter.blogs.create(blogData);
            const found = await adapter.blogs.findById(created._id);

            expect(found).toBeDefined();
            expect(found?._id).toBe(created._id);
            expect(found?.title).toBe(created.title);
            expect(found?.status).toBe('published');
        });

        it('should find blogs with filters', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');
            const categoryId = createId.category('507f1f77bcf86cd799439012');

            await adapter.blogs.create({
                title: 'Published Blog',
                slug: 'published',
                content: {version: 1, content: []},
                excerpt: 'Excerpt',
                status: 'published',
                userId,
                categoryId,
                tagIds: []
            });

            await adapter.blogs.create({
                title: 'Draft Blog',
                slug: 'draft',
                content: {version: 1, content: []},
                excerpt: 'Excerpt',
                status: 'draft',
                userId,
                categoryId,
                tagIds: []
            });

            const publishedBlogs = await adapter.blogs.find({status: 'published'});
            expect(publishedBlogs.length).toBe(1);
            expect(publishedBlogs[0].title).toBe('Published Blog');

            const draftBlogs = await adapter.blogs.find({status: 'draft'});
            expect(draftBlogs.length).toBe(1);
            expect(draftBlogs[0].title).toBe('Draft Blog');
        });

        it('should handle complex filters with operators', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');
            const categoryId1 = createId.category('507f1f77bcf86cd799439012');
            const categoryId2 = createId.category('507f1f77bcf86cd799439013');
            const tagId1 = createId.tag('507f1f77bcf86cd799439014');
            const tagId2 = createId.tag('507f1f77bcf86cd799439015');

            await adapter.blogs.create({
                title: 'Blog 1',
                slug: 'blog-1',
                content: {version: 1, content: []},
                excerpt: 'Excerpt',
                status: 'published',
                userId,
                categoryId: categoryId1,
                tagIds: [tagId1, tagId2]
            });

            await adapter.blogs.create({
                title: 'Blog 2',
                slug: 'blog-2',
                content: {version: 1, content: []},
                excerpt: 'Excerpt',
                status: 'published',
                userId,
                categoryId: categoryId2,
                tagIds: [tagId1]
            });

            // Test $in operator on categoryId
            const blogsInCategories = await adapter.blogs.find({
                categoryId: {$in: [categoryId1, categoryId2]}
            });
            expect(blogsInCategories.length).toBe(2);

            // Test $in operator on tagIds array
            const blogsWithTag2 = await adapter.blogs.find({
                tagIds: {$in: [tagId2]}
            });
            expect(blogsWithTag2.length).toBe(1);
            expect(blogsWithTag2[0].title).toBe('Blog 1');

            // Test finding blogs with categoryId1 or tagId2 (using separate queries)
            const blogsInCategory1 = await adapter.blogs.find({categoryId: categoryId1});
            const blogsWithTag2Again = await adapter.blogs.find({tagIds: {$in: [tagId2]}});

            // Since Blog 1 has both categoryId1 and tagId2, it appears in both results
            expect(blogsInCategory1.length).toBe(1);
            expect(blogsWithTag2Again.length).toBe(1);
            expect(blogsInCategory1[0]._id).toBe(blogsWithTag2Again[0]._id);
        });

        it('should update a blog', async () => {
            const created = await adapter.blogs.create({
                title: 'Original Title',
                slug: 'original',
                content: {version: 1, content: []},
                excerpt: 'Original Excerpt',
                status: 'draft',
                userId: createId.user('507f1f77bcf86cd799439011'),
                categoryId: createId.category('507f1f77bcf86cd799439012'),
                tagIds: []
            });

            const updated = await adapter.blogs.updateOne(
                {_id: created._id},
                {
                    title: 'Updated Title',
                    status: 'published',
                    content: {version: 1, content: []}
                }
            );

            expect(updated).toBeDefined();
            expect(updated?.title).toBe('Updated Title');
            expect(updated?.status).toBe('published');
            expect(updated?.content).toEqual({version: 1, content: []});
            expect(updated?.excerpt).toBe('Original Excerpt');
            expect(updated?.updatedAt).toBeGreaterThan(created.updatedAt);
        });

        it('should delete a blog', async () => {
            const created = await adapter.blogs.create({
                title: 'To Delete',
                slug: 'to-delete',
                content: {version: 1, content: []},
                excerpt: 'Excerpt',
                status: 'draft',
                userId: createId.user('507f1f77bcf86cd799439011'),
                categoryId: createId.category('507f1f77bcf86cd799439012'),
                tagIds: []
            });

            const deleted = await adapter.blogs.deleteOne({_id: created._id});
            expect(deleted).toBeDefined();
            expect(deleted?._id).toBe(created._id);

            const found = await adapter.blogs.findById(created._id);
            expect(found).toBeNull();
        });

        it('should count blogs with filters', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');
            const categoryId = createId.category('507f1f77bcf86cd799439012');

            for (let i = 0; i < 5; i++) {
                await adapter.blogs.create({
                    title: `Blog ${i}`,
                    slug: `blog-${i}`,
                    content: {version: 1, content: []},
                    excerpt: 'Excerpt',
                    status: i < 3 ? 'published' : 'draft',
                    userId,
                    categoryId,
                    tagIds: []
                });
            }

            const totalCount = await adapter.blogs.count({});
            expect(totalCount).toBe(5);

            const publishedCount = await adapter.blogs.count({status: 'published'});
            expect(publishedCount).toBe(3);

            const draftCount = await adapter.blogs.count({status: 'draft'});
            expect(draftCount).toBe(2);
        });

        it('should handle pagination options', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');
            const categoryId = createId.category('507f1f77bcf86cd799439012');

            for (let i = 0; i < 10; i++) {
                await adapter.blogs.create({
                    title: `Blog ${i}`,
                    slug: `blog-${i}`,
                    content: {version: 1, content: []},
                    excerpt: 'Excerpt',
                    status: 'published',
                    userId,
                    categoryId,
                    tagIds: []
                });
            }

            // Test limit
            const limited = await adapter.blogs.find({}, {limit: 5});
            expect(limited.length).toBe(5);

            // Test skip
            const skipped = await adapter.blogs.find({}, {skip: 7});
            expect(skipped.length).toBe(3);

            // Test skip + limit
            const paginated = await adapter.blogs.find({}, {skip: 3, limit: 4});
            expect(paginated.length).toBe(4);

            // Test sort
            const sorted = await adapter.blogs.find({}, {
                sort: {title: -1},
                limit: 3
            });
            expect(sorted[0].title).toBe('Blog 9');
            expect(sorted[1].title).toBe('Blog 8');
            expect(sorted[2].title).toBe('Blog 7');
        });

        it('should handle parent-child relationships', async () => {
            const parentBlog = await adapter.blogs.create({
                title: 'Parent Blog',
                slug: 'parent',
                content: {version: 1, content: []},
                excerpt: 'Parent excerpt',
                status: 'published',
                userId: createId.user('507f1f77bcf86cd799439011'),
                categoryId: createId.category('507f1f77bcf86cd799439012'),
                tagIds: []
            });

            const childBlog = await adapter.blogs.create({
                title: 'Child Blog',
                slug: 'child',
                content: {version: 1, content: []},
                excerpt: 'Child excerpt',
                status: 'published',
                userId: createId.user('507f1f77bcf86cd799439011'),
                categoryId: createId.category('507f1f77bcf86cd799439012'),
                parentId: parentBlog._id,
                tagIds: []
            });

            expect(childBlog.parentId).toBe(parentBlog._id);

            const children = await adapter.blogs.find({parentId: parentBlog._id});
            expect(children.length).toBe(1);
            expect(children[0]._id).toBe(childBlog._id);
        });
    });
});