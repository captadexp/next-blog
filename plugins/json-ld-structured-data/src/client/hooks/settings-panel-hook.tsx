import { useState, useEffect, useCallback } from '@supergrowthai/plugin-dev-kit/client';
import { GlobalSettingsPanel } from '../../components/index.js';
import type { GlobalJsonLdSettings } from '../../types/plugin-types.js';

export function useSettingsPanelHook(sdk: any, prev: any, context: any) {
    const [settings, setSettings] = useState<GlobalJsonLdSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            const response = await sdk.callRPC('jsonLd:getGlobalSettings', {});
            setSettings(response.payload.payload.settings);
        };

        loadSettings();
    }, [sdk]);

    // Throttled save function
    const saveSettings = useCallback(
        sdk.utils.throttle(async (newSettings: GlobalJsonLdSettings) => {
            setIsSaving(true);
            await sdk.callRPC('jsonLd:saveGlobalSettings', {
                settings: newSettings
            });
            setIsSaving(false);
        }, 2000),
        [sdk]
    );

    const handleSettingsChange = useCallback((newSettings: GlobalJsonLdSettings) => {
        setSettings(newSettings);
    }, []);

    const handleSave = useCallback(() => {
        return saveSettings(settings);
    }, [settings, saveSettings]);

    if (!settings) {
        return null;
    }

    return (
        <GlobalSettingsPanel
            sdk={sdk}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onSave={handleSave}
            isLoading={false}
            isSaving={isSaving}
        />
    );
}