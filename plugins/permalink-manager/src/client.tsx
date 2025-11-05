import {defineClient} from '@supergrowthai/plugin-dev-kit';
import type {
    BlogEditorContext,
    CategoryEditorContext,
    ClientSDK,
    TagEditorContext,
    UserEditorContext
} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useMemo, useState} from '@supergrowthai/plugin-dev-kit/client';
import type {ContentType, NormalizedSection as ContentSettings} from './types.js';
import {CONTENT_TYPES} from './types.js';
import {useDebouncedEffect} from './utils.js';
import './styles.css';

type Tokens = Record<string, string>;

const LABELS: Record<ContentType, string> = {
    posts: 'Posts',
    tags: 'Tags',
    categories: 'Categories',
    users: 'Users'
};

const FORMAT_PLACEHOLDERS: Record<ContentType, string> = {
    posts: '{category}/{slug}, {year}/{month}/{slug}',
    tags: 'tag/{slug}, tags/{slug}',
    categories: '{slug}, category/{slug}',
    users: 'author/{username}, user/{username}'
};

function normalizePath(s: string) {
    return s.replace(/\/+/g, '/').replace(/^(?!\/)/, '/').replace(/\/$/, '');
}

function buildPermalink(pattern: string, tokens: Tokens) {
    return normalizePath(
        Object.entries(tokens).reduce(
            (out, [k, v]) => out.replaceAll(`{${k}}`, v),
            pattern
        )
    );
}

function computeTokens(type: ContentType, formData: any): Tokens {
    if (!formData) return {};

    const slug = formData?.data?.slug || '';
    const username = formData?.data?.username || '';
    const categoryFromBlog = formData?.getCategory?.()?.slug || '';

    const createdAt = new Date(formData?.data?.createdAt || 0);
    const standardTokens: Tokens = formData?.data?.createdAt ? {
        year: String(createdAt.getFullYear()),
        month: String(createdAt.getMonth() + 1).padStart(2, '0'),
        day: String(createdAt.getDate()).padStart(2, '0'),
    } : {};

    switch (type) {
        case 'posts':
            return {
                ...standardTokens,
                slug,
                category: categoryFromBlog,
                post_slug: slug,
                category_slug: categoryFromBlog,
            };

        case 'categories':
            return {
                ...standardTokens,
                slug,
                category: slug,
                category_slug: slug,
            };

        case 'tags':
            return {
                ...standardTokens,
                slug,
                tag_slug: slug,
            };

        case 'users':
            return {
                ...standardTokens,
                slug: username,
                user_username: username,
            };

        default:
            return standardTokens;
    }
}

function FormatSelect(props: {
    value: string;
    formats: string[];
    onChange: (v: string) => void;
    className?: string;
}) {
    const {value, formats, onChange, className} = props;
    return (
        <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
            {formats.map((f) => (
                <option key={f} value={f}>
                    {f}
                </option>
            ))}
        </select>
    );
}

function PermalinkWidget({sdk, context, type, _id}: {
    sdk: ClientSDK;
    context: BlogEditorContext | TagEditorContext | UserEditorContext | CategoryEditorContext;
    type: "posts" | "tags" | "categories" | "users",
    _id: string;
}) {
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [formats, setFormats] = useState<string[]>([]);
    const [selectedFormat, setSelectedFormat] = useState('');

    const tokens = useMemo(() => {
        return computeTokens(type, context?.form);
    }, [type, context?.form]);

    useEffect(() => {
        if (!_id) return;

        void (async () => {
            const [stored, settings] = await Promise.all([
                sdk.callRPC('permalink:get', {type: type, _id: _id}),
                sdk.callRPC('permalink:settings:get', {}),
            ]);
            const state = stored.payload?.payload?.state;
            const fmts = settings.payload?.payload?.[type]?.formats ?? [];
            setFormats(fmts);
            setValue(state?.permalink ?? '');
            setSelectedFormat(state?.pattern ?? settings.payload?.payload?.[type]?.activeFormat ?? fmts[0]);
        })();
    }, [_id, sdk]);

    const saveState = useCallback(
        async (permalink: string, pattern: string) => {
            if (!_id) return;
            setSaving(true);
            try {
                await sdk.callRPC('permalink:set', {
                    type: type,
                    _id: _id,
                    state: {permalink: permalink.trim(), pattern}
                });
            } finally {
                setSaving(false);
            }
        },
        [_id, sdk]
    );

    useEffect(() => {
        if (!selectedFormat) return;
        setValue(buildPermalink(selectedFormat, tokens));
    }, [selectedFormat, tokens]);

    useDebouncedEffect(() => {
        if (!_id || !value || !selectedFormat) return;
        void saveState(value, selectedFormat);
    }, 600, [value, selectedFormat, _id]);

    return (
        <div className="p-3 bg-white border border-gray-200 rounded shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Permalink</label>

            <div className="flex items-center gap-2 mb-2">
                <FormatSelect
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                    value={selectedFormat}
                    formats={formats}
                    onChange={setSelectedFormat}
                />
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

function SettingsPanel({sdk}: {
    sdk: ClientSDK;
    context: any;
}) {
    const [activeTab, setActiveTab] = useState<ContentType>('posts');
    const [allSettings, setAllSettings] = useState<Record<ContentType, ContentSettings> | null>(null);
    const [newFormat, setNewFormat] = useState('');

    useEffect(() => {
        void (async () => {
            const rpcResponse = await sdk.callRPC('permalink:settings:get', {});
            if (!rpcResponse || rpcResponse.code !== 0) return;
            const response = rpcResponse.payload!;
            if (response.code !== 0) return;

            setAllSettings({
                posts: response.payload!.posts,
                tags: response.payload!.tags,
                categories: response.payload!.categories,
                users: response.payload!.users
            });
        })();
    }, [sdk]);

    const saveSettings = useCallback(async (type: ContentType, nextFormats: string[], nextActive?: string) => {
        if (!allSettings) return;

        const update = {[type]: {formats: nextFormats, activeFormat: nextActive ?? allSettings[type].activeFormat}};
        const rpcResponse = await sdk.callRPC('permalink:settings:set', update);
        if (!rpcResponse || rpcResponse.code !== 0) return;
        const response = rpcResponse.payload!;
        if (response.code !== 0) return;

        setAllSettings({
            posts: response.payload!.posts,
            tags: response.payload!.tags,
            categories: response.payload!.categories,
            users: response.payload!.users
        });
    }, [sdk, allSettings]);

    const addFormat = useCallback(() => {
        if (!allSettings) return;
        const current = allSettings[activeTab];
        const fmt = newFormat.trim();
        if (!fmt || current.formats.includes(fmt)) return;
        setNewFormat('');
        const nextFormats = [...current.formats, fmt];
        void saveSettings(activeTab, nextFormats, current.activeFormat || fmt);
    }, [newFormat, activeTab, saveSettings, allSettings]);

    if (!allSettings) return null;

    const current = allSettings[activeTab];

    return (
        <div className="p-3 bg-white rounded shadow-sm">
            <h3 className="text-sm font-medium mb-3">Permalink Settings</h3>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-3">
                {CONTENT_TYPES.map((t) => (
                    <button
                        key={t}
                        className={`px-3 py-1 text-xs font-medium border-b-2 ${
                            activeTab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab(t)}
                    >
                        {LABELS[t]}
                    </button>
                ))}
            </div>

            {/* Active format */}
            <label className="block text-xs text-gray-600 mb-1">
                Active format for {LABELS[activeTab].toLowerCase()}
            </label>
            <FormatSelect
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm mb-3"
                value={current.activeFormat}
                formats={current.formats}
                onChange={(v) => void saveSettings(activeTab, current.formats, v)}
            />

            {/* List of formats */}
            {current.formats.length > 0 && (
                <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-1">Available formats</label>
                    <div className="space-y-1">
                        {current.formats.map((f) => (
                            <div key={f}
                                 className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm">
                                <span className="font-mono">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add new format */}
            <label className="block text-xs text-gray-600 mb-1">Add format</label>
            <div className="flex gap-2">
                <input
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                    placeholder={`e.g. ${FORMAT_PLACEHOLDERS[activeTab]}`}
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFormat()}
                />
                <button
                    className="px-3 py-1 text-sm border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                    onClick={addFormat}
                    disabled={!newFormat.trim()}
                >
                    Add
                </button>
            </div>
        </div>
    );
}

export default defineClient({
    hooks: {
        'blog-update-sidebar-widget': (sdk, _prev, context) => <PermalinkWidget
            sdk={sdk} context={context} type={"posts"} _id={context.blogId}/>,
        'tag-update-sidebar-widget': (sdk, _prev, context) => <PermalinkWidget
            sdk={sdk} context={context} type={"tags"} _id={context.tagId}/>,
        'category-update-sidebar-widget': (sdk, _prev, context) => <PermalinkWidget
            sdk={sdk} context={context} type={"categories"} _id={context.categoryId}/>,
        'user-update-sidebar-widget': (sdk, _prev, context) => <PermalinkWidget
            sdk={sdk} context={context} type={"users"} _id={context.userId}/>,
        'system:plugin:settings-panel': (sdk, _prev, context) => <SettingsPanel sdk={sdk} context={context}/>
    },
    hasSettingsPanel: true
});
