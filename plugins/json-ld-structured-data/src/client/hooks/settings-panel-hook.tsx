import {ClientSDK, PluginRuntime} from '@supergrowthai/plugin-dev-kit/client';
import {GlobalSettingsPanel} from '../../components/index.js';
import type {GlobalJsonLdSettings} from '../../types/plugin-types.js';

// Get global utils
const {utils} = (window as any).PluginRuntime as PluginRuntime;

// Local state for settings panel - minimal and focused
interface SettingsPanelState {
    settings: GlobalJsonLdSettings;
    initialized: boolean;
}

const state: SettingsPanelState = {
    settings: {},
    initialized: false
};

async function loadSettings(sdk: ClientSDK) {
    try {
        const response = await sdk.callRPC('jsonLd:getGlobalSettings', {});
        state.settings = response.payload.payload.settings || {};
        sdk.refresh();
    } catch (error) {
        // Fail fast
        throw error;
    }
}

async function saveSettingsCore(sdk: ClientSDK, settings: GlobalJsonLdSettings) {
    try {
        await sdk.callRPC('jsonLd:saveGlobalSettings', {
            settings
        });
        sdk.notify('Settings saved successfully', 'success');
    } catch (error) {
        sdk.notify('Failed to save settings', 'error');
        throw error;
    }
}

// Create throttled save function at module level
const throttledSaveSettings = utils.throttle(saveSettingsCore, 2000);

export function useSettingsPanelHook(sdk: ClientSDK, prev: any, context: any) {
    // Simple initialization
    if (!state.initialized) {
        state.initialized = true;
        loadSettings(sdk);
    }

    const handleSettingsChange = (newSettings: GlobalJsonLdSettings) => {
        state.settings = newSettings;
        sdk.refresh();
    };

    const handleSave = () => {
        return throttledSaveSettings(sdk, state.settings);
    };

    return (
        <GlobalSettingsPanel
            sdk={sdk}
            settings={state.settings}
            onSettingsChange={handleSettingsChange}
            onSave={handleSave}
            isLoading={false}
            isSaving={false}
        />
    );
}