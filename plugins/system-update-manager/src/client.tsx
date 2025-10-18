import {defineClient} from '@supergrowthai/plugin-dev-kit';
import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import type {SystemMigrationResult, SystemUpdateStatus} from './types';
import './types';
import "./styles.css"

const renderPanel = (sdk: ClientSDK) => {
    const [systemStatus, setSystemStatus] = useState<SystemUpdateStatus | null>(null);
    const [migrationResult, setMigrationResult] = useState<SystemMigrationResult | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial status on mount
    useEffect(() => {
        const fetchInitialStatus = async () => {
            try {
                const response = await sdk.callRPC('system-update-manager:checkSystemUpdate', {});

                if (response?.code === 0) {
                    const {payload} = response.payload;
                    setSystemStatus(payload);

                    // Clear old migration result when checking
                    if (!payload?.migrationNeeded) {
                        setMigrationResult(null);
                    }
                } else {
                    throw new Error(response?.message || 'Failed to check status');
                }
            } catch (err: any) {
                setError(`Failed to fetch initial status: ${err.message}`);
                console.error('Initial status check failed:', err);
            } finally {
                setIsChecking(false);
            }
        };

        fetchInitialStatus();
    }, [sdk]);

    const checkForUpdates = async () => {
        if (isChecking) return;

        setIsChecking(true);
        setError(null);

        try {
            const response = await sdk.callRPC('system-update-manager:checkSystemUpdate', {});

            if (response?.code === 0) {
                const {payload} = response.payload;
                setSystemStatus(payload);

                // Clear old migration result when checking
                if (!payload?.migrationNeeded) {
                    setMigrationResult(null);
                }

                if (payload?.migrationNeeded) {
                    sdk.notify('Migration needed for new version', 'warning');
                } else {
                    sdk.notify('System is up to date', 'info');
                }
            } else {
                throw new Error(response?.message || 'Failed to check for updates');
            }
        } catch (err: any) {
            const errorMsg = `Update check failed: ${err.message}`;
            setError(errorMsg);
            sdk.notify(errorMsg, 'error');
        } finally {
            setIsChecking(false);
        }
    };

    const runMigration = async () => {
        if (isMigrating) return;

        setIsMigrating(true);
        setIsChecking(true);
        setError(null);

        try {
            const response = await sdk.callRPC('system-update-manager:runSystemMigration', {});

            if (response?.code === 0) {
                const {payload} = response.payload;
                setMigrationResult(payload);

                if (payload?.migrated) {
                    sdk.notify(
                        `Migration completed: ${payload.fromVersion} → ${payload.toVersion}`,
                        'success'
                    );
                    // Re-check status after successful migration
                    setSystemStatus(null);
                    setError(null);
                    // Re-fetch status after migration
                    await checkForUpdates();
                } else {
                    sdk.notify(payload?.reason || 'No migration needed', 'info');
                }
            } else {
                throw new Error(response?.message || 'Migration failed');
            }
        } catch (err: any) {
            const errorMsg = `Migration failed: ${err.message}`;
            setError(errorMsg);
            sdk.notify(errorMsg, 'error');
        } finally {
            setIsMigrating(false);
            setIsChecking(false);
        }
    };

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