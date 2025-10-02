import type {PluginSettings} from "@supergrowthai/types/server";

// Define default settings with their keys and values
export const DEFAULT_SETTINGS = [
    {
        key: "BLOG_BASE_DOMAIN",
        value: "localhost:3000"
    },
    {
        key: "BLOG_BASE_PATH",
        value: "/blog/{blog_slug}"
    }
];

/**
 * Initialize default settings using the settings SDK
 * @param settings PluginSettings instance for system settings
 */
export async function initializeDefaultSettings(settings: PluginSettings): Promise<void> {
    try {
        for (const setting of DEFAULT_SETTINGS) {
            // Check if setting already exists
            const existingValue = await settings.getGlobal(setting.key);

            if (existingValue === null) {
                await settings.setGlobal(setting.key, setting.value);
                console.log(`Created default setting: ${setting.key}`);
            }
        }
    } catch (error) {
        console.error("Error initializing default settings:", error);
    }
}