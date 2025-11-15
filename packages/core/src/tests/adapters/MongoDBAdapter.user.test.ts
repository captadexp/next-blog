import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'bun:test';
import {MongoClient} from 'mongodb';
import {MongoDBAdapter} from '../../adapters';
import {clearDatabase, setupTestDb, teardownTestDb} from './setup.js';
import {Permission, UserData} from '@supergrowthai/next-blog-types';

describe('MongoDBAdapter - User Operations', () => {
    let client: MongoClient;
    let adapter: MongoDBAdapter;
    const TEST_DB = 'test-user';

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

    describe('User CRUD Operations', () => {
        it('should create a user with proper type conversion', async () => {
            const userData: UserData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword123',
                name: 'Test User',
                slug: 'test-user',
                bio: 'A test user bio',
                permissions: ['blogs:read', 'blogs:create'] as Permission[]
            };

            const created = await adapter.users.create(userData);

            expect(created).toBeDefined();
            expect(created._id).toBeDefined();
            expect(created._id).toBeDefined();
            expect(typeof created._id).toBe('string');
            expect(created.username).toBe(userData.username);
            expect(created.email).toBe(userData.email);
            expect(created.password).toBe(userData.password);
            // First user always gets admin permissions
            expect(created.permissions).toEqual(['all:all']);
            expect(created.createdAt).toBeDefined();
            expect(created.updatedAt).toBeDefined();
        });

        it('should assign admin permissions to first user', async () => {
            const firstUser = await adapter.users.create({
                username: 'admin',
                email: 'admin@example.com',
                password: 'adminpass',
                name: 'Admin User',
                slug: 'admin-user',
                bio: 'Admin bio'
            });

            expect(firstUser.permissions).toEqual(['all:all']);

            const secondUser = await adapter.users.create({
                username: 'regular',
                email: 'regular@example.com',
                password: 'regularpass',
                name: 'Regular User',
                slug: 'regular-user',
                bio: 'Regular bio'
            });

            expect(secondUser.permissions).toEqual([]);
        });

        it('should find a user by id', async () => {
            const created = await adapter.users.create({
                username: 'findme',
                email: 'find@example.com',
                password: 'password',
                name: 'Find Me',
                slug: 'find-me',
                bio: 'Find me bio'
            });

            const found = await adapter.users.findById(created._id);

            expect(found).toBeDefined();
            expect(found?._id).toBe(created._id);
            expect(found?.username).toBe('findme');
            expect(found?.email).toBe('find@example.com');
        });

        it('should find users with filters', async () => {
            await adapter.users.create({
                username: 'user1',
                email: 'user1@example.com',
                password: 'pass1',
                name: 'User 1',
                slug: 'user-1',
                bio: 'User 1 bio',
                permissions: ['blogs:read'] as Permission[]
            });

            await adapter.users.create({
                username: 'user2',
                email: 'user2@example.com',
                password: 'pass2',
                name: 'User 2',
                slug: 'user-2',
                bio: 'User 2 bio',
                permissions: ['blogs:create'] as Permission[]
            });

            await adapter.users.create({
                username: 'user3',
                email: 'user3@example.com',
                password: 'pass3',
                name: 'User 3',
                slug: 'user-3',
                bio: 'User 3 bio',
                permissions: ['blogs:read', 'blogs:create'] as Permission[]
            });

            // Find by username
            const byUsername = await adapter.users.find({username: 'user1'});
            expect(byUsername.length).toBe(1);
            expect(byUsername[0].email).toBe('user1@example.com');

            // Find by email
            const byEmail = await adapter.users.find({email: 'user2@example.com'});
            expect(byEmail.length).toBe(1);
            expect(byEmail[0].username).toBe('user2');

            // Find all
            const all = await adapter.users.find({});
            expect(all.length).toBe(3);
        });

        it('should handle complex filters with operators', async () => {
            const user1 = await adapter.users.create({
                username: 'alice',
                email: 'alice@example.com',
                password: 'pass',
                name: 'Alice',
                slug: 'alice',
                bio: 'Alice bio'
            });

            const user2 = await adapter.users.create({
                username: 'bob',
                email: 'bob@example.com',
                password: 'pass',
                name: 'Bob',
                slug: 'bob',
                bio: 'Bob bio'
            });

            const user3 = await adapter.users.create({
                username: 'charlie',
                email: 'charlie@example.com',
                password: 'pass',
                name: 'Charlie',
                slug: 'charlie',
                bio: 'Charlie bio'
            });

            // Test $in operator
            const inUsers = await adapter.users.find({
                _id: {$in: [user1._id, user3._id]}
            });
            expect(inUsers.length).toBe(2);
            expect(inUsers.map(u => u.username).sort()).toEqual(['alice', 'charlie']);

            // Test $ne operator
            const notBob = await adapter.users.find({
                _id: {$ne: user2._id}
            });
            expect(notBob.length).toBe(2);
            expect(notBob.every(u => u.username !== 'bob')).toBe(true);
        });

        it('should update a user', async () => {
            const created = await adapter.users.create({
                username: 'updateme',
                email: 'update@example.com',
                password: 'oldpass',
                name: 'Old Name',
                slug: 'old-name',
                bio: 'Old bio'
            });

            const updated = await adapter.users.updateOne(
                {_id: created._id},
                {
                    name: 'New Name',
                    bio: 'New bio'
                }
            );

            expect(updated).toBeDefined();
            expect(updated?.name).toBe('New Name');
            expect(updated?.bio).toBe('New bio');
            expect(updated?.username).toBe('updateme'); // unchanged
            expect(updated?.email).toBe('update@example.com'); // unchanged
            expect(updated?.updatedAt).toBeGreaterThan(created.updatedAt);
        });

        it('should delete a user', async () => {
            const created = await adapter.users.create({
                username: 'deleteme',
                email: 'delete@example.com',
                password: 'pass',
                name: 'Delete Me',
                slug: 'delete-me',
                bio: 'Delete me bio'
            });

            const deleted = await adapter.users.deleteOne({_id: created._id});
            expect(deleted).toBeDefined();
            expect(deleted?._id).toBe(created._id);

            const found = await adapter.users.findById(created._id);
            expect(found).toBeNull();
        });

        it('should delete multiple users', async () => {
            const user1 = await adapter.users.create({
                username: 'temp1',
                email: 'temp1@example.com',
                password: 'pass',
                name: 'Temp 1',
                slug: 'temp-1',
                bio: 'Temp 1 bio',
                permissions: ['users:read'] as Permission[]
            });

            const user2 = await adapter.users.create({
                username: 'temp2',
                email: 'temp2@example.com',
                password: 'pass',
                name: 'Temp 2',
                slug: 'temp-2',
                bio: 'Temp 2 bio',
                permissions: ['users:read'] as Permission[]
            });

            const user3 = await adapter.users.create({
                username: 'keeper',
                email: 'keeper@example.com',
                password: 'pass',
                name: 'Keeper',
                slug: 'keeper',
                bio: 'Keeper bio',
                permissions: ['users:create'] as Permission[]
            });

            const deletedCount = await adapter.users.delete({
                permissions: {$in: ['users:read' as Permission]}
            });

            // Only user2 has 'temp:user', user1 gets 'all:all' as first user
            expect(deletedCount).toBe(1);

            const remaining = await adapter.users.find({});
            expect(remaining.length).toBe(2);
            // First user gets all:all, only user2 deleted
            expect(remaining.map(u => u.username).sort()).toEqual(['keeper', 'temp1']);
        });

        it('should count users with filters', async () => {
            for (let i = 0; i < 5; i++) {
                await adapter.users.create({
                    username: `user${i}`,
                    email: `user${i}@example.com`,
                    password: 'pass',
                    name: `User ${i}`,
                    slug: `user-${i}`,
                    bio: `User ${i} bio`,
                    permissions: i < 2 ? ['all:all' as Permission] : []
                });
            }

            const totalCount = await adapter.users.count({});
            expect(totalCount).toBe(5);

            const adminCount = await adapter.users.count({
                permissions: {$in: ['all:all' as Permission]}
            });
            // Only the first two users have 'all:all'
            expect(adminCount).toBe(2);
        });

        it('should handle pagination options', async () => {
            for (let i = 0; i < 10; i++) {
                await adapter.users.create({
                    username: `user${i.toString().padStart(2, '0')}`,
                    email: `user${i}@example.com`,
                    password: 'pass',
                    name: `User ${i}`,
                    slug: `user-${i}`,
                    bio: `User ${i} bio`
                });
            }

            // Test limit
            const limited = await adapter.users.find({}, {limit: 5});
            expect(limited.length).toBe(5);

            // Test skip
            const skipped = await adapter.users.find({}, {skip: 7});
            expect(skipped.length).toBe(3);

            // Test skip + limit
            const paginated = await adapter.users.find({}, {skip: 3, limit: 4});
            expect(paginated.length).toBe(4);

            // Test sort
            const sorted = await adapter.users.find({}, {
                sort: {username: -1},
                limit: 3
            });
            expect(sorted[0].username).toBe('user09');
            expect(sorted[1].username).toBe('user08');
            expect(sorted[2].username).toBe('user07');
        });

        it('should handle projection', async () => {
            await adapter.users.create({
                username: 'fulluser',
                email: 'full@example.com',
                password: 'secret',
                name: 'Full User',
                slug: 'full-user',
                bio: 'Full bio',
                permissions: ['blogs:read'] as Permission[]
            });

            const projected = await adapter.users.find(
                {username: 'fulluser'},
                {
                    projection: {
                        _id: 1,
                        username: 1,
                        email: 1,
                        name: 1
                    }
                }
            );

            expect(projected.length).toBe(1);
            const user = projected[0];
            expect(user.username).toBe('fulluser');
            expect(user.email).toBe('full@example.com');
            expect(user.name).toBe('Full User');
        });
    });
});