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
            sdk.callRPC('permalink:settings:blogs:get', {blogId})
        ]).then(([getResp, settings]) => {

            const stored = getResp?.payload?.payload?.state || {};
            setValue(stored.permalink || '');
            const fmts = settings?.payload?.payload?.formats || [];
            setFormats(fmts);
            setSelectedFormat(stored.pattern || settings?.payload?.payload?.activeFormat || fmts[0] || '{slug}');
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

function SettingsPanel({sdk, context}: { sdk: ClientSDK; context: any }) {

    const [formats, setFormats] = useState<string[]>([]);
    const [active, setActive] = useState('');
    const [newFormat, setNewFormat] = useState('');

    useEffect(() => {
        sdk.callRPC('permalink:settings:blogs:get', {}).then((resp: any) => {
            const fmts = resp?.payload?.payload?.formats || [];
            setFormats(fmts);
            setActive(resp?.payload?.payload?.activeFormat);
        }).catch(() => {
        });
    }, [sdk]);

    const saveSettings = useCallback(async (nextFormats: string[], nextActive?: string) => {
        const resp = await sdk.callRPC('permalink:settings:blogs:set', {
            formats: nextFormats,
            activeFormat: nextActive ?? active
        });
        setFormats(resp?.payload?.payload?.formats || nextFormats);
        setActive(resp?.payload?.payload?.activeFormat || nextActive || active);
    }, [active, sdk]);

    const addFormat = useCallback(() => {
        const format = newFormat.trim();
        if (!format || formats.includes(format)) return;
        setNewFormat('');
        saveSettings([...formats, format], active || format);
    }, [newFormat, formats, active, saveSettings]);

    return (
        <div className="p-3 bg-white rounded shadow-sm">
            <h3 className="text-sm font-medium mb-2">Permalink Settings: Blogs</h3>
            <label className="block text-xs text-gray-600 mb-1">Active format</label>
            <select
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm mb-3"
                value={active}
                onChange={e => {
                    setActive(e.target.value);
                    saveSettings(formats, e.target.value);
                }}
            >
                {formats.map(f => <option key={f} value={f}>{f}</option>)}
                {!formats.length && <option value="{slug}">{'{slug}'}</option>}
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

export default defineClient({
    hooks: {
        'editor-sidebar-widget': (sdk, _prev, context) => <PermalinkWidget sdk={sdk} context={context}/>,
        'system:plugin:settings-panel': (sdk, _prev, context) => <SettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});
