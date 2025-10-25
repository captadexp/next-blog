import {defineClient} from '@supergrowthai/plugin-dev-kit';
import type {BlogEditorContext, ClientSDK,} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import "./styles.css"

function PermalinkWidget({sdk, context}: { sdk: ClientSDK; context: BlogEditorContext }) {
    const blogId = context?.blogId as string | undefined;
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [formats, setFormats] = useState<string[]>([]);
    const [selectedFormat, setSelectedFormat] = useState('');

    const getTokens = useCallback(() => {
        const slug = context?.form.data.slug
        const category = context?.form?.getCategory();
        const now = new Date();
        return {
            slug: slug || '',
            category: category?.slug || '',
            year: String(now.getFullYear()),
            month: String(now.getMonth() + 1).padStart(2, '0'),
            day: String(now.getDate()).padStart(2, '0')
        };
    }, [sdk, context]);

    useEffect(() => {
        if (!blogId) return;
        Promise.all([
            sdk.callRPC('permalink:blogs:get', {blogId}),
            sdk.callRPC('permalink:settings:get', {blogId})
        ]).then(([getResp, settings]) => {
            const stored = getResp?.payload?.payload?.state || {};
            setValue(stored.permalink || '');
            const blogSettings = settings?.payload?.payload?.blogs || {};
            const fmts = blogSettings.formats || [];
            setFormats(fmts);
            setSelectedFormat(stored.pattern || blogSettings.activeFormat || fmts[0] || '{slug}');
        }).catch(() => {
        });
    }, [blogId, sdk]);

    const saveState = useCallback(async (permalink: string, pattern: string) => {
        if (!blogId) return;
        setSaving(true);
        try {
            await sdk.callRPC('permalink:blogs:set', {
                blogId,
                state: {permalink: permalink.trim(), pattern}
            });
        } finally {
            setSaving(false);
        }
    }, [blogId, sdk]);

    useEffect(() => {
        if (!selectedFormat) return;
        const tokens = getTokens();
        const permalink = Object.entries(tokens)
            .reduce(
                (out, [key, value]) => out.replace(new RegExp(`{${key}}`, 'g'), value),
                selectedFormat
            ).replace(/\/+/g, '/').replace(/^(?!\/)/, '/').replace(/\/$/, '');
        setValue(permalink);
    }, [selectedFormat, getTokens]);

    useEffect(() => {
        if (!blogId || !value || !selectedFormat) return;
        const t = setTimeout(() => saveState(value, selectedFormat), 600);
        return () => clearTimeout(t);
    }, [value, selectedFormat, blogId, saveState]);

    return (
        <div className="p-3 bg-white border border-gray-200 rounded shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Permalink</label>
            <div className="flex items-center gap-2 mb-2">
                <select
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                    value={selectedFormat}
                    onChange={e => setSelectedFormat(e.target.value)}
                >
                    {formats.map(f => <option key={f} value={f}>{f}</option>)}
                    {!formats.length && <option value="{slug}">{'{slug}'}</option>}
                </select>
            </div>
            <input
                type="text"
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring"
                placeholder="Generated permalink preview"
                value={value}
                disabled
            />
            {saving && <div className="mt-1 text-xs text-gray-500">Saving…</div>}
        </div>
    );
}

function PermalinkSettingsEditor({ type, settings, onSettingsChange }: { type: 'blogs', settings: any, onSettingsChange: (newTypeSettings: any) => void }) {
    const [newFormat, setNewFormat] = useState('');

    const formats = settings.formats || [];
    const active = settings.activeFormat || '';

    const addFormat = () => {
        const format = newFormat.trim();
        if (!format || formats.includes(format)) return;
        setNewFormat('');
        onSettingsChange({
            formats: [...formats, format],
            activeFormat: active || format
        });
    };

    const handleActiveChange = (e: any) => {
        onSettingsChange({
            formats: formats,
            activeFormat: e.target.value
        });
    };

    return (
        <div>
            <h3 className="text-sm font-medium mb-2">Permalink Settings: {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
            <label className="block text-xs text-gray-600 mb-1">Active format</label>
            <select
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm mb-3"
                value={active}
                onChange={handleActiveChange}
            >
                {formats.map((f: string) => <option key={f} value={f}>{f}</option>)}
                {!formats.length && <option value="{slug}">{"'{slug}'"}</option>}
            </select>

            <label className="block text-xs text-gray-600 mb-1">Add format</label>
            <div className="flex gap-2">
                <input
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                    placeholder="e.g. {category}/{slug}"
                    value={newFormat}
                    onChange={e => setNewFormat(e.target.value)}
                />
                <button
                    className="btn px-3 py-1 text-sm border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                    onClick={addFormat}
                    disabled={!newFormat.trim()}
                >Add
                </button>
            </div>
        </div>
    );
}


function SettingsPanel({sdk, context}: { sdk: ClientSDK; context: any }) {
    const [activeTab, setActiveTab] = useState('blogs');
    const [settings, setSettings] = useState<any>({});

    useEffect(() => {
        sdk.callRPC('permalink:settings:get', {}).then((resp: any) => {
            setSettings(resp?.payload?.payload || {});
        }).catch(() => {});
    }, [sdk]);

    const handleSave = (newSettings: any) => {
        sdk.callRPC('permalink:settings:set', newSettings).then((resp: any) => {
            setSettings(resp?.payload?.payload || newSettings);
        });
    };

    const handleTypeSettingsChange = (type: 'blogs', newTypeSettings: any) => {
        const newSettings = {
            ...settings,
            [type]: newTypeSettings
        };
        handleSave(newSettings);
    };

    return (
        <div className="p-3 bg-white rounded shadow-sm">
            <div className="flex border-b mb-3">
                <button
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'blogs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('blogs')}
                >
                    Blogs
                </button>
            </div>

            {activeTab === 'blogs' && (
                <PermalinkSettingsEditor
                    type="blogs"
                    settings={settings.blogs || {}}
                    onSettingsChange={(newBlogSettings) => handleTypeSettingsChange('blogs', newBlogSettings)}
                />
            )}
        </div>
    );
}

export default defineClient({
    hooks: {
        'editor-sidebar-widget': (sdk, _prev, context) => <PermalinkWidget sdk={sdk} context={context}/>,
        'system:plugin:settings-panel': (sdk, _prev, context) => <SettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});
