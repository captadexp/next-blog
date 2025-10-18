import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useState, useRef} from '@supergrowthai/plugin-dev-kit/client';
import {SCHEMA_TYPES} from './SchemaTypePicker.js';

const AUTHOR_TYPES = [
    {value: 'Person', label: 'Person'},
    {value: 'Organization', label: 'Organization'}
];

export function GlobalSettingsPanel({sdk}: {sdk: ClientSDK; context: any}) {
    const [config, setConfig] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'organization' | 'website' | 'defaults'>('organization');
    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        sdk.callRPC('json-ld:config:get', {}).then(resp => {
            setConfig(resp?.payload?.payload || {});
        });
    }, [sdk]);

    const saveConfig = useCallback(async (newConfig: any) => {
        setSaving(true);
        try {
            await sdk.callRPC('json-ld:config:set', {config: newConfig});
            setConfig(newConfig);
            sdk.notify('Settings saved successfully', 'success');
        } catch (error) {
            sdk.notify('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    }, [sdk]);

    const debouncedSaveConfig = useCallback((newConfig: any) => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set config immediately for UI updates
        setConfig(newConfig);

        // Set new timeout for save
        saveTimeoutRef.current = setTimeout(() => {
            saveConfig(newConfig);
            saveTimeoutRef.current = null;
        }, 500) as unknown as number;
    }, [saveConfig]);

    const updateField = useCallback((path: string, value: any) => {
        const keys = path.split('.');
        const newConfig = {...config};
        let obj = newConfig;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = value;
        debouncedSaveConfig(newConfig);
    }, [config, debouncedSaveConfig]);

    const selectLogo = useCallback(async () => {
        try {
            const response: any = await sdk.startIntent('select-image', {
                options: {
                    mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
                    maxSize: 2 * 1024 * 1024,
                    allowUpload: true
                }
            });

            if (response && response.media) {
                updateField('organization.logoMedia', {
                    mediaId: response.media._id,
                    url: response.media.url,
                    alt: response.media.alt || config.organization?.name || 'Organization Logo'
                });
            }
        } catch (error) {
            sdk.notify('Failed to select logo', 'error');
        }
    }, [sdk, config, updateField]);

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">JSON-LD Global Configuration</h3>
                <p className="text-sm text-gray-500 mt-1">Set default values for all blog posts</p>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <div className="w-48 border-r border-gray-200 p-2">
                    <button
                        className={`w-full text-left px-3 py-2 text-sm rounded ${activeSection === 'organization' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setActiveSection('organization')}
                    >
                        Organization
                    </button>
                    <button
                        className={`w-full text-left px-3 py-2 text-sm rounded ${activeSection === 'website' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setActiveSection('website')}
                    >
                        Website
                    </button>
                    <button
                        className={`w-full text-left px-3 py-2 text-sm rounded ${activeSection === 'defaults' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setActiveSection('defaults')}
                    >
                        Article Defaults
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {activeSection === 'organization' && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900">Organization Details</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                        placeholder="Your Organization"
                                        value={config.organization?.name || ''}
                                        onChange={e => updateField('organization.name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                                    <input
                                        type="url"
                                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                        placeholder="https://example.com"
                                        value={config.organization?.url || ''}
                                        onChange={e => updateField('organization.url', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Logo</label>
                                {config.organization?.logoMedia ? (
                                    <div className="inline-block p-2 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex flex-col items-center space-y-2">
                                            <img
                                                src={config.organization.logoMedia.url}
                                                alt={config.organization.logoMedia.alt}
                                                className="w-20 h-20 object-contain border border-gray-300 rounded bg-white p-1"
                                            />
                                            <input
                                                type="text"
                                                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                                                placeholder="Alt text"
                                                value={config.organization.logoMedia.alt || ''}
                                                onChange={e => {
                                                    const updated = {...config.organization.logoMedia, alt: e.target.value};
                                                    updateField('organization.logoMedia', updated);
                                                }}
                                            />
                                            <button
                                                className="text-xs text-red-600 hover:text-red-700"
                                                onClick={() => updateField('organization.logoMedia', null)}
                                            >
                                                Remove Logo
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <button
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                            onClick={selectLogo}
                                        >
                                            Select Logo from Media Library
                                        </button>
                                        <div className="text-center text-xs text-gray-500">OR</div>
                                        <input
                                            type="url"
                                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                            placeholder="Logo URL (fallback)"
                                            value={config.organization?.logo || ''}
                                            onChange={e => updateField('organization.logo', e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Social Profiles</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm h-20 resize-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="One URL per line (Twitter, LinkedIn, etc.)"
                                    value={(config.organization?.sameAs || []).join('\n')}
                                    onChange={e => updateField('organization.sameAs', e.target.value.split('\n').filter(Boolean))}
                                />
                                <p className="text-xs text-gray-500 mt-1">Social media profile URLs for your organization</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                    placeholder="contact@example.com"
                                    value={config.organization?.email || ''}
                                    onChange={e => updateField('organization.email', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {activeSection === 'website' && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900">Website Settings</h4>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Website Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                    placeholder="My Blog"
                                    value={config.website?.name || ''}
                                    onChange={e => updateField('website.name', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Website URL</label>
                                <input
                                    type="url"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                    placeholder="https://blog.example.com"
                                    value={config.website?.url || ''}
                                    onChange={e => updateField('website.url', e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">Base URL for generating absolute URLs in JSON-LD</p>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={config.website?.searchAction !== false}
                                        onChange={e => updateField('website.searchAction', e.target.checked)}
                                    />
                                    <span className="font-medium text-gray-700">Enable search action</span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-6">Adds website search box in search results</p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Search URL Template</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                                    placeholder="https://blog.example.com/search?q={search_term_string}"
                                    value={config.website?.searchUrlTemplate || ''}
                                    onChange={e => updateField('website.searchUrlTemplate', e.target.value)}
                                    disabled={!config.website?.searchAction}
                                />
                                <p className="text-xs text-gray-500 mt-1">Use {'{search_term_string}'} as placeholder</p>
                            </div>
                        </div>
                    )}

                    {activeSection === 'defaults' && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900">Article Default Settings</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Default Schema Type</label>
                                    <select
                                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                        value={config.article?.defaultType || 'Article'}
                                        onChange={e => updateField('article.defaultType', e.target.value)}
                                    >
                                        {SCHEMA_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Default Author Type</label>
                                    <select
                                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                        value={config.article?.authorType || 'Person'}
                                        onChange={e => updateField('article.authorType', e.target.value)}
                                    >
                                        {AUTHOR_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Default Language</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                    placeholder="en-US"
                                    value={config.language || ''}
                                    onChange={e => updateField('language', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Image Policy</label>
                                <select
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                                    value={config.article?.defaultImagePolicy || 'featured'}
                                    onChange={e => updateField('article.defaultImagePolicy', e.target.value)}
                                >
                                    <option value="featured">Use featured image</option>
                                    <option value="first">Use first image in content</option>
                                    <option value="none">No default image</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={config.article?.useOrgAsPublisher !== false}
                                        onChange={e => updateField('article.useOrgAsPublisher', e.target.checked)}
                                    />
                                    <span className="font-medium text-gray-700">Use organization as publisher</span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6">
                                    Automatically set organization as the publisher for all articles
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={config.article?.includeDateModified !== false}
                                        onChange={e => updateField('article.includeDateModified', e.target.checked)}
                                    />
                                    <span className="font-medium text-gray-700">Include modification date</span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6">
                                    Shows when the article was last updated
                                </p>
                            </div>
                        </div>
                    )}

                    {saving && (
                        <div className="mt-4 text-sm text-center text-gray-500">Saving…</div>
                    )}
                </div>
            </div>
        </div>
    );
}