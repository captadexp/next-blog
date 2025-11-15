import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'bun:test';
import {MongoClient} from 'mongodb';
import {MongoDBAdapter} from '../../adapters';
import {clearDatabase, setupTestDb, teardownTestDb} from './setup.js';
import {createId, MediaData} from '@supergrowthai/next-blog-types';

describe('MongoDBAdapter - Media Operations', () => {
    let client: MongoClient;
    let adapter: MongoDBAdapter;
    const TEST_DB = 'test-media';

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

    describe('Media CRUD Operations', () => {
        it('should create media with proper type conversion', async () => {
            const mediaData: MediaData = {
                filename: 'image.jpg',
                mimeType: 'image/jpeg',
                size: 1024000,
                url: 'https://cdn.example.com/image.jpg',
                width: 1920,
                height: 1080,
                altText: 'A beautiful image',
                caption: 'This is the image caption',
                userId: createId.user('507f1f77bcf86cd799439011'),
                metadata: {
                    exif: {
                        camera: 'Canon EOS R5',
                        lens: '24-70mm'
                    }
                }
            };

            const created = await adapter.media.create(mediaData);

            expect(created).toBeDefined();
            expect(created._id).toBeDefined();
            expect(created._id).toBeDefined();
            expect(typeof created._id).toBe('string');
            expect(created.filename).toBe(mediaData.filename);
            expect(created.mimeType).toBe(mediaData.mimeType);
            expect(created.size).toBe(mediaData.size);
            expect(created.url).toBe(mediaData.url);
            expect(created.width).toBe(mediaData.width);
            expect(created.height).toBe(mediaData.height);
            expect(created.userId).toBe(mediaData.userId);
            expect(created.metadata).toEqual(mediaData.metadata);
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
        });

        it('should find media by id', async () => {
            const created = await adapter.media.create({
                filename: 'find-me.png',
                mimeType: 'image/png',
                size: 500000,
                url: 'https://cdn.example.com/find-me.png',
                userId: createId.user('507f1f77bcf86cd799439011')
            });

            const found = await adapter.media.findById(created._id);

            expect(found).toBeDefined();
            expect(found?._id).toBe(created._id);
            expect(found?.filename).toBe('find-me.png');
            expect(found?.mimeType).toBe('image/png');
        });

        it('should find media with filters', async () => {
            const userId1 = createId.user('507f1f77bcf86cd799439011');
            const userId2 = createId.user('507f1f77bcf86cd799439012');

            await adapter.media.create({
                filename: 'image1.jpg',
                mimeType: 'image/jpeg',
                size: 100000,
                url: 'https://cdn.example.com/image1.jpg',
                userId: userId1
            });

            await adapter.media.create({
                filename: 'image2.png',
                mimeType: 'image/png',
                size: 200000,
                url: 'https://cdn.example.com/image2.png',
                userId: userId1
            });

            await adapter.media.create({
                filename: 'document.pdf',
                mimeType: 'application/pdf',
                size: 300000,
                url: 'https://cdn.example.com/document.pdf',
                userId: userId2
            });

            // Find by userId
            const userMedia = await adapter.media.find({userId: userId1});
            expect(userMedia.length).toBe(2);

            // Find by mimeType
            const images = await adapter.media.find({mimeType: 'image/jpeg'});
            expect(images.length).toBe(1);
            expect(images[0].filename).toBe('image1.jpg');

            // Find all
            const all = await adapter.media.find({});
            expect(all.length).toBe(3);
        });

        it('should handle complex filters with operators', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');

            const media1 = await adapter.media.create({
                filename: 'small.jpg',
                mimeType: 'image/jpeg',
                size: 50000,
                url: 'https://cdn.example.com/small.jpg',
                userId
            });

            const media2 = await adapter.media.create({
                filename: 'medium.jpg',
                mimeType: 'image/jpeg',
                size: 500000,
                url: 'https://cdn.example.com/medium.jpg',
                userId
            });

            const media3 = await adapter.media.create({
                filename: 'large.jpg',
                mimeType: 'image/jpeg',
                size: 5000000,
                url: 'https://cdn.example.com/large.jpg',
                userId
            });

            // Test $in operator
            const selected = await adapter.media.find({
                _id: {$in: [media1._id, media3._id]}
            });
            expect(selected.length).toBe(2);
            expect(selected.map(m => m.filename).sort()).toEqual(['large.jpg', 'small.jpg']);

            // Test $ne operator
            const notMedium = await adapter.media.find({
                _id: {$ne: media2._id}
            });
            expect(notMedium.length).toBe(2);
            expect(notMedium.every(m => m.filename !== 'medium.jpg')).toBe(true);
        });

        it('should update media', async () => {
            const created = await adapter.media.create({
                filename: 'original.jpg',
                mimeType: 'image/jpeg',
                size: 1000000,
                url: 'https://cdn.example.com/original.jpg',
                userId: createId.user('507f1f77bcf86cd799439011')
            });

            const updated = await adapter.media.updateOne(
                {_id: created._id},
                {
                    altText: 'Updated alt text',
                    caption: 'Updated caption',
                    width: 1920,
                    height: 1080,
                    metadata: {
                        processed: true
                    }
                }
            );

            expect(updated).toBeDefined();
            expect(updated?.altText).toBe('Updated alt text');
            expect(updated?.caption).toBe('Updated caption');
            expect(updated?.width).toBe(1920);
            expect(updated?.height).toBe(1080);
            expect(updated?.metadata).toEqual({processed: true});
            expect(updated?.filename).toBe('original.jpg'); // unchanged
            expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
        });

        it('should delete media', async () => {
            const created = await adapter.media.create({
                filename: 'delete-me.jpg',
                mimeType: 'image/jpeg',
                size: 100000,
                url: 'https://cdn.example.com/delete-me.jpg',
                userId: createId.user('507f1f77bcf86cd799439011')
            });

            const deleted = await adapter.media.deleteOne({_id: created._id});
            expect(deleted).toBeDefined();
            expect(deleted?._id).toBe(created._id);

            const found = await adapter.media.findById(created._id);
            expect(found).toBeNull();
        });

        it('should delete multiple media files', async () => {
            const tempUserId = createId.user('507f1f77bcf86cd799439011');
            const keepUserId = createId.user('507f1f77bcf86cd799439012');

            for (let i = 0; i < 3; i++) {
                await adapter.media.create({
                    filename: `temp-${i}.jpg`,
                    mimeType: 'image/jpeg',
                    size: 100000 * (i + 1),
                    url: `https://cdn.example.com/temp-${i}.jpg`,
                    userId: tempUserId
                });
            }

            for (let i = 0; i < 2; i++) {
                await adapter.media.create({
                    filename: `keep-${i}.jpg`,
                    mimeType: 'image/jpeg',
                    size: 200000 * (i + 1),
                    url: `https://cdn.example.com/keep-${i}.jpg`,
                    userId: keepUserId
                });
            }

            const deletedCount = await adapter.media.delete({userId: tempUserId});
            expect(deletedCount).toBe(3);

            const remaining = await adapter.media.find({});
            expect(remaining.length).toBe(2);
            expect(remaining.every(m => m.userId === keepUserId)).toBe(true);
        });

        it('should count media with filters', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');

            for (let i = 0; i < 5; i++) {
                await adapter.media.create({
                    filename: `image-${i}.jpg`,
                    mimeType: 'image/jpeg',
                    size: 100000 * (i + 1),
                    url: `https://cdn.example.com/image-${i}.jpg`,
                    userId
                });
            }

            for (let i = 0; i < 3; i++) {
                await adapter.media.create({
                    filename: `doc-${i}.pdf`,
                    mimeType: 'application/pdf',
                    size: 200000 * (i + 1),
                    url: `https://cdn.example.com/doc-${i}.pdf`,
                    userId
                });
            }

            const totalCount = await adapter.media.count({});
            expect(totalCount).toBe(8);

            const imageCount = await adapter.media.count({mimeType: 'image/jpeg'});
            expect(imageCount).toBe(5);

            const pdfCount = await adapter.media.count({mimeType: 'application/pdf'});
            expect(pdfCount).toBe(3);
        });

        it('should handle pagination options', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');

            for (let i = 0; i < 10; i++) {
                await adapter.media.create({
                    filename: `file-${i.toString().padStart(2, '0')}.jpg`,
                    mimeType: 'image/jpeg',
                    size: 100000 * (i + 1),
                    url: `https://cdn.example.com/file-${i}.jpg`,
                    userId
                });
            }

            // Test limit
            const limited = await adapter.media.find({}, {limit: 5});
            expect(limited.length).toBe(5);

            // Test skip
            const skipped = await adapter.media.find({}, {skip: 7});
            expect(skipped.length).toBe(3);

            // Test skip + limit
            const paginated = await adapter.media.find({}, {skip: 3, limit: 4});
            expect(paginated.length).toBe(4);

            // Test sort by filename
            const sorted = await adapter.media.find({}, {
                sort: {filename: -1},
                limit: 3
            });
            expect(sorted[0].filename).toBe('file-09.jpg');
            expect(sorted[1].filename).toBe('file-08.jpg');
            expect(sorted[2].filename).toBe('file-07.jpg');

            // Test sort by size
            const sortedBySize = await adapter.media.find({}, {
                sort: {size: -1},
                limit: 2
            });
            expect(sortedBySize[0].size).toBe(1000000);
            expect(sortedBySize[1].size).toBe(900000);
        });

        it('should handle various media types', async () => {
            const userId = createId.user('507f1f77bcf86cd799439011');

            const imageMedia = await adapter.media.create({
                filename: 'photo.jpg',
                mimeType: 'image/jpeg',
                size: 500000,
                url: 'https://cdn.example.com/photo.jpg',
                width: 1920,
                height: 1080,
                userId
            });

            const videoMedia = await adapter.media.create({
                filename: 'video.mp4',
                mimeType: 'video/mp4',
                size: 50000000,
                url: 'https://cdn.example.com/video.mp4',
                width: 1920,
                height: 1080,
                metadata: {
                    duration: 120,
                    bitrate: 5000000
                },
                userId
            });

            const audioMedia = await adapter.media.create({
                filename: 'audio.mp3',
                mimeType: 'audio/mpeg',
                size: 5000000,
                url: 'https://cdn.example.com/audio.mp3',
                metadata: {
                    duration: 180,
                    bitrate: 320000
                },
                userId
            });

            expect(imageMedia.mimeType).toBe('image/jpeg');
            expect(videoMedia.mimeType).toBe('video/mp4');
            expect(audioMedia.mimeType).toBe('audio/mpeg');

            const videos = await adapter.media.find({mimeType: 'video/mp4'});
            expect(videos.length).toBe(1);
            expect(videos[0].metadata?.duration).toBe(120);
        });
    });
});