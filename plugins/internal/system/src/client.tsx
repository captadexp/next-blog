import type {ClientPluginModule, ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import {defineClient} from "@supergrowthai/plugin-dev-kit";

interface CommonSettings {
    website: {
        url: string;
        name: string;
        description: string;
    };
    organization: {
        name: string;
        url: string;
        logoMediaId?: string;
    };
    site: {
        title: string;
        description: string;
        language: string;
    };
}

const DEFAULT_SETTINGS: CommonSettings = {
    website: {
        url: '',
        name: '',
        description: ''
    },
    organization: {
        name: '',
        url: '',
        logoMediaId: undefined
    },
    site: {
        title: '',
        description: '',
        language: 'en-US'
    }
};

const LANGUAGE_OPTIONS = [
    {value: 'en-US', label: 'English (US)'},
    {value: 'en-GB', label: 'English (UK)'},
    {value: 'es', label: 'Spanish'},
    {value: 'fr', label: 'French'},
    {value: 'de', label: 'German'},
    {value: 'it', label: 'Italian'},
    {value: 'pt', label: 'Portuguese'},
    {value: 'pt-BR', label: 'Portuguese (Brazil)'},
    {value: 'ru', label: 'Russian'},
    {value: 'ja', label: 'Japanese'},
    {value: 'ko', label: 'Korean'},
    {value: 'zh-CN', label: 'Chinese (Simplified)'},
    {value: 'zh-TW', label: 'Chinese (Traditional)'},
    {value: 'ar', label: 'Arabic'},
    {value: 'hi', label: 'Hindi'}
];

function WebsiteSection({settings, onChange}: {
    settings: CommonSettings;
    onChange: (updates: Partial<CommonSettings>) => void;
}) {
    const handleWebsiteChange = useCallback((field: keyof CommonSettings['website'], value: string) => {
        onChange({
            website: {...settings.website, [field]: value}
        });
    }, [settings.website, onChange]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h4 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b">Website Configuration</h4>

            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                <input
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={settings.website.url}
                    onChange={e => handleWebsiteChange('url', (e.target as HTMLInputElement).value)}
                    placeholder="https://example.com"
                />
                <span className="block text-xs text-gray-500 mt-1">Full URL including protocol</span>
            </div>

            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Website Name</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={settings.website.name}
                    onChange={e => handleWebsiteChange('name', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)}
                    placeholder="My Website"
                />
                <span className="block text-xs text-gray-500 mt-1">Display name for your website</span>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website Description</label>
                <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    value={settings.website.description}
                    onChange={e => handleWebsiteChange('description', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)}
                    placeholder="A brief description of your website"
                    rows={3}
                />
                <span className="block text-xs text-gray-500 mt-1">Used in meta descriptions and structured data</span>
            </div>
        </div>
    );
}

function OrganizationSection({settings, onChange}: {
    settings: CommonSettings;
    onChange: (updates: Partial<CommonSettings>) => void;
}) {
    const handleOrgChange = useCallback((field: keyof CommonSettings['organization'], value: string | undefined) => {
        onChange({
            organization: {...settings.organization, [field]: value}
        });
    }, [settings.organization, onChange]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h4 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b">Organization Information</h4>

            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={settings.organization.name}
                    onChange={e => handleOrgChange('name', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)}
                    placeholder="ACME Corporation"
                />
                <span className="block text-xs text-gray-500 mt-1">Your company or organization name</span>
            </div>

            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization URL</label>
                <input
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={settings.organization.url}
                    onChange={e => handleOrgChange('url', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)}
                    placeholder="https://company.com"
                />
                <span className="block text-xs text-gray-500 mt-1">Main organization website</span>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Media ID</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={settings.organization.logoMediaId || ''}
                    onChange={e => handleOrgChange('logoMediaId', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value || undefined)}
                    placeholder="media-id-123"
                />
                <span className="block text-xs text-gray-500 mt-1">Media ID for organization logo (optional)</span>
            </div>
        </div>
    );
}

function SiteSection({settings, onChange}: {
    settings: CommonSettings;
    onChange: (updates: Partial<CommonSettings>) => void;
}) {
    const handleSiteChange = useCallback((field: keyof CommonSettings['site'], value: string) => {
        onChange({
            site: {...settings.site, [field]: value}
        });
    }, [settings.site, onChange]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h4 className="text-base font-semibold text-gray-800 mb-5 pb-3 border-b">Site Metadata</h4>

            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Title</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={settings.site.title}
                    onChange={e => handleSiteChange('title', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)}
                    placeholder="My Blog"
                />
                <span className="block text-xs text-gray-500 mt-1">Default title for your site</span>
            </div>

            <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
                <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    value={settings.site.description}
                    onChange={e => handleSiteChange('description', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)}
                    placeholder="Latest posts and updates from our blog"
                    rows={3}
                />
                <span className="block text-xs text-gray-500 mt-1">Default site description</span>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    value={settings.site.language}
                    onChange={e => handleSiteChange('language', (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value)}
                >
                    {LANGUAGE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="block text-xs text-gray-500 mt-1">Primary language for your content</span>
            </div>
        </div>
    );
}

function SystemSettingsPanel({sdk}: { sdk: ClientSDK; context: any }) {
    const [settings, setSettings] = useState<CommonSettings | null>(null);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        // Load settings on mount
        sdk.callRPC('settings:common:get', {})
            .then((resp) => {
                if (resp?.payload) {
                    setSettings(resp.payload);
                } else {
                    setSettings(DEFAULT_SETTINGS);
                }
            })
            .catch(() => {
                setSettings(DEFAULT_SETTINGS);
            });
    }, [sdk]);

    const handleSettingChange = useCallback((updates: Partial<CommonSettings>) => {
        setSettings(prev => {
            if (!prev) return null;
            return {...prev, ...updates};
        });
        setHasChanges(true);
    }, []);

    const saveSettings = useCallback(async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await sdk.callRPC('settings:common:set', {settings});
            sdk.notify('Settings saved successfully', 'success');
            setHasChanges(false);
        } catch (error) {
            sdk.notify('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    }, [settings, sdk]);

    if (!settings) {
        return <div className="flex items-center justify-center p-12 text-sm text-gray-500">Loading settings...</div>;
    }

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h3>
                <p className="text-sm text-gray-600">
                    Core system configuration and common settings used across plugins
                </p>
            </div>

            <WebsiteSection
                settings={settings}
                onChange={handleSettingChange}
            />

            <OrganizationSection
                settings={settings}
                onChange={handleSettingChange}
            />

            <SiteSection
                settings={settings}
                onChange={handleSettingChange}
            />

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                <button
                    className={`px-5 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        saving || !hasChanges
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    onClick={saveSettings}
                    disabled={saving || !hasChanges}
                >
                    {saving ? 'Saving...' : hasChanges ? 'Save Settings' : 'No Changes'}
                </button>
            </div>
        </div>
    );
}

const clientModule: ClientPluginModule = defineClient({
    hooks: {
        'system:plugin:settings-panel': (sdk, _prev, context) => <SystemSettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});

export default clientModule;