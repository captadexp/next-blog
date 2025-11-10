import {DatabaseAdapter, Permission, User, UserData} from "@supergrowthai/next-blog-types";
import crypto from "../utils/crypto.js";

/**
 * Create a default admin user with all permissions
 */
export default async function createDefaultAdminUser(db: DatabaseAdapter, password: string): Promise<User> {
    // Default admin credentials
    const username = "admin";
    const email = "admin@nextblog.local";

    // Check if this admin already exists
    const existingAdmin = await db.users.findOne({username});
    if (existingAdmin) return existingAdmin;

    // Create a user with all permissions
    const allPermissions: Permission[] = [
        'all:all',
        'blogs:all', 'blogs:list', 'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
        'categories:all', 'categories:list', 'categories:read', 'categories:create', 'categories:update', 'categories:delete',
        'tags:all', 'tags:list', 'tags:read', 'tags:create', 'tags:update', 'tags:delete',
        'users:all', 'users:list', 'users:read', 'users:create', 'users:update', 'users:delete',
        'media:all', 'media:list', 'media:read', 'media:create', 'media:update', 'media:delete'
    ];

    // Hash the password
    const hashedPassword = crypto.hashPassword(password);

    // Create user data
    const userData: UserData = {
        username,
        email,
        name: "Default Admin",
        slug: "admin",
        bio: "Default administrator account",
        password: hashedPassword,
        permissions: allPermissions,
        isSystem: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // Create the user
    return db.users.create(userData);
}