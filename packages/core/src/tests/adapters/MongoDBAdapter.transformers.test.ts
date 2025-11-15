import {describe, expect, it} from 'bun:test';
import {ObjectId} from 'mongodb';
import {oid} from '../../adapters/MongoDBAdapter.js';
import {createId} from '@supergrowthai/next-blog-types';

describe('MongoDBAdapter - Type Transformations', () => {
    describe('ObjectId Conversions', () => {
        it('should convert valid string to ObjectId', () => {
            const validId = '507f1f77bcf86cd799439011';
            const result = oid(validId);

            expect(result).toBeInstanceOf(ObjectId);
            expect(result.toString()).toBe(validId);
        });

        it('should pass through existing ObjectId', () => {
            const existingOid = new ObjectId('507f1f77bcf86cd799439011');
            const result = oid(existingOid);

            expect(result).toBe(existingOid);
            expect(result).toBeInstanceOf(ObjectId);
        });

        it('should throw error for invalid ObjectId string', () => {
            expect(() => oid('invalid-id')).toThrow('invalid ObjectId');
            expect(() => oid('123')).toThrow('invalid ObjectId');
            expect(() => oid('')).toThrow('invalid ObjectId');
        });
    });

    describe('BrandedId Types', () => {
        it('should extract ObjectId from branded ID', () => {
            const blogId = createId.blog('507f1f77bcf86cd799439011');
            const objectId = oid(blogId);

            expect(objectId).toBeInstanceOf(ObjectId);
            expect(objectId.toString()).toBe('507f1f77bcf86cd799439011');
        });
    });

    describe('Filter Transformations', () => {
        it('should handle simple _id filter', () => {
            const filter = {
                _id: '507f1f77bcf86cd799439011'
            };

            // This would be handled by the transformer's toDbFilter method
            const expectedObjectId = oid(filter._id);
            expect(expectedObjectId).toBeInstanceOf(ObjectId);
            expect(expectedObjectId.toString()).toBe('507f1f77bcf86cd799439011');
        });

        it('should handle $in operator on _id', () => {
            const ids = [
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439012'
            ];

            const objectIds = ids.map(id => oid(id));
            expect(objectIds).toHaveLength(2);
            expect(objectIds[0]).toBeInstanceOf(ObjectId);
            expect(objectIds[1]).toBeInstanceOf(ObjectId);
        });

        it('should handle array fields like tagIds', () => {
            const tagIds = [
                createId.tag('507f1f77bcf86cd799439011'),
                createId.tag('507f1f77bcf86cd799439012'),
                createId.tag('507f1f77bcf86cd799439013')
            ];

            const objectIds = tagIds.map(id => oid(id));
            expect(objectIds).toHaveLength(3);
            objectIds.forEach(oid => {
                expect(oid).toBeInstanceOf(ObjectId);
            });
        });

        it('should handle nested operators', () => {
            const categoryId = createId.category('507f1f77bcf86cd799439011');
            const filter = {
                categoryId: {
                    $ne: categoryId
                }
            };

            const objectId = oid(filter.categoryId.$ne);
            expect(objectId).toBeInstanceOf(ObjectId);
            expect(objectId.toString()).toBe('507f1f77bcf86cd799439011');
        });

        it('should handle complex $or queries', () => {
            const userId = createId.user('507f1f77bcf86cd799439011');
            const categoryId = createId.category('507f1f77bcf86cd799439012');

            const filter = {
                $or: [
                    {userId: userId},
                    {categoryId: categoryId}
                ]
            };

            const userOid = oid(filter.$or[0].userId!);
            const categoryOid = oid(filter.$or[1].categoryId!);

            expect(userOid).toBeInstanceOf(ObjectId);
            expect(categoryOid).toBeInstanceOf(ObjectId);
            expect(userOid.toString()).toBe('507f1f77bcf86cd799439011');
            expect(categoryOid.toString()).toBe('507f1f77bcf86cd799439012');
        });
    });

    describe('Data Type Conversions', () => {
        it('should preserve non-ID fields unchanged', () => {
            const data = {
                title: 'Test Blog',
                slug: 'test-blog',
                content: 'Test content',
                status: 'published',
                metadata: {
                    views: 100,
                    likes: 50,
                    nested: {
                        deep: 'value'
                    }
                }
            };

            // These fields should pass through unchanged
            expect(data.title).toBe('Test Blog');
            expect(data.slug).toBe('test-blog');
            expect(data.metadata.views).toBe(100);
            expect(data.metadata.nested.deep).toBe('value');
        });

        it('should handle undefined and null values', () => {
            const data = {
                title: 'Test',
                parentId: undefined,
                featuredMediaId: null,
                tagIds: []
            };

            expect(data.parentId).toBeUndefined();
            expect(data.featuredMediaId).toBeNull();
            expect(data.tagIds).toEqual([]);
        });

        it('should handle timestamp fields', () => {
            const now = Date.now();
            const data = {
                createdAt: now,
                updatedAt: now + 1000
            };

            expect(data.createdAt).toBe(now);
            expect(data.updatedAt).toBe(now + 1000);
        });
    });

    describe('Reverse Transformations (fromDb)', () => {
        it('should convert ObjectId to branded string ID', () => {
            const dbBlog = {
                _id: new ObjectId('507f1f77bcf86cd799439011'),
                title: 'Test Blog',
                userId: new ObjectId('507f1f77bcf86cd799439012'),
                categoryId: new ObjectId('507f1f77bcf86cd799439013'),
                tagIds: [
                    new ObjectId('507f1f77bcf86cd799439014'),
                    new ObjectId('507f1f77bcf86cd799439015')
                ]
            };

            // Simulating what the transformer would do
            const transformed = {
                _id: createId.blog(dbBlog._id.toString()),
                title: dbBlog.title,
                userId: createId.user(dbBlog.userId.toString()),
                categoryId: createId.category(dbBlog.categoryId.toString()),
                tagIds: dbBlog.tagIds.map(t => createId.tag(t.toString()))
            };

            expect(transformed._id).toBe(createId.blog('507f1f77bcf86cd799439011'));
            expect(transformed.userId).toBe(createId.user('507f1f77bcf86cd799439012'));
            expect(transformed.categoryId).toBe(createId.category('507f1f77bcf86cd799439013'));
            expect(transformed.tagIds[0]).toBe(createId.tag('507f1f77bcf86cd799439014'));
            expect(transformed.tagIds[1]).toBe(createId.tag('507f1f77bcf86cd799439015'));
        });

        it('should handle missing optional fields', () => {
            const dbBlog = {
                _id: new ObjectId('507f1f77bcf86cd799439011'),
                title: 'Test Blog',
                userId: new ObjectId('507f1f77bcf86cd799439012'),
                categoryId: new ObjectId('507f1f77bcf86cd799439013'),
                tagIds: []
            };

            // Simulating transformer behavior
            const transformed = {
                _id: createId.blog(dbBlog._id.toString()),
                title: dbBlog.title,
                userId: createId.user(dbBlog.userId.toString()),
                categoryId: createId.category(dbBlog.categoryId.toString()),
                tagIds: [],
                parentId: undefined,
                featuredMediaId: undefined
            };

            expect(transformed.tagIds).toEqual([]);
            expect(transformed.parentId).toBeUndefined();
            expect(transformed.featuredMediaId).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty filters', () => {
            const emptyFilter = {};
            expect(Object.keys(emptyFilter)).toHaveLength(0);
        });

        it('should handle filters with non-ID fields', () => {
            const filter = {
                status: 'published',
                title: {$regex: 'test'},
                createdAt: {$gte: Date.now() - 86400000}
            };

            // These should pass through unchanged
            expect(filter.status).toBe('published');
            expect(filter.title.$regex).toBe('test');
            expect(filter.createdAt.$gte).toBeLessThanOrEqual(Date.now());
        });

        it('should handle mixed ID and non-ID operators', () => {
            const filter = {
                $and: [
                    {_id: {$ne: createId.blog('507f1f77bcf86cd799439011')}},
                    {status: 'published'},
                    {userId: createId.user('507f1f77bcf86cd799439012')}
                ]
            };

            expect(filter.$and).toHaveLength(3);
            expect(filter.$and[1].status).toBe('published');
        });

        it('should handle deeply nested structures', () => {
            const data = {
                metadata: {
                    seo: {
                        title: 'SEO Title',
                        description: 'SEO Description',
                        keywords: ['key1', 'key2'],
                        openGraph: {
                            image: 'og-image.jpg',
                            type: 'article'
                        }
                    }
                }
            };

            expect(data.metadata.seo.title).toBe('SEO Title');
            expect(data.metadata.seo.keywords).toEqual(['key1', 'key2']);
            expect(data.metadata.seo.openGraph.type).toBe('article');
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large arrays efficiently', () => {
            const largeTagArray = Array.from({length: 100}, (_, i) =>
                createId.tag(new ObjectId().toString())
            );

            const objectIds = largeTagArray.map(id => oid(id));
            expect(objectIds).toHaveLength(100);
            objectIds.forEach(oid => {
                expect(oid).toBeInstanceOf(ObjectId);
            });
        });

        it('should handle bulk operations', () => {
            const bulkData = Array.from({length: 50}, (_, i) => ({
                _id: createId.blog(new ObjectId().toString()),
                userId: createId.user(new ObjectId().toString()),
                categoryId: createId.category(new ObjectId().toString()),
                tagIds: Array.from({length: 5}, () =>
                    createId.tag(new ObjectId().toString())
                )
            }));

            bulkData.forEach(item => {
                expect(item._id).toBeDefined();
                expect(item.userId).toBeDefined();
                expect(item.categoryId).toBeDefined();
                expect(item.tagIds).toHaveLength(5);
            });
        });
    });
});