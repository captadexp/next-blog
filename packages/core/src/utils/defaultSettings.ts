import {BrandedId, createId, DatabaseAdapter, Plugin, User} from "@supergrowthai/next-blog-types/server";
import {StorageFactory} from "../storage/storage-factory.ts";
import pluginManager from "../plugins/pluginManager.ts";

// Cache for system IDs
let cachedSystemUserId: string | null = null;
let cachedSystemPluginId: string | null = null;

/**
 * Get or create the system user
 * @param db Database adapter
 */
export async function getOrCreateSystemUser(db: DatabaseAdapter): Promise<User> {
    // Check if system user already exists
    let systemUser = await db.users.findOne({username: 'system'});

    if (!systemUser) {
        // Create system user - let the database generate the ID naturally
        systemUser = await db.users.create({
            username: 'system',
            email: 'system@localhost',
            password: '', // System user doesn't need a password
            name: 'System',
            slug: 'system',
            bio: 'System user for internal operations',
            permissions: ['all:all'], // System user has all permissions
            isSystem: true
        });
        console.log('Created system user with ID:', systemUser._id);
    }

    cachedSystemUserId = systemUser._id;
    return systemUser;
}

/**
 * Get or create the system plugin
 * @param db Database adapter
 */
export async function getOrCreateSystemPlugin(db: DatabaseAdapter): Promise<Plugin> {
    let systemPlugin = await db.plugins.findOne({id: 'system'});

    if (!systemPlugin) {
        await pluginManager.installAllInternalPlugins(db);
        console.log('Installed internal plugins');
        systemPlugin = await db.plugins.findOne({id: 'system'});
    }

    cachedSystemPluginId = systemPlugin!._id;
    return systemPlugin!;
}

/**
 * Get the system user ID (fetches from DB if not cached)
 */
export async function getSystemUserId(db: DatabaseAdapter): Promise<BrandedId<"User">> {
    if (cachedSystemUserId) {
        return createId.user(cachedSystemUserId);
    }

    const systemUser = await getOrCreateSystemUser(db);
    return systemUser._id;
}

/**
 * Get the system plugin ID (fetches from DB if not cached)
 */
export async function getSystemPluginId(db: DatabaseAdapter): Promise<BrandedId<"Plugin">> {
    if (cachedSystemPluginId) {
        return createId.plugin(cachedSystemPluginId);
    }

    const systemPlugin = await getOrCreateSystemPlugin(db);
    return systemPlugin._id;
}

/**
 * Initialize system components
 * @param db Database adapter
 */
export async function initializeSystem(db: DatabaseAdapter): Promise<void> {
    try {
        await getOrCreateSystemUser(db);
        await getOrCreateSystemPlugin(db);

        // Initialize storage settings
        await StorageFactory.initializeDefaultSettings(db);
    } catch (error) {
        console.error("Error initializing system components:", error);
    }
}