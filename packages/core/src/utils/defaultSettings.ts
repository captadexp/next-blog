import {DatabaseAdapter, SettingsEntryData} from "../types.js";

// Define default settings with their keys, values, and owner
export const DEFAULT_SETTINGS: SettingsEntryData[] = [
    {
        key: "BLOG_BASE_DOMAIN",
        value: "localhost:3000",
        owner: "system"
    },
    {
        key: "BLOG_BASE_PATH",
        value: "/blog/{blog_slug}",
        owner: "system"
    }
];

/**
 * Initialize default settings in the database if they don't exist
 * @param db DatabaseAdapter instance
 */
export async function initializeDefaultSettings(db: DatabaseAdapter): Promise<void> {
    //todo we could leverage some caching strategy here to avoid doing this round trip everytime
    try {
        console.log("Initializing default settings...");

        const existingSettings = await db.settings.find({});

        const existingSettingsMap = new Map<string, boolean>();
        existingSettings.forEach(setting => {
            existingSettingsMap.set(setting.key, true);
        });

        const settingsToCreate = DEFAULT_SETTINGS.filter(setting => !existingSettingsMap.has(setting.key));

        if (settingsToCreate.length > 0) {
            console.log(`Creating ${settingsToCreate.length} default settings...`);

            for (const setting of settingsToCreate) {
                await db.settings.create({...setting, updatedAt: Date.now(), createdAt: Date.now()});
                console.log(`Created default setting: ${setting.key}`);
            }
        } else {
            console.log("All default settings already exist.");
        }
    } catch (error) {
        console.error("Error initializing default settings:", error);
    }
}