import type {GlobalJsonLdSettings} from '../types/plugin-types.js';
import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';

interface GlobalSettingsPanelProps {
    sdk: ClientSDK;
    settings: GlobalJsonLdSettings;
    onSettingsChange: (settings: GlobalJsonLdSettings) => void;
    onSave: () => Promise<void>;
    isLoading?: boolean;
    isSaving?: boolean;
}

export function GlobalSettingsPanel({
                                        sdk,
                                        settings,
                                        onSettingsChange,
                                        onSave,
                                        isLoading = false,
                                        isSaving = false
                                    }: GlobalSettingsPanelProps) {
    const updateOrganization = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            organization: {...settings.organization, [field]: value}
        });
    };

    const updateWebsite = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            website: {...settings.website, [field]: value}
        });
    };

    const updateArticle = (field: string, value: any) => {
        onSettingsChange({
            ...settings,
            article: {...settings.article, [field]: value}
        });
    };

    const updateSameAs = (index: number, value: string) => {
        const sameAs = [...(settings.organization?.sameAs || [])];
        if (value.trim()) {
            sameAs[index] = value;
        } else {
            sameAs.splice(index, 1);
        }
        updateOrganization('sameAs', sameAs);
    };

    const addSameAsField = () => {
        const sameAs = [...(settings.organization?.sameAs || []), ''];
        updateOrganization('sameAs', sameAs);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">JSON-LD Structured Data Settings</h1>
            <div className="flex flex-col gap-8">

                {/* Organization Settings */}
                <div className="bg-white shadow-lg rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <span className="text-2xl mr-3">🏢</span>
                        <h2 className="text-xl font-semibold">Organization Information</h2>
                    </div>
                    <p className="text-gray-600 mb-6">
                        Configure your organization details for schema.org structured data.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-2">Organization Name *</label>
                            <input
                                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                type="text"
                                value={settings.organization?.name || ''}
                                onChange={(e) => updateOrganization('name', e.target.value)}
                                placeholder="Your Organization Name"
                            />
                            <p className="text-xs text-gray-500 mt-1">The official name of your organization</p>
                        </div>

                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-2">Organization URL *</label>
                            <input
                                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                type="url"
                                value={settings.organization?.url || ''}
                                onChange={(e) => updateOrganization('url', e.target.value)}
                                placeholder="https://yourorganization.com"
                            />
                            <p className="text-xs text-gray-500 mt-1">Your organization's main website URL</p>
                        </div>

                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-2">Logo URL</label>
                            <input
                                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                type="url"
                                value={settings.organization?.logo || ''}
                                onChange={(e) => updateOrganization('logo', e.target.value)}
                                placeholder="https://yourorganization.com/logo.png"
                            />
                            <p className="text-xs text-gray-500 mt-1">URL to your organization's logo (recommended: 600x60px)</p>
                        </div>

                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-2">Contact Email</label>
                            <input
                                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                type="email"
                                value={settings.organization?.email || ''}
                                onChange={(e) => updateOrganization('email', e.target.value)}
                                placeholder="contact@yourorganization.com"
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                            value={settings.organization?.description || ''}
                            onChange={(e) => updateOrganization('description', e.target.value)}
                            placeholder="Brief description of your organization..."
                            rows={3}
                        />
                    </div>

                    {/* Social Media Links */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3>Social Media & Same As Links</h3>
                            <button className="px-3 py-2 text-sm bg-blue-500 text-white rounded border-none cursor-pointer hover:bg-blue-600" onClick={addSameAsField}>
                                Add Link
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Add links to your organization's social media profiles and other official web properties.
                        </p>
                        <div className="flex flex-col gap-3">
                            {(settings.organization?.sameAs || ['']).map((link, index) => (
                                <div key={index.toString()} className="flex items-center gap-3">
                                    <input
                                        className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                        type="url"
                                        value={link}
                                        onChange={(e) => updateSameAs(index, e.target.value)}
                                        placeholder="https://twitter.com/yourorganization"
                                    />
                                    {index > 0 && (
                                        <button
                                            className="px-1 py-1 text-xs bg-red-500 text-white border-none rounded cursor-pointer hover:bg-red-600"
                                            onClick={() => updateSameAs(index, '')}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Website Settings */}
                <div className="bg-white shadow-lg rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <span className="text-2xl mr-3">🌐</span>
                        <h2 className="text-xl font-semibold">Website Information</h2>
                    </div>
                    <p className="text-gray-600 mb-6">
                        Configure your website details for enhanced search engine understanding.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-2">Website Name</label>
                            <input
                                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                type="text"
                                value={settings.website?.name || ''}
                                onChange={(e) => updateWebsite('name', e.target.value)}
                                placeholder="Your Website Name"
                            />
                        </div>

                        <div className="mb-2">
                            <label className="block text-sm font-medium mb-2">Website URL</label>
                            <input
                                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                type="url"
                                value={settings.website?.url || ''}
                                onChange={(e) => updateWebsite('url', e.target.value)}
                                placeholder="https://yourwebsite.com"
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium mb-2">Website Description</label>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                            value={settings.website?.description || ''}
                            onChange={(e) => updateWebsite('description', e.target.value)}
                            placeholder="Brief description of your website..."
                            rows={3}
                        />
                    </div>

                    {/* Search Action */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <input
                                className="w-4 h-4 accent-blue-600"
                                type="checkbox"
                                id="searchAction"
                                checked={settings.website?.searchAction?.enabled || false}
                                onChange={(e) => updateWebsite('searchAction', {
                                    ...settings.website?.searchAction,
                                    enabled: e.target.checked
                                })}
                            />
                            <label className="block text-sm font-medium">Enable Site Search Schema</label>
                        </div>
                        {settings.website?.searchAction?.enabled && (
                            <div className="mb-2">
                                <label className="block text-sm font-medium mb-2">Search URL Template</label>
                                <input
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                    type="url"
                                    value={settings.website?.searchAction?.urlTemplate || ''}
                                    onChange={(e) => updateWebsite('searchAction', {
                                        ...settings.website?.searchAction,
                                        urlTemplate: e.target.value
                                    })}
                                    placeholder="https://yoursite.com/search?q={search_term_string}"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Use {'{search_term_string}'} as placeholder for search queries
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Article Defaults */}
                <div className="bg-white shadow-lg rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <span className="text-2xl mr-3">📝</span>
                        <h2 className="text-xl font-semibold">Article Defaults</h2>
                    </div>
                    <p className="text-gray-600 mb-6">
                        Set default values for article structured data.
                    </p>

                    <div className="flex items-center gap-3 mb-4">
                        <input
                            className="w-4 h-4 accent-blue-600"
                            type="checkbox"
                            id="useOrgAsPublisher"
                            checked={settings.article?.defaultPublisher || false}
                            onChange={(e) => updateArticle('defaultPublisher', e.target.checked)}
                        />
                        <label className="block text-sm font-medium">
                            Use organization as default publisher for articles
                        </label>
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium mb-2">Default Image Policy</label>
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                            value={settings.article?.defaultImagePolicy || 'featured'}
                            onChange={(e) => updateArticle('defaultImagePolicy', e.target.value)}
                        >
                            <option value="featured">Use featured image</option>
                            <option value="first">Use first image in content</option>
                            <option value="none">Don't include images by default</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            How to handle images in article structured data by default
                        </p>
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium mb-2">Default Language</label>
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                            value={settings.defaultLanguage || 'en-US'}
                            onChange={(e) => onSettingsChange({
                                ...settings,
                                defaultLanguage: e.target.value
                            })}
                        >
                            <option value="en-US">English (US)</option>
                            <option value="en-GB">English (UK)</option>
                            <option value="es-ES">Spanish</option>
                            <option value="fr-FR">French</option>
                            <option value="de-DE">German</option>
                            <option value="it-IT">Italian</option>
                            <option value="pt-BR">Portuguese (Brazil)</option>
                            <option value="zh-CN">Chinese (Simplified)</option>
                            <option value="ja-JP">Japanese</option>
                            <option value="ko-KR">Korean</option>
                        </select>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg border-none cursor-pointer opacity-100 flex items-center gap-2 hover:bg-blue-600 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}