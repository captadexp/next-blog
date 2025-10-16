import type {AuthResult, IAuthHandler, OneApiRequest, OneApiResponse} from "@supergrowthai/oneapi";
import type {DatabaseAdapter, Permission, User, UserData} from "@supergrowthai/next-blog-types/server";
import crypto from "../utils/crypto.js";

/**
 * Create a default admin user with all permissions
 */
async function createDefaultAdminUser(db: DatabaseAdapter, password: string): Promise<User> {
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
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    // Create the user
    return db.users.create(userData);
}

/**
 * Basic Authentication handler for oneapi
 * Handles HTTP Basic Auth for Next.js Blog CMS
 */
export class BasicAuthHandler implements IAuthHandler<{ username: string, password: string }, User, {
    user: User | null,
    isAuthenticated: boolean
}> {
    constructor(private db: () => Promise<DatabaseAdapter>) {
    }

    async login(credentials: {
        username: string,
        password: string
    }, req: OneApiRequest, res?: OneApiResponse | null): Promise<AuthResult<User>> {
        const {username, password} = credentials;

        if (!username || !password) {
            return {
                success: false,
                error: "Username and password are required"
            };
        }

        const db = await this.db();

        // Find user with the provided username
        const user = await db.users.findOne({username});

        if (!user) {
            return {
                success: false,
                error: "Invalid credentials"
            };
        }

        // Verify password
        if (!crypto.comparePassword(password, user.password)) {
            return {
                success: false,
                error: "Invalid credentials"
            };
        }

        return {
            success: true,
            user
        };
    }

    async logout(req: OneApiRequest, res?: OneApiResponse | null): Promise<void> {
        // Basic auth doesn't maintain sessions, so logout is a no-op
        // The client should stop sending the Authorization header
    }

    async getUser(req: OneApiRequest, res?: OneApiResponse | null): Promise<User | null> {
        // Parse Basic Auth header - handle both Headers and plain object
        let authHeader: string | undefined;

        if (req.headers) {
            if (typeof req.headers === 'object' && 'get' in req.headers) {
                // Headers object (Next.js style)
                authHeader = (req.headers as any).get?.('authorization') || (req.headers as any).get?.('Authorization');
            } else {
                // Plain object
                authHeader = (req.headers as any).authorization || (req.headers as any).Authorization;
            }
        }

        if (!authHeader) {
            // Set WWW-Authenticate header to prompt for Basic Auth
            res?.setHeader('WWW-Authenticate', 'Basic realm="next-blog CMS"');

            // Check if we need to create default admin
            const db = await this.db();
            const hasUser = await db.users.findOne({});

            if (!hasUser || hasUser.email === "admin@nextblog.local") {
                const adminUser = await createDefaultAdminUser(db, "password");

                console.log("\n" + "=".repeat(80));
                console.log("=".repeat(20) + " DEFAULT ADMIN USER CREATED " + "=".repeat(20));
                console.log("=".repeat(80));
                console.log(`Username: ${adminUser.username}`);
                console.log(`Password: password`);
                console.log(`Email: ${adminUser.email}`);
                console.log("IMPORTANT: Please change these credentials immediately after first login!");
                console.log("=".repeat(80) + "\n");
            }

            return null;
        }

        const [authMethod, authData] = authHeader.split(" ");

        if (authMethod !== 'Basic') {
            return null;
        }

        try {
            const decoded = Buffer.from(authData, 'base64').toString();
            const [username, password] = decoded.split(':');

            const result = await this.login({username, password}, req, res);

            if (result.success) {
                return result.user;
            }
        } catch (error) {
            console.error("Error parsing basic auth:", error);
        }

        return null;
    }

    async isAuthenticated(req: OneApiRequest, res?: OneApiResponse | null): Promise<boolean> {
        const user = await this.getUser(req, res);
        return user !== null;
    }

    async updateUser(user: User, req: OneApiRequest, res?: OneApiResponse | null): Promise<void> {
        // Basic auth doesn't maintain sessions, so this is a no-op
        // The user data is fetched fresh on each request
    }

    async getSession(req: OneApiRequest, res?: OneApiResponse | null): Promise<{
        user: User | null,
        isAuthenticated: boolean
    }> {
        // For basic auth, we return a simple session object with the user
        const user = await this.getUser(req, res);
        return {
            user,
            isAuthenticated: user !== null
        };
    }
}