import {defineClient} from '@supergrowthai/plugin-dev-kit';
import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import type {SystemMigrationResult, SystemUpdateStatus} from './types';
import './types';

interface PluginState {
    systemStatus: SystemUpdateStatus | null;
    migrationResult: SystemMigrationResult | null;
    isChecking: boolean;
    isMigrating: boolean;
    error: string | null;
    latestSdk: ClientSDK | null;
}

// Plugin state management
const pluginState: PluginState = {
    systemStatus: null,
    migrationResult: null,
    isChecking: false,
    isMigrating: false,
    error: null,
    latestSdk: null,
};

const fetchInitialStatus = async () => {
    // Prevent multiple initial fetches
    if (
        pluginState.isChecking ||
        pluginState.systemStatus !== null ||
        pluginState.error !== null
    ) {
        return;
    }

    pluginState.isChecking = true;
    pluginState.latestSdk?.refresh();

    try {
        const response = await pluginState.latestSdk?.callRPC('system-update-manager:checkSystemUpdate', {});

        if (response?.code === 0) {
            const {payload} = response.payload;
            pluginState.systemStatus = payload;

            // Clear old migration result when checking
            if (!payload?.migrationNeeded) {
                pluginState.migrationResult = null;
            }
        } else {
            throw new Error(response?.message || 'Failed to check status');
        }
    } catch (err: any) {
        pluginState.error = `Failed to fetch initial status: ${err.message}`;
        console.error('Initial status check failed:', err);
    } finally {
        pluginState.isChecking = false;
        pluginState.latestSdk?.refresh();
    }
};

const checkForUpdates = async () => {
    if (pluginState.isChecking) return;

    pluginState.isChecking = true;
    pluginState.error = null;
    pluginState.latestSdk?.refresh();

    try {
        const response = await pluginState.latestSdk?.callRPC('system-update-manager:checkSystemUpdate', {});

        if (response?.code === 0) {
            const {payload} = response.payload;
            pluginState.systemStatus = payload;

            // Clear old migration result when checking
            if (!payload?.migrationNeeded) {
                pluginState.migrationResult = null;
            }

            if (payload?.migrationNeeded) {
                pluginState.latestSdk?.notify('Migration needed for new version', 'warning');
            } else {
                pluginState.latestSdk?.notify('System is up to date', 'info');
            }
        } else {
            throw new Error(response?.message || 'Failed to check for updates');
        }
    } catch (err: any) {
        pluginState.error = `Update check failed: ${err.message}`;
        pluginState.latestSdk?.notify(pluginState.error, 'error');
    } finally {
        pluginState.isChecking = false;
        pluginState.latestSdk?.refresh();
    }
};

const runMigration = async () => {
    if (pluginState.isMigrating) return;

    pluginState.isMigrating = true;
    pluginState.isChecking = true;
    pluginState.error = null;
    pluginState.latestSdk?.refresh();

    try {
        const response = await pluginState.latestSdk?.callRPC('system-update-manager:runSystemMigration', {});

        if (response?.code === 0) {
            const {payload} = response.payload;
            pluginState.migrationResult = payload;

            if (payload?.migrated) {
                pluginState.latestSdk?.notify(
                    `Migration completed: ${payload.fromVersion} → ${payload.toVersion}`,
                    'success'
                );
                // Re-check status after successful migration
                pluginState.systemStatus = null;
                pluginState.error = null;
                // Small delay to ensure state propagation
                setTimeout(() => fetchInitialStatus(), 100);
            } else {
                pluginState.latestSdk?.notify(payload?.reason || 'No migration needed', 'info');
            }
        } else {
            throw new Error(response?.message || 'Migration failed');
        }
    } catch (err: any) {
        pluginState.error = `Migration failed: ${err.message}`;
        pluginState.latestSdk?.notify(pluginState.error, 'error');
    } finally {
        pluginState.isMigrating = false;
        pluginState.isChecking = false;
        pluginState.latestSdk?.refresh();
    }
};

const renderPanel = (sdk: ClientSDK) => {
    pluginState.latestSdk = sdk;

    // Trigger initial status fetch
    setTimeout(() => fetchInitialStatus(), 0);

    const {systemStatus, migrationResult, isChecking, isMigrating, error} = pluginState;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">System Update Manager</h1>

            {/* System Status Card */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">System Status</h2>

                <div className="space-y-4">
                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Current Version</p>
                            <p className="font-medium">
                                {systemStatus?.currentVersion || (isChecking ? 'Checking...' : 'Loading...')}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${
                                systemStatus?.migrationNeeded ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></span>
                            <span className="text-sm">
                                {systemStatus?.migrationNeeded ? 'Migration Needed' : 'Up to Date'}
                            </span>
                        </div>
                    </div>

                    {/* Migration Warning */}
                    {systemStatus?.migrationNeeded && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm font-medium text-yellow-900 mb-1">Migration Required</p>
                            <p className="text-sm text-yellow-700">
                                Version changed from {systemStatus.storedVersion} to {systemStatus.currentVersion}
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                                Click "Run Migration" to apply system updates
                            </p>
                        </div>
                    )}

                    {/* Migration Success */}
                    {migrationResult?.migrated && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-medium text-green-900">Migration Completed</p>
                            <p className="text-sm text-green-700">
                                {migrationResult.fromVersion} → {migrationResult.toVersion}
                            </p>
                            {migrationResult.migratedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                    Completed at {new Date(migrationResult.migratedAt).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Last Check Info */}
                    {systemStatus?.checkedAt && !systemStatus.migrationNeeded && (
                        <div className="text-sm text-gray-600">
                            <p>Last checked: {new Date(systemStatus.checkedAt).toLocaleString()}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        {systemStatus?.migrationNeeded ? (
                            <button
                                className={`px-4 py-2 rounded font-medium ${
                                    isMigrating
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                }`}
                                onClick={runMigration}
                                disabled={isMigrating}
                            >
                                {isMigrating ? 'Running Migration...' : 'Run Migration'}
                            </button>
                        ) : (
                            <button
                                className={`px-4 py-2 rounded font-medium ${
                                    isChecking
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                                onClick={checkForUpdates}
                                disabled={isChecking}
                            >
                                {isChecking ? 'Checking...' : 'Check for Updates'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default defineClient({
    hooks: {
        'system:plugin:settings-panel': renderPanel
    },
    hasSettingsPanel: true,
});