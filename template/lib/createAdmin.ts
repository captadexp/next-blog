import crypto from "crypto";
import type {DatabaseAdapter, Permission, UserData} from "@supergrowthai/next-blog";

const encryptPassword = (password: string, salt: string) => {
    return crypto.scryptSync(password, salt, 32).toString('hex');
};

export const hashPassword = (password: string): string => {
    const salt = crypto.randomBytes(16).toString('hex');
    return encryptPassword(password, salt) + salt;
};

function slugify(str:string) {
    return str.toLowerCase().replace(/\s+/g, "-");
}

export async function createAdminUser(db: DatabaseAdapter) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME || "DEMO-DEMO-DEMO" ;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "demo-demo";

    if (!adminEmail || !adminPassword) {
        throw new Error("Missing required ADMIN_* env variables");
    }

    try {
        const existingAdmin = await db.users.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log("Admin already exists, skipping creation");
            return;
        }

        const now = Date.now();
        const passwordHash = hashPassword(adminPassword);
        const slug = slugify(adminUsername);

        const allPermissions: Permission[] = [
            'all:all',
            'blogs:all', 'blogs:list', 'blogs:read', 'blogs:create', 'blogs:update', 'blogs:delete',
            'categories:all', 'categories:list', 'categories:read', 'categories:create', 'categories:update', 'categories:delete',
            'tags:all', 'tags:list', 'tags:read', 'tags:create', 'tags:update', 'tags:delete',
            'users:all', 'users:list', 'users:read', 'users:create', 'users:update', 'users:delete',
            'media:all', 'media:list', 'media:read', 'media:create', 'media:update', 'media:delete'
        ];

        const adminUser: UserData = {
            username: adminUsername,
            email: adminEmail,
            name: adminName,
            slug,
            bio: "Default administrator account",
            password: passwordHash,
            permissions: allPermissions,
            isSystem: false,
            createdAt: now,
            updatedAt: now,
        };

        await db.users.create(adminUser);
        console.log("Admin user created");

    } catch (err) {
        console.error("Error creating admin:", err);
    }
}

