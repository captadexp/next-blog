import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {GlobalSettingsPanel} from '../../components/index.js';
import type {GlobalJsonLdSettings} from '../../types/plugin-types.js';
import {getPluginState, updatePluginState} from '../utils/plugin-state.js';
import {loadGlobalSettings} from '../utils/data-loaders.js';

export function useSettingsPanelHook(sdk: ClientSDK, prev: any, context: any) {
    const state = getPluginState();

    // Initialize settings loading
    if (!state.initialized) {
        updatePluginState({initialized: true});
        loadGlobalSettings(sdk);
    }

    const handleSettingsChange = (newSettings: GlobalJsonLdSettings) => {
        updatePluginState({globalSettings: newSettings});
        sdk.refresh();
    };

    // Throttled save function to prevent rapid clicking
    const handleSave = sdk.utils!.throttle(async () => {
        updatePluginState({isSavingSettings: true});
        sdk.refresh();

        try {
            await sdk.callRPC('jsonLd:saveGlobalSettings', {
                settings: state.globalSettings
            });
            sdk.notify('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            sdk.notify('Failed to save settings', 'error');
        }

        updatePluginState({isSavingSettings: false});
        sdk.refresh();
    }, 2000);

    return (
        <GlobalSettingsPanel
            sdk={sdk}
            settings={state.globalSettings}
            onSettingsChange={handleSettingsChange}
            onSave={handleSave}
            isLoading={state.isLoadingSettings}
            isSaving={state.isSavingSettings}
        />
    );
}