/**
 * Type definitions and augmentations for System Update Manager plugin
 */

// Payload type for checkSystemUpdate RPC response
export interface SystemUpdateStatus {
    migrationNeeded: boolean;
    currentVersion: string;
    storedVersion: string;
    hasMigrated: boolean;
    targetVersion: string;
    checkedAt: string;
}

// Payload type for runSystemMigration RPC response
export interface SystemMigrationResult {
    migrated: boolean;
    fromVersion?: string;
    toVersion?: string;
    migratedAt?: string;
    reason?: string;
    error?: string;
}

// Augment the RPCMethods interface from @supergrowthai/types
// Note: The SDK's callRPC already wraps responses in {code, message, payload}
// So RPCMethods[T]['response'] should just be the payload type
declare module '@supergrowthai/plugin-dev-kit' {
    interface RPCMethods {
        'system-update-manager:checkSystemUpdate': {
            request: {};
            response: { code: 200 | 500, message: string, payload: SystemUpdateStatus };
        };
        'system-update-manager:runSystemMigration': {
            request: {};
            response: { code: 200 | 500, message: string, payload: SystemMigrationResult };
        };
    }
}