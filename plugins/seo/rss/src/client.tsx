import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {ClientSDK, useCallback, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import './styles.css';

interface RssSettings {
    // Feed metadata
    useJsonLdDefaults: boolean;
    siteTitle: string;
    siteDescription: string;
    publicationName: string;

    // Content settings
    maxItems: number;
    contentCutoffDays: number;
    includeFullContent: boolean;

    // Include options
    includeAuthors: boolean;
    includeCategories: boolean;
    includeTags: boolean;
    includeImages: boolean;

    // Advanced
    ttl: number;
}

interface SystemSettings {
    site?: {
        name?: string;
        url?: string;
        description?: string;
    };
    organization?: {
        name?: string;
        url?: string;
    };
}

// Feed Configuration Section
function FeedConfigSection({settings, onChange, systemSettings}: {
    settings: RssSettings;
    onChange: (updates: Partial<RssSettings>) => void;
    systemSettings: SystemSettings | null;
}) {
    const systemSiteTitle = systemSettings?.site?.name || '';
    const systemPublicationName = systemSettings?.organization?.name || '';

    return (
        <div className="rss-section">
            <h4 className="rss-section-title">Feed Configuration</h4>

            <div className="rss-checkbox-group" style={{marginBottom: '1rem'}}>
                <input
                    type="checkbox"
                    id="useJsonLdDefaults"
                    checked={settings.useJsonLdDefaults}
                    onChange={e => onChange({useJsonLdDefaults: e.target.checked})}
                />
                <label className="rss-checkbox-label">
                    Use system settings for site information
                </label>
            </div>

            {settings.useJsonLdDefaults && systemSettings && (
                <div className="rss-info-box" style={{marginBottom: '1rem'}}>
                    <p className="rss-info-text" style={{marginBottom: '0.25rem'}}>
                        Using system settings:
                    </p>
                    <p className="rss-info-text" style={{fontSize: '0.7rem'}}>
                        • Title: {systemSiteTitle || 'Not configured'}
                    </p>
                    <p className="rss-info-text" style={{fontSize: '0.7rem'}}>
                        • Publication: {systemPublicationName || 'Not configured'}
                    </p>
                </div>
            )}

            <div className="rss-field-group">
                <label className="rss-field-label">
                    Site Title {settings.useJsonLdDefaults ? '(Override)' : ''}
                </label>
                <input
                    type="text"
                    className="rss-input"
                    value={settings.siteTitle}
                    onChange={e => onChange({siteTitle: e.target.value})}
                    placeholder={settings.useJsonLdDefaults ? systemSiteTitle : ''}
                />
                {settings.useJsonLdDefaults && (
                    <span className="rss-field-hint">Leave empty to use system setting</span>
                )}
            </div>

            <div className="rss-field-group">
                <label className="rss-field-label">
                    Site Description {settings.useJsonLdDefaults ? '(Override)' : ''}
                </label>
                <input
                    type="text"
                    className="rss-input"
                    value={settings.siteDescription}
                    onChange={e => onChange({siteDescription: e.target.value})}
                    placeholder={settings.useJsonLdDefaults ? systemSettings?.site?.description || '' : ''}
                />
                {settings.useJsonLdDefaults && (
                    <span className="rss-field-hint">Leave empty to use system description</span>
                )}
            </div>

            <div className="rss-field-group">
                <label className="rss-field-label">
                    Publication Name {settings.useJsonLdDefaults ? '(Override)' : ''}
                </label>
                <input
                    type="text"
                    className="rss-input"
                    value={settings.publicationName}
                    onChange={e => onChange({publicationName: e.target.value})}
                    placeholder={settings.useJsonLdDefaults ? systemPublicationName : ''}
                />
                <span className="rss-field-hint">
                    {settings.useJsonLdDefaults ? 'Leave empty to use system organization name' : 'Used in RSS generator field'}
                </span>
            </div>
        </div>
    );
}

// Content Settings Section
function ContentSettingsSection({settings, onChange}: {
    settings: RssSettings;
    onChange: (updates: Partial<RssSettings>) => void;
}) {
    return (
        <div className="rss-section">
            <h4 className="rss-section-title">Content Settings</h4>

            <div className="rss-field-group">
                <label className="rss-field-label">Maximum Items</label>
                <input
                    type="number"
                    className="rss-input"
                    value={settings.maxItems}
                    onChange={e => onChange({maxItems: parseInt(e.target.value) || 20})}
                    min={1}
                    max={100}
                />
                <span className="rss-field-hint">Number of posts to include (1-100)</span>
            </div>

            <div className="rss-field-group">
                <label className="rss-field-label">Content Cutoff (days)</label>
                <input
                    type="number"
                    className="rss-input"
                    value={settings.contentCutoffDays}
                    onChange={e => onChange({contentCutoffDays: parseInt(e.target.value) || 0})}
                    min={0}
                />
                <span className="rss-field-hint">Only include posts from last N days (0 = no cutoff)</span>
            </div>

            <div className="rss-checkbox-group">
                <input
                    type="checkbox"
                    id="includeFullContent"
                    checked={settings.includeFullContent}
                    onChange={e => onChange({includeFullContent: e.target.checked})}
                />
                <label className="rss-checkbox-label">
                    Include full content (uses content:encoded)
                </label>
            </div>
        </div>
    );
}

// Include Options Section
function IncludeOptionsSection({settings, onChange}: {
    settings: RssSettings;
    onChange: (updates: Partial<RssSettings>) => void;
}) {
    return (
        <div className="rss-section">
            <h4 className="rss-section-title">Include Options</h4>

            <div className="rss-checkbox-group">
                <input
                    type="checkbox"
                    id="includeAuthors"
                    checked={settings.includeAuthors}
                    onChange={e => onChange({includeAuthors: e.target.checked})}
                />
                <label className="rss-checkbox-label">Authors</label>
            </div>

            <div className="rss-checkbox-group">
                <input
                    type="checkbox"
                    id="includeCategories"
                    checked={settings.includeCategories}
                    onChange={e => onChange({includeCategories: e.target.checked})}
                />
                <label className="rss-checkbox-label">Categories</label>
            </div>

            <div className="rss-checkbox-group">
                <input
                    type="checkbox"
                    id="includeTags"
                    checked={settings.includeTags}
                    onChange={e => onChange({includeTags: e.target.checked})}
                />
                <label className="rss-checkbox-label">Tags</label>
            </div>

            <div className="rss-checkbox-group">
                <input
                    type="checkbox"
                    id="includeImages"
                    checked={settings.includeImages}
                    onChange={e => onChange({includeImages: e.target.checked})}
                />
                <label className="rss-checkbox-label">
                    Featured Images (media:content)
                </label>
            </div>
        </div>
    );
}

// Advanced Settings Section
function AdvancedSettingsSection({settings, onChange}: {
    settings: RssSettings;
    onChange: (updates: Partial<RssSettings>) => void;
}) {
    return (
        <div className="rss-section">
            <h4 className="rss-section-title">Advanced Settings</h4>

            <div className="rss-field-group">
                <label className="rss-field-label">TTL (Time To Live)</label>
                <input
                    type="number"
                    className="rss-input"
                    value={settings.ttl}
                    onChange={e => onChange({ttl: parseInt(e.target.value) || 60})}
                    min={1}
                />
                <span className="rss-field-hint">Cache time in minutes</span>
            </div>

            <div className="rss-info-box">
                <p className="rss-info-text">
                    RSS feed is available at /rss or /feed
                </p>
            </div>
        </div>
    );
}


// Main Settings Panel
function SettingsPanel({sdk}: { sdk: ClientSDK; context: any }) {
    const [settings, setSettings] = useState<RssSettings | null>(null);
    const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Load RSS settings
        sdk.callRPC('rss:settings:get', {})
            .then((resp) => {
                const payload = resp?.payload;
                if (payload) {
                    const loadedSettings = {
                        useJsonLdDefaults: payload.useJsonLdDefaults ?? true,
                        siteTitle: payload.siteTitle ?? '',
                        siteDescription: payload.siteDescription ?? '',
                        publicationName: payload.publicationName ?? '',
                        maxItems: payload.maxItems ?? 20,
                        contentCutoffDays: payload.contentCutoffDays ?? 0,
                        includeFullContent: payload.includeFullContent ?? false,
                        includeAuthors: payload.includeAuthors ?? true,
                        includeCategories: payload.includeCategories ?? true,
                        includeTags: payload.includeTags ?? false,
                        includeImages: payload.includeImages ?? false,
                        ttl: payload.ttl ?? 60
                    };
                    setSettings(loadedSettings);
                }
            })
            .catch(() => {
            });

        // Load system settings
        sdk.callRPC('system:settings:get', {})
            .then((resp) => {
                if (resp?.code === 0 && resp?.payload) {
                    setSystemSettings(resp.payload);
                }
            })
            .catch(() => {
            });
    }, [sdk]);

    const handleSettingChange = useCallback((updates: Partial<RssSettings>) => {
        setSettings(prev => prev ? {...prev, ...updates} : null);
    }, []);

    const saveSettings = useCallback(async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await sdk.callRPC('rss:settings:set', settings);
        } finally {
            setSaving(false);
        }
    }, [settings, sdk]);

    if (!settings) {
        return <div>Loading...</div>;
    }

    return (
        <div className="rss-settings-panel">
            <h3 style={{fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem'}}>
                RSS Feed Configuration
            </h3>

            <FeedConfigSection
                settings={settings}
                onChange={handleSettingChange}
                systemSettings={systemSettings}
            />

            <ContentSettingsSection
                settings={settings}
                onChange={handleSettingChange}
            />

            <IncludeOptionsSection
                settings={settings}
                onChange={handleSettingChange}
            />

            <AdvancedSettingsSection
                settings={settings}
                onChange={handleSettingChange}
            />


            <div className="rss-actions">
                <button
                    className="rss-save-button"
                    onClick={saveSettings}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}

export default defineClient({
    hooks: {
        'system:plugin:settings-panel': (sdk, _prev, context) => <SettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});