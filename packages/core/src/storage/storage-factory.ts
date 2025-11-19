import type {DatabaseAdapter, StorageAdapter} from '@supergrowthai/next-blog-types/server';
import {createId} from '@supergrowthai/next-blog-types/server';
import {LocalStorageAdapter} from './LocalStorageAdapter.js';
import {S3StorageAdapter} from './S3StorageAdapter.js';
import {decrypt} from '../utils/crypto.js';

/**
 * Factory for creating appropriate storage adapters based on configuration
 */
export class StorageFactory {
    /**
     * Create a storage adapter based on settings
     */
    static async create(
        pluginId: string,
        db: DatabaseAdapter
    ): Promise<StorageAdapter> {
        try {
            // Fetch all storage settings in a single query
            const storageSettings = await db.settings.find({
                key: {
                    $in: [
                        'storage:type',
                        'storage:s3:access_key',
                        'storage:s3:secret_key',
                        'storage:s3:region',
                        'storage:s3:bucket',
                        'storage:s3:base_path',
                        'storage:s3:cdn_hostname'
                    ]
                }
            });

            // Convert array to key-value map for easy access, decrypting secure values
            const settingsMap = storageSettings.reduce((acc, setting) => {
                // Decrypt secure settings
                if (setting.isSecure && setting.value) {
                    acc[setting.key] = decrypt(setting.value);
                } else {
                    acc[setting.key] = setting.value;
                }
                return acc;
            }, {} as Record<string, any>);

            if (settingsMap['storage:type'] === 's3') {
                // Validate required S3 settings
                const accessKey = settingsMap['storage:s3:access_key'];
                const secretKey = settingsMap['storage:s3:secret_key'];
                const region = settingsMap['storage:s3:region'];
                const bucket = settingsMap['storage:s3:bucket'];
                const basePath = settingsMap['storage:s3:base_path'];
                const cdnHostname = settingsMap['storage:s3:cdn_hostname'];

                if (!accessKey || !secretKey || !region || !bucket) {
                    console.warn('S3 storage configured but missing required settings!');
                    throw new Error('S3 storage configured but missing required settings!')
                }

                return new S3StorageAdapter(pluginId, {
                    accessKey: String(accessKey),
                    secretKey: String(secretKey),
                    region: String(region),
                    bucket: String(bucket),
                    basePath: basePath ? String(basePath) : undefined,
                    cdnHostname: cdnHostname ? String(cdnHostname) : undefined
                });
            }
        } catch (error) {
            console.error(`Error creating storage adapter for ${pluginId}:`, error);
        }

        // Default to local storage
        return new LocalStorageAdapter(pluginId);
    }

    /**
     * Initialize default storage settings if they don't exist
     */
    static async initializeDefaultSettings(db: DatabaseAdapter): Promise<void> {
        try {
            // Get system plugin ID for global settings
            const systemPlugin = await db.plugins.findOne({id: 'system'});
            if (!systemPlugin) {
                console.warn('System plugin not found, skipping storage settings initialization');
                return;
            }

            const systemPluginId = createId.plugin(systemPlugin._id);

            // Default storage settings
            const defaultSettings = [
                {
                    key: 'storage:type',
                    value: 'local',
                    description: 'Storage type (local or s3)',
                    isSecure: false
                },
                {
                    key: 'storage:s3:access_key',
                    value: '',
                    description: 'AWS S3 Access Key',
                    isSecure: true
                },
                {
                    key: 'storage:s3:secret_key',
                    value: '',
                    description: 'AWS S3 Secret Key',
                    isSecure: true
                },
                {
                    key: 'storage:s3:region',
                    value: '',
                    description: 'AWS S3 Region',
                    isSecure: true
                },
                {
                    key: 'storage:s3:bucket',
                    value: '',
                    description: 'AWS S3 Bucket Name',
                    isSecure: true
                },
                {
                    key: 'storage:s3:base_path',
                    value: 'plugin-storage',
                    description: 'Base path in S3 bucket for plugin storage',
                    isSecure: false
                },
                {
                    key: 'storage:s3:cdn_hostname',
                    value: '',
                    description: 'CDN hostname for S3 URLs (e.g., cdn.example.com)',
                    isSecure: false
                }
            ];

            // Create settings that don't exist
            for (const setting of defaultSettings) {
                const existing = await db.settings.findOne({key: setting.key});
                if (!existing) {
                    await db.settings.create({
                        key: setting.key,
                        value: setting.value,
                        ownerId: systemPluginId,
                        ownerType: 'plugin',
                        isSecure: setting.isSecure
                    });
                    console.log(`Created default storage setting: ${setting.key}`);
                }
            }
        } catch (error) {
            console.error('Error initializing storage settings:', error);
        }
    }
}