import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'bun:test';
import {MongoClient} from 'mongodb';
import {MongoDBAdapter} from '../../adapters';
import {clearDatabase, setupTestDb, teardownTestDb} from './setup.js';
import {CategoryData, TagData} from '@supergrowthai/next-blog-types';

describe('MongoDBAdapter - Category and Tag Operations', () => {
    let client: MongoClient;
    let adapter: MongoDBAdapter;
    const TEST_DB = 'test-category-tag';

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

    describe('Category CRUD Operations', () => {
        it('should create a category with proper type conversion', async () => {
            const categoryData: CategoryData = {
                name: 'Technology',
                slug: 'technology',
                description: 'Tech related posts',
                metadata: {
                    color: '#0000FF',
                    icon: 'tech-icon'
                }
            };

            const created = await adapter.categories.create(categoryData);

            expect(created).toBeDefined();
            expect(created._id).toBeDefined();
            expect(created._id).toBeDefined();
            expect(typeof created._id).toBe('string');
            expect(created.name).toBe(categoryData.name);
            expect(created.slug).toBe(categoryData.slug);
            expect(created.description).toBe(categoryData.description);
            expect(created.metadata).toEqual(categoryData.metadata);
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
        });

        it('should handle parent-child category relationships', async () => {
            const parent = await adapter.categories.create({
                name: 'Programming',
                slug: 'programming',
                description: 'Programming topics'
            });

            const child = await adapter.categories.create({
                name: 'JavaScript',
                slug: 'javascript',
                description: 'JS specific',
                parentId: parent._id
            });

            expect(child.parentId).toBe(parent._id);

            const foundChild = await adapter.categories.findById(child._id);
            expect(foundChild?.parentId).toBe(parent._id);

            const children = await adapter.categories.find({parentId: parent._id});
            expect(children.length).toBe(1);
            expect(children[0]._id).toBe(child._id);
        });

        it('should find categories with filters', async () => {
            await adapter.categories.create({
                name: 'Tech',
                slug: 'tech',
                description: 'Technology'
            });

            await adapter.categories.create({
                name: 'Travel',
                slug: 'travel',
                description: 'Travel posts'
            });

            await adapter.categories.create({
                name: 'Food',
                slug: 'food',
                description: 'Food and recipes'
            });

            const bySlug = await adapter.categories.find({slug: 'travel'});
            expect(bySlug.length).toBe(1);
            expect(bySlug[0].name).toBe('Travel');

            const all = await adapter.categories.find({});
            expect(all.length).toBe(3);
        });

        it('should update a category', async () => {
            const created = await adapter.categories.create({
                name: 'Original',
                slug: 'original',
                description: 'Original description'
            });

            const updated = await adapter.categories.updateOne(
                {_id: created._id},
                {
                    name: 'Updated',
                    description: 'Updated description'
                }
            );

            expect(updated).toBeDefined();
            expect(updated?.name).toBe('Updated');
            expect(updated?.description).toBe('Updated description');
            expect(updated?.slug).toBe('original'); // unchanged
            expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
        });

        it('should delete a category', async () => {
            const created = await adapter.categories.create({
                name: 'ToDelete',
                slug: 'to-delete',
                description: 'Will be deleted'
            });

            const deleted = await adapter.categories.deleteOne({_id: created._id});
            expect(deleted).toBeDefined();
            expect(deleted?._id).toBe(created._id);

            const found = await adapter.categories.findById(created._id);
            expect(found).toBeNull();
        });

        it('should count categories', async () => {
            const parent = await adapter.categories.create({
                name: 'Parent',
                slug: 'parent',
                description: 'Parent category'
            });

            for (let i = 0; i < 3; i++) {
                await adapter.categories.create({
                    name: `Child ${i}`,
                    slug: `child-${i}`,
                    description: `Child category ${i}`,
                    parentId: parent._id
                });
            }

            const totalCount = await adapter.categories.count({});
            expect(totalCount).toBe(4);

            const childCount = await adapter.categories.count({parentId: parent._id});
            expect(childCount).toBe(3);
        });
    });

    describe('Tag CRUD Operations', () => {
        it('should create a tag with proper type conversion', async () => {
            const tagData: TagData = {
                name: 'JavaScript',
                slug: 'javascript',
                description: 'JS related posts',
                metadata: {
                    color: '#F7DF1E',
                    popularity: 100
                }
            };

            const created = await adapter.tags.create(tagData);

            expect(created).toBeDefined();
            expect(created._id).toBeDefined();
            expect(created._id).toBeDefined();
            expect(typeof created._id).toBe('string');
            expect(created.name).toBe(tagData.name);
            expect(created.slug).toBe(tagData.slug);
            expect(created.description).toBe(tagData.description!);
            expect(created.metadata).toEqual(tagData.metadata);
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
        });

        it('should find tags with filters', async () => {
            await adapter.tags.create({
                name: 'React',
                slug: 'react',
                description: 'React framework'
            });

            await adapter.tags.create({
                name: 'Vue',
                slug: 'vue',
                description: 'Vue framework'
            });

            await adapter.tags.create({
                name: 'Angular',
                slug: 'angular',
                description: 'Angular framework'
            });

            const bySlug = await adapter.tags.find({slug: 'vue'});
            expect(bySlug.length).toBe(1);
            expect(bySlug[0].name).toBe('Vue');

            const byName = await adapter.tags.find({name: 'React'});
            expect(byName.length).toBe(1);
            expect(byName[0].slug).toBe('react');

            const all = await adapter.tags.find({});
            expect(all.length).toBe(3);
        });

        it('should handle complex filters with operators', async () => {
            const tag1 = await adapter.tags.create({
                name: 'Tag1',
                slug: 'tag1',
                description: 'First tag'
            });

            const tag2 = await adapter.tags.create({
                name: 'Tag2',
                slug: 'tag2',
                description: 'Second tag'
            });

            const tag3 = await adapter.tags.create({
                name: 'Tag3',
                slug: 'tag3',
                description: 'Third tag'
            });

            // Test $in operator
            const inTags = await adapter.tags.find({
                _id: {$in: [tag1._id, tag3._id]}
            });
            expect(inTags.length).toBe(2);
            expect(inTags.map(t => t.slug).sort()).toEqual(['tag1', 'tag3']);

            // Test $ne operator
            const notTag2 = await adapter.tags.find({
                _id: {$ne: tag2._id}
            });
            expect(notTag2.length).toBe(2);
            expect(notTag2.every(t => t.slug !== 'tag2')).toBe(true);
        });

        it('should update a tag', async () => {
            const created = await adapter.tags.create({
                name: 'OldName',
                slug: 'old-slug',
                description: 'Old description'
            });

            const updated = await adapter.tags.updateOne(
                {_id: created._id},
                {
                    name: 'NewName',
                    description: 'New description',
                    metadata: {featured: true}
                }
            );

            expect(updated).toBeDefined();
            expect(updated?.name).toBe('NewName');
            expect(updated?.description).toBe('New description');
            expect(updated?.metadata).toEqual({featured: true});
            expect(updated?.slug).toBe('old-slug'); // unchanged
            expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
        });

        it('should delete a tag', async () => {
            const created = await adapter.tags.create({
                name: 'ToDelete',
                slug: 'to-delete',
                description: 'Will be deleted'
            });

            const deleted = await adapter.tags.deleteOne({_id: created._id});
            expect(deleted).toBeDefined();
            expect(deleted?._id).toBe(created._id);

            const found = await adapter.tags.findById(created._id);
            expect(found).toBeNull();
        });

        it('should delete multiple tags', async () => {
            for (let i = 0; i < 5; i++) {
                await adapter.tags.create({
                    name: `Tag ${i}`,
                    slug: `tag-${i}`,
                    description: i < 3 ? 'temporary' : 'permanent'
                });
            }

            const deletedCount = await adapter.tags.delete({description: 'temporary'});
            expect(deletedCount).toBe(3);

            const remaining = await adapter.tags.find({});
            expect(remaining.length).toBe(2);
            expect(remaining.every(t => t.description === 'permanent')).toBe(true);
        });

        it('should count tags', async () => {
            for (let i = 0; i < 7; i++) {
                await adapter.tags.create({
                    name: `Tag ${i}`,
                    slug: `tag-${i}`,
                    description: i < 4 ? 'popular' : 'niche'
                });
            }

            const totalCount = await adapter.tags.count({});
            expect(totalCount).toBe(7);

            const popularCount = await adapter.tags.count({description: 'popular'});
            expect(popularCount).toBe(4);

            const nicheCount = await adapter.tags.count({description: 'niche'});
            expect(nicheCount).toBe(3);
        });

        it('should handle pagination for tags', async () => {
            for (let i = 0; i < 10; i++) {
                await adapter.tags.create({
                    name: `Tag ${i.toString().padStart(2, '0')}`,
                    slug: `tag-${i}`,
                    description: `Description ${i}`
                });
            }

            // Test limit
            const limited = await adapter.tags.find({}, {limit: 5});
            expect(limited.length).toBe(5);

            // Test skip
            const skipped = await adapter.tags.find({}, {skip: 7});
            expect(skipped.length).toBe(3);

            // Test skip + limit
            const paginated = await adapter.tags.find({}, {skip: 2, limit: 4});
            expect(paginated.length).toBe(4);

            // Test sort
            const sorted = await adapter.tags.find({}, {
                sort: {name: -1},
                limit: 3
            });
            expect(sorted[0].name).toBe('Tag 09');
            expect(sorted[1].name).toBe('Tag 08');
            expect(sorted[2].name).toBe('Tag 07');
        });
    });
});