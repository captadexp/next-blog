import {defineClient} from '@supergrowthai/plugin-dev-kit';
import {useCallback, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import {ClientSDK} from "@supergrowthai/next-blog-types";
import "/styles.css"

interface RobotsRule {
    userAgent: string;
    allow?: string[];
    disallow?: string[];
    crawlDelay?: number;
}

interface RobotsSettings {
    rules: RobotsRule[];
    sitemapPath?: string;
    useHostHeader?: boolean;
}

function SettingsPanel({sdk}: { sdk: ClientSDK; context: any }) {
    const [settings, setSettings] = useState<RobotsSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        sdk.callRPC('robots:settings:get', {}).then((resp: any) => {
            if (resp?.payload?.payload) {
                setSettings(resp.payload.payload);
            }
        }).catch(() => {
        });
    }, [sdk]);

    const saveSettings = useCallback(async () => {
        setSaving(true);
        try {
            await sdk.callRPC('robots:settings:set', settings);
        } finally {
            setSaving(false);
        }
    }, [settings, sdk]);

    const updateRule = (index: number, field: keyof RobotsRule, value: any) => {
        const rules = [...(settings?.rules || [])];
        rules[index] = {...rules[index], [field]: value};
        setSettings({...settings, rules});
    };

    const addRule = () => {
        setSettings({
            ...settings,
            rules: [...(settings?.rules || []), {userAgent: '', allow: ['/'], disallow: []}]
        });
    };

    const removeRule = (index: number) => {
        setSettings({
            ...settings,
            rules: (settings?.rules || []).filter((_, i) => i !== index)
        });
    };

    const parseList = (text: string): string[] => {
        return text.split('\n').map(s => s.trim()).filter(Boolean);
    };

    const joinList = (list?: string[]): string => {
        return (list || []).join('\n');
    };

    if (!settings)
        return <div>Loading....</div>

    return (
        <div className="p-4 bg-white rounded shadow-sm">
            <h3 className="text-sm font-medium mb-4">Robots.txt Settings</h3>

            <div className="space-y-4">
                <div>
                    <label className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            checked={settings.useHostHeader}
                            onChange={e => setSettings({...settings, useHostHeader: e.target.checked})}
                        />
                        <span className="text-sm">Use host header from request</span>
                    </label>
                </div>

                <div>
                    <label className="block text-xs text-gray-600 mb-1">Sitemap Path</label>
                    <input
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                        value={settings.sitemapPath || ''}
                        onChange={e => setSettings({...settings, sitemapPath: e.target.value})}
                        placeholder="/api/seo/sitemap.xml"
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-600 mb-2">Rules</label>
                    {settings?.rules?.map((rule, i) => (
                        <div key={i.toString()} className="mb-3 p-3 border border-gray-200 rounded">
                            <div className="flex justify-between mb-2">
                                <input
                                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                                    value={rule.userAgent}
                                    onChange={e => updateRule(i, 'userAgent', e.target.value)}
                                    placeholder="User-Agent (e.g., *)"
                                />
                                <button
                                    className="ml-2 text-red-600 hover:text-red-700 text-sm"
                                    onClick={() => removeRule(i)}
                                >
                                    Remove
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Allow</label>
                                    <textarea
                                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                                        rows={2}
                                        value={joinList(rule.allow)}
                                        onChange={e => updateRule(i, 'allow', parseList(e.target.value))}
                                        placeholder="/"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Disallow</label>
                                    <textarea
                                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                                        rows={2}
                                        value={joinList(rule.disallow)}
                                        onChange={e => updateRule(i, 'disallow', parseList(e.target.value))}
                                        placeholder="/admin"
                                    />
                                </div>
                            </div>

                            <div className="mt-2">
                                <label className="block text-xs text-gray-500 mb-1">Crawl Delay (seconds)</label>
                                <input
                                    type="number"
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                                    value={rule.crawlDelay || ''}
                                    onChange={e => updateRule(i, 'crawlDelay', e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    ))}

                    <button
                        className="text-sm text-blue-600 hover:text-blue-700"
                        onClick={addRule}
                    >
                        + Add Rule
                    </button>
                </div>

                <div className="flex justify-end">
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