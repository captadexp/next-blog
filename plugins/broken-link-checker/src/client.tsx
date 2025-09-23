import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {PluginState, ScanResponse} from './types';
import {LinkReport} from './components/LinkReport';
import {ScanButton} from './components/ScanButton';
import {StatusIndicator} from './components/StatusIndicator';
import {defineClient} from "@supergrowthai/plugin-dev-kit";

// Plugin state management
const pluginState: PluginState = {
    isLoading: false,
    isScanning: false,
    report: null,
    error: null,
    latestSdk: null,
};

const fetchInitialReport = async () => {
    // Prevent multiple initial fetches
    if (
        pluginState.isLoading ||
        pluginState.report !== null ||
        pluginState.error !== null
    ) {
        return;
    }

    pluginState.isLoading = true;
    pluginState.latestSdk?.refresh();

    try {
        // Call the hook without the parameter that might trigger a full scan
        const response = await pluginState.latestSdk?.callHook('scan-broken-links', {});

        if (response.code === 0) {
            const {code, message, payload}: ScanResponse = response.payload;
            if (code !== 0) {
                throw new Error(message);
            }
            pluginState.report = payload;
        } else {
            throw new Error(response.message);
        }
    } catch (err: any) {
        pluginState.error = `Failed to fetch initial report: ${err.message}`;
    } finally {
        pluginState.isLoading = false;
        pluginState.latestSdk?.refresh();
    }
};

const startScan = async () => {
    if (pluginState.isScanning) return;

    pluginState.isScanning = true;
    pluginState.isLoading = true;
    pluginState.error = null;
    pluginState.latestSdk?.refresh();

    try {
        const response = await pluginState.latestSdk?.callHook('scan-broken-links', {
            start_scan: true
        });

        if (response.code === 0) {
            const {code, message, payload}: ScanResponse = response.payload;
            if (code !== 0) {
                throw new Error(message);
            }
            pluginState.report = payload;
            pluginState.latestSdk?.notify('Scan complete!', 'success');
        } else {
            throw new Error(response.message);
        }
    } catch (err: any) {
        pluginState.error = `Scan failed: ${err.message}`;
        pluginState.latestSdk?.notify(pluginState.error, 'error');
    } finally {
        pluginState.isScanning = false;
        pluginState.isLoading = false;
        pluginState.latestSdk?.refresh();
    }
};

const renderPanel = (sdk: ClientSDK) => {
    pluginState.latestSdk = sdk;

    // Trigger initial report fetch
    setTimeout(() => fetchInitialReport(), 0);

    const hasReport = pluginState.report && pluginState.report.length > 0;
    const showStatus = !hasReport || pluginState.isLoading || pluginState.isScanning || pluginState.error;

    return (
        <div className="p-4 border rounded-lg shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">Broken Link Checker</h3>
                <ScanButton
                    isScanning={pluginState.isScanning}
                    onClick={startScan}
                />
            </div>

            {showStatus ? (
                <StatusIndicator state={pluginState}/>
            ) : (
                <ul>
                    {pluginState.report?.map((link, index) => (
                        <LinkReport key={`${link.url}-${index}`} linkData={link}/>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default defineClient({
    hooks: {
        'dashboard-panel-broken-link-checker': renderPanel
    },
    hasSettingsPanel: true,
});