import type {
    CategoryEditorContext,
    ClientSDK,
    TagEditorContext,
    UserEditorContext
} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useRef, useState} from '@supergrowthai/plugin-dev-kit/client';

type ContentType = 'tags' | 'categories' | 'users';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    tags: 'Tag',
    categories: 'Category',
    users: 'User'
};

export function GenericSidebarWidget({sdk, context, type, _id}: {
    sdk: ClientSDK;
    context: TagEditorContext | CategoryEditorContext | UserEditorContext;
    type: ContentType;
    _id: string;
}) {
    const [overrides, setOverrides] = useState<any>({});
    const [config, setConfig] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!_id) return;
        Promise.all([
            sdk.callRPC('json-ld-structured-data:get', {type, _id}),
            sdk.callRPC('json-ld-structured-data:config:get', {})
        ]).then(([dataResp, configResp]) => {
            setOverrides(dataResp?.payload?.payload || {});
            setConfig(configResp?.payload?.payload || {});
        });
    }, [_id, type, sdk]);

    const saveOverrides = useCallback(async (newOverrides: any) => {
        if (!_id) return;
        setSaving(true);
        try {
            await sdk.callRPC('json-ld-structured-data:set', {type, _id, overrides: newOverrides});
            setOverrides(newOverrides);
        } finally {
            setSaving(false);
        }
    }, [_id, type, sdk]);

    const debouncedSaveOverrides = useCallback((newOverrides: any) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveOverrides(newOverrides);
            saveTimeoutRef.current = null;
        }, 500);
    }, [saveOverrides]);

    const updateField = useCallback((field: string, value: any) => {
        const newOverrides = {...overrides, [field]: value};
        setOverrides(newOverrides);
        debouncedSaveOverrides(newOverrides);
    }, [overrides, debouncedSaveOverrides]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">JSON-LD Structured Data</h3>
                <p className="text-xs text-gray-500 mt-1">Configure schema.org metadata for {CONTENT_TYPE_LABELS[type].toLowerCase()}</p>
            </div>

            <div className="p-3 space-y-3">
                {/* Headline/Name Override */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name Override
                    </label>
                    <input
                        type="text"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                        placeholder={`Default ${CONTENT_TYPE_LABELS[type].toLowerCase()} name will be used`}
                        value={overrides.headline || ''}
                        onChange={(e) => updateField('headline', e.target.value)}
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                        placeholder="Optional description for SEO"
                        value={overrides.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Keywords */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Keywords (comma-separated)
                    </label>
                    <input
                        type="text"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                        placeholder="keyword1, keyword2, keyword3"
                        value={overrides.keywords || ''}
                        onChange={(e) => updateField('keywords', e.target.value)}
                    />
                </div>

                {/* Language */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Language
                    </label>
                    <input
                        type="text"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                        placeholder={config.language || 'en-US'}
                        value={overrides.language || ''}
                        onChange={(e) => updateField('language', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">e.g., en-US, es-ES, fr-FR</p>
                </div>

                {/* Custom JSON */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Custom JSON Properties
                    </label>
                    <textarea
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm font-mono"
                        placeholder='{"customProperty": "value"}'
                        value={overrides.customJson || ''}
                        onChange={(e) => updateField('customJson', e.target.value)}
                        rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">Add custom schema.org properties as JSON</p>
                </div>

                {saving && (
                    <div className="text-xs text-center text-gray-500">Saving…</div>
                )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-600">
                    <strong>Note:</strong> This metadata will be available for use in your templates via the metadata field.
                    Implement JSON-LD rendering in your {CONTENT_TYPE_LABELS[type].toLowerCase()} templates to use this data.
                </p>
            </div>
        </div>
    );
}
