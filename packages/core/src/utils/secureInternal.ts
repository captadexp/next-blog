import {headers} from "next/headers";
import {NextResponse} from "next/server";
import {CNextRequest, DatabaseProvider, Permission, User, UserData} from "../types";
import crypto from "./crypto";
import {hasPermission, hasAnyPermission} from "./permissions";

type SecureOptions = {
    requirePermission?: Permission;
    requireAnyPermission?: Permission[];
};

/**
 * Create a default admin user with all permissions
 */
async function createDefaultAdminUser(db: DatabaseProvider, password: string) {
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
        'users:all', 'users:list', 'users:read', 'users:create', 'users:update', 'users:delete'
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
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // Create the user
    return db.users.create(userData);
}

/**
 * Middleware to secure an endpoint with authentication and optional permission checking
 * @param fn The handler function to secure
 * @param options Optional configuration for permission requirements
 */
export default function secure<T>(
    fn: (request: CNextRequest) => T,
    options?: SecureOptions
) {
    return async (request: CNextRequest) => {
        const headerList = await headers()
        const [authMethod, authData] = headerList.get("authorization")?.split(" ") || [];

        const db = await request.db()

        // Check if there are any users
        const hasUser = await db.users.findOne({}).then(u => !!u);

        if (!hasUser) {
            const adminUser = await createDefaultAdminUser(db, "password");

            console.log("\n" + "=".repeat(80));
            console.log("=".repeat(20) + " DEFAULT ADMIN USER CREATED " + "=".repeat(20));
            console.log("=".repeat(80));
            console.log(`Username: ${adminUser.username}`);
            console.log(`Password: ${adminUser.password}`);
            console.log(`Email: ${adminUser.email}`);
            console.log("IMPORTANT: Please change these credentials immediately after first login!");
            console.log("=".repeat(80) + "\n");
        }

        if (authMethod !== 'Basic')
            return notAllowed("Authentication required")

        const decoded = Buffer.from(authData, 'base64').toString()
        const [username, password] = decoded.split(':')

        // Find user with the provided username
        let user: User | null = await db.users.findOne({username});

        if (!user) {
            // If no user was found, return not allowed
            return notAllowed("Invalid credentials");
        }

        // Verify password
        if (!(crypto.comparePassword(password, user.password))) {
            return notAllowed("Invalid credentials");
        }

        // User is authenticated - assign to request
        (request as any).sessionUser = user;

        // Check permissions if required
        if (options?.requirePermission) {
            if (!hasPermission(user, options.requirePermission)) {
                return notAllowed(
                    `Insufficient permissions. Required: ${options.requirePermission}`
                );
            }
        }

        if (options?.requireAnyPermission && options.requireAnyPermission.length > 0) {
            if (!hasAnyPermission(user, options.requireAnyPermission)) {
                return notAllowed(
                    `Insufficient permissions. Required any of: ${options.requireAnyPermission.join(', ')}`
                );
            }
        }

        console.log("User access given to", user.username);
        return fn(request);
    }
}

function notAllowed(message: string = "Unauthorized") {
    return new NextResponse(
        JSON.stringify({
            error: "Unauthorized",
            message: message
        }),
        {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Protected Page"',
                'Content-Type': 'application/json'
            }
        }
    );
}
