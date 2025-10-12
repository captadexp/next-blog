import {defineServer} from '@supergrowthai/plugin-dev-kit';
import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import type {SystemMigrationResult, SystemUpdateStatus} from './types';
import './types'; // Ensure type augmentation is loaded

// Server-side hooks that run in Node.js
export default defineServer({
    hooks: {
        // System initialization hook - detects version changes (detect only, idempotent)
        'plugins:loaded': async (sdk, payload) => {
            sdk.log.info('System initialization - checking version...');

            try {

                // Read current version from SDK system
                const currentVersion = sdk.system.version;

                // Get stored system version and migration flag from global settings
                const storedVersion = await sdk.settings.getGlobal('system:update:version');
                const hasMigrated = await sdk.settings.getGlobal('system:update:has-migrated');

                sdk.log.info(`[Detection] storedVersion: ${storedVersion}, currentVersion: ${currentVersion}, hasMigrated: ${hasMigrated}`);

                // Check if version has changed
                if (storedVersion !== currentVersion) {
                    sdk.log.info(`[System Update] Version change detected: ${storedVersion || 'unknown'} → ${currentVersion}`);

                    // Set migration flag to false when version changes
                    await sdk.settings.setGlobal('system:update:has-migrated', false);

                    // Store the target version that needs migration (not the migrated version)
                    await sdk.settings.setGlobal('system:update:target-version', currentVersion);

                    // Store update detection timestamp
                    await sdk.settings.setGlobal('system:update:detected-at', Date.now());

                    sdk.log.info(`[System Update] Migration required - system-has-migrated set to false, target version: ${currentVersion}`);
                } else if (storedVersion === currentVersion) {
                    // Optionally ensure system-has-migrated is true if versions match
                    if (hasMigrated === false) {
                        // This shouldn't normally happen, but ensure consistency
                        await sdk.settings.setGlobal('system:update:has-migrated', true);
                    }
                }

                return {success: true, message: 'System initialization completed'};
            } catch (error) {
                sdk.log.error('[System Init] Failed to check version on initialization:', error);
                return {success: false, message: 'System initialization failed'};
            }
        },

        // System update hook - performs the actual migration work (idempotent)
        'system:update': async (sdk, payload) => {
            sdk.log.info(`[Migration start] fromVersion: ${payload.fromVersion}, toVersion: ${payload.toVersion}`);

            // Perform schema/data migrations from fromVersion to toVersion
            // This should be idempotent - safe to re-run
            // Add actual migration logic here when needed

            // Store update timestamp (this is separate from version management)
            await sdk.settings.setGlobal('system:update:last-update-at', payload.timestamp);

            sdk.log.info(`[Migration stop] Successfully migrated from ${payload.fromVersion} to ${payload.toVersion}`);

            // Return success marker - do NOT change version flags here (that's the RPC's job)
            return {success: true, message: 'System update processed'};
        }
    },
    rpcs: {
        // Check if migration is needed (read-only, no writes)
        'system-update-manager:checkSystemUpdate': async (sdk: ServerSDK, _request: {}) => {
            sdk.log.info('Checking system update status...');

            try {
                // Read all values - NO WRITES in this RPC
                const storedVersion = await sdk.settings.getGlobal('system:update:version');
                const currentVersion = sdk.system.version;
                const hasMigrated = await sdk.settings.getGlobal('system:update:has-migrated');
                const targetVersion = await sdk.settings.getGlobal('system:update:target-version');

                // Compute migration needed: either version mismatch OR hasMigrated is false
                const migrationNeeded = (storedVersion !== currentVersion) || (hasMigrated === false);

                // Use target version if set, otherwise current version
                const effectiveTargetVersion = targetVersion || currentVersion;

                const payload: SystemUpdateStatus = {
                    migrationNeeded,
                    currentVersion: currentVersion,
                    storedVersion: storedVersion || '0.0.0', // Default only for display
                    hasMigrated: hasMigrated, // Return boolean as stored, don't coerce undefined to true
                    targetVersion: effectiveTargetVersion,
                    checkedAt: new Date().toISOString()
                };

                return {
                    code: 200,
                    message: migrationNeeded ? 'Migration needed' : 'System is up to date',
                    payload
                };

            } catch (error) {
                sdk.log.error('Error checking system update status:', error);
                // Return error in payload but with migrated: false for error case
                const errorPayload: SystemUpdateStatus = {
                    migrationNeeded: false,
                    currentVersion: '',
                    storedVersion: '',
                    hasMigrated: false,
                    targetVersion: '',
                    checkedAt: new Date().toISOString()
                };
                return {
                    code: 500,
                    message: 'Error checking system update status: ' + (error instanceof Error ? error.message : 'Unknown error'),
                    payload: errorPayload
                };
            }
        },

        // Run migration (performs the actual update)
        'system-update-manager:runSystemMigration': async (sdk: ServerSDK, _request: any) => {
            sdk.log.info('Running system migration...');

            try {
                // Re-read fresh state to avoid stale decisions
                const storedVersion = await sdk.settings.getGlobal('system:update:version') || '0.0.0';
                const currentVersion = sdk.system.version;
                const hasMigrated = await sdk.settings.getGlobal('system:update:has-migrated');

                sdk.log.info(`[Migration check] storedVersion: ${storedVersion}, currentVersion: ${currentVersion}, hasMigrated: ${hasMigrated}`);

                // Guard clauses - check if migration is needed
                if (storedVersion === currentVersion && hasMigrated !== false) {
                    const payload: SystemMigrationResult = {
                        migrated: false,
                        reason: 'Already migrated - versions match and hasMigrated is not false'
                    };
                    return {
                        code: 200,
                        message: 'No migration needed',
                        payload
                    };
                }

                // Proceed if hasMigrated === false OR storedVersion !== currentVersion
                if (hasMigrated === false || storedVersion !== currentVersion) {
                    sdk.log.info(`[Migration start] Processing migration: ${storedVersion} → ${currentVersion}`);

                    // Execute migration by calling hook
                    await sdk.callHook('system:update', {
                        fromVersion: storedVersion,
                        toVersion: currentVersion,
                        timestamp: Date.now()
                    });

                    // On success (and only then), atomically update all flags
                    // Only now do we update system:update:version to the current version
                    await sdk.settings.setGlobal('system:update:version', currentVersion);
                    await sdk.settings.setGlobal('system:update:has-migrated', true);

                    // Clear target version since migration is complete
                    await sdk.settings.setGlobal('system:update:target-version', null);

                    // Store migration timestamp
                    await sdk.settings.setGlobal('system:update:last-migration-at', Date.now());

                    sdk.log.info(`[Migration stop] Successfully migrated from ${storedVersion} to ${currentVersion}`);

                    const payload: SystemMigrationResult = {
                        migrated: true,
                        fromVersion: storedVersion,
                        toVersion: currentVersion,
                        migratedAt: new Date().toISOString()
                    };

                    return {
                        code: 200,
                        message: 'Migration completed successfully',
                        payload
                    };
                }

                // Shouldn't reach here, but handle it
                const payload: SystemMigrationResult = {
                    migrated: false,
                    reason: 'Conditions not met for migration'
                };
                return {
                    code: 200,
                    message: 'No migration needed',
                    payload
                };

            } catch (error) {
                sdk.log.error('Error running system migration:', error);
                // On failure: ensure hasMigrated stays/becomes false
                // Leave system:update:version unchanged
                await sdk.settings.setGlobal('system:update:has-migrated', false);

                const payload: SystemMigrationResult = {
                    migrated: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
                return {
                    code: 500,
                    message: 'Error running system migration',
                    payload
                };
            }
        }
    }
});