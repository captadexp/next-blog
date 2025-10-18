import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {useCallback, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import {ClientSDK} from "@supergrowthai/next-blog-types";

interface SitemapSettings {
    // Standard sitemaps
    enablePosts: boolean;
    enableCategories: boolean;
    enableTags: boolean;
    enableAuthors: boolean;
    postsPerPage: number;

    // News sitemap
    enableNews: boolean;
    newsMaxAge: number;
    newsPublications: string[];
    newsTagSlug: string;
}

// Standard Sitemaps Section Component
function StandardSitemapsSection({settings, onChange}: {
    settings: SitemapSettings;
    onChange: (updates: Partial<SitemapSettings>) => void;
}) {
    return (
        <div className="border border-gray-200 rounded p-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Standard Sitemaps</h4>

            <div className="space-y-2">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={settings.enablePosts}
                        onChange={e => onChange({enablePosts: e.target.checked})}
                    />
                    <span className="text-sm">Posts</span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={settings.enableCategories}
                        onChange={e => onChange({enableCategories: e.target.checked})}
                    />
                    <span className="text-sm">Categories</span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={settings.enableTags}
                        onChange={e => onChange({enableTags: e.target.checked})}
                    />
                    <span className="text-sm">Tags</span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={settings.enableAuthors}
                        onChange={e => onChange({enableAuthors: e.target.checked})}
                    />
                    <span className="text-sm">Authors</span>
                </label>
            </div>

            <div className="mt-4">
                <label className="block text-xs text-gray-600 mb-1">Items per page</label>
                <input
                    type="number"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={settings.postsPerPage}
                    onChange={e => onChange({postsPerPage: parseInt(e.target.value) || 1000})}
                    min={100}
                    max={50000}
                />
                <span className="text-xs text-gray-500">Recommended: 1000-5000</span>
            </div>
        </div>
    );
}

// News Sitemap Section Component
function NewsSitemapSection({settings, onChange}: {
    settings: SitemapSettings;
    onChange: (updates: Partial<SitemapSettings>) => void;
}) {
    const handlePublicationChange = (value: string) => {
        const publications = value.split('\n').map(s => s.trim()).filter(Boolean);
        onChange({newsPublications: publications});
    };

    return (
        <div className="border border-gray-200 rounded p-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Google News Sitemap</h4>

            <label className="flex items-center gap-2 mb-3">
                <input
                    type="checkbox"
                    checked={settings.enableNews}
                    onChange={e => onChange({enableNews: e.target.checked})}
                />
                <span className="text-sm">Enable News Sitemap</span>
            </label>

            {settings.enableNews && (
                <>
                    <div className="mb-3">
                        <label className="block text-xs text-gray-600 mb-1">
                            News Tag Slug
                        </label>
                        <input
                            type="text"
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            value={settings.newsTagSlug}
                            onChange={e => onChange({newsTagSlug: e.target.value})}
                            placeholder="news"
                        />
                        <span className="text-xs text-gray-500">
                            Only posts with this tag will appear in news sitemap
                        </span>
                    </div>

                    <div className="mb-3">
                        <label className="block text-xs text-gray-600 mb-1">
                            Max Age (days)
                        </label>
                        <input
                            type="number"
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            value={settings.newsMaxAge}
                            onChange={e => onChange({newsMaxAge: parseInt(e.target.value) || 2})}
                            min={1}
                            max={2}
                        />
                        <span className="text-xs text-gray-500">
                            Google News requires articles from last 2 days
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">
                            Publication Name
                        </label>
                        <textarea
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            rows={3}
                            value={(settings.newsPublications || []).join('\n')}
                            onChange={e => handlePublicationChange(e.target.value)}
                            placeholder="Example News&#10;Tech Blog&#10;Daily Reporter"
                        />
                        <span className="text-xs text-gray-500">
                            Enter your publication/brand name. Currently only the first name is used.
                            Multiple publication support coming soon.
                        </span>
                    </div>
                </>
            )}

            <div className="mt-2 p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-800">
                    News sitemaps help Google News discover your recent articles.
                    Submit to Google News Publisher Center for best results.
                </p>
            </div>
        </div>
    );
}

// Advanced Settings Section (for future use)
function AdvancedSection() {
    return (
        <div className="border border-gray-200 rounded p-4 opacity-60">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Advanced (Coming Soon)</h4>

            <div className="space-y-2 text-xs text-gray-500">
                <p>• Monthly archives with S3 storage</p>
                <p>• Automatic compression for old sitemaps</p>
            </div>
        </div>
    );
}

// Main Settings Panel
function SettingsPanel({sdk}: { sdk: ClientSDK; context: any }) {
    const [settings, setSettings] = useState<SitemapSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        sdk.callRPC('sitemap:settings:get', {}).then((resp) => {
            //could declare type with type augmentation like in json-ld-structure-data plugin and handle cases better
            const payload = resp?.payload?.payload;
            if (payload) {
                // Ensure all fields have defaults
                const loadedSettings = {
                    enablePosts: payload.enablePosts ?? true,
                    enableCategories: payload.enableCategories ?? false,
                    enableTags: payload.enableTags ?? false,
                    enableAuthors: payload.enableAuthors ?? false,
                    postsPerPage: payload.postsPerPage ?? 1000,
                    enableNews: payload.enableNews ?? false,
                    newsMaxAge: payload.newsMaxAge ?? 2,
                    newsPublications: payload.newsPublications ?? [],
                    newsTagSlug: payload.newsTagSlug ?? 'news'
                };
                setSettings(loadedSettings);
            }
        }).catch(() => {
        });
    }, [sdk]);

    const handleSettingChange = useCallback((updates: Partial<SitemapSettings>) => {
        setSettings(prev => prev ? {...prev, ...updates} : null);
    }, []);

    const saveSettings = useCallback(async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await sdk.callRPC('sitemap:settings:set', settings);
        } finally {
            setSaving(false);
        }
    }, [settings, sdk]);

    if (!settings) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4 bg-white rounded shadow-sm">
            <h3 className="text-sm font-medium mb-4">Sitemap Configuration</h3>

            <div className="space-y-4">
                <StandardSitemapsSection
                    settings={settings}
                    onChange={handleSettingChange}
                />

                <NewsSitemapSection
                    settings={settings}
                    onChange={handleSettingChange}
                />

                <AdvancedSection/>

                <div className="flex justify-end pt-2">
                    <button
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        onClick={saveSettings}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
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