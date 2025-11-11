import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useMemo, useState} from '@supergrowthai/plugin-dev-kit/client';
import {ClientError, handleRPCResponse, isValidationError} from '../errors.js';

const ENTITY_SCHEMA_TYPES = {
    tag: [
        {value: 'Thing', label: 'Thing (Generic)'},
        {value: 'DefinedTerm', label: 'Defined Term'},
        {value: 'CategoryCode', label: 'Category Code'},
        {value: 'Keyword', label: 'Keyword'}
    ],
    category: [
        {value: 'Thing', label: 'Thing (Generic)'},
        {value: 'CategoryCode', label: 'Category Code'},
        {value: 'DefinedTerm', label: 'Defined Term'},
        {value: 'Organization', label: 'Organization'}
    ],
    user: [
        {value: 'Person', label: 'Person'},
        {value: 'Organization', label: 'Organization'},
        {value: 'Brand', label: 'Brand'}
    ]
};

const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, i) => deepEqual(item, b[i]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
};

interface GenericSidebarWidgetProps {
    sdk: ClientSDK;
    context: any;
    entityType: 'tag' | 'category' | 'user';
    entityId: string | undefined;
    title: string;
    description: string;
}

export function GenericSidebarWidget({
                                         sdk,
                                         context,
                                         entityType,
                                         entityId,
                                         title,
                                         description
                                     }: GenericSidebarWidgetProps) {
    const [overrides, setOverrides] = useState<any>({});
    const [originalOverrides, setOriginalOverrides] = useState<any>({});
    const [config, setConfig] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const [needsAutoSave, setNeedsAutoSave] = useState(false);

    useEffect(() => {
        if (!entityId) return;
        Promise.all([
            sdk.callRPC(`json-ld-structured-data:${entityType}:get`, {[`${entityType}Id`]: entityId}),
            sdk.callRPC('json-ld-structured-data:config:get', {})
        ]).then(([entityResp, configResp]) => {
            if (entityResp.code !== 0) {
                sdk.notify(entityResp.message, 'error');
                return;
            }
            if (configResp.code !== 0) {
                sdk.notify(configResp.message, 'error');
                return;
            }

            const overridesData = entityResp.payload.payload || {};
            const defaultSchemaType = entityType === 'user' ? 'Person' : entityType === 'category' ? 'CategoryCode' : 'DefinedTerm';

            const dataWithSchemaType = {
                schemaType: defaultSchemaType,
                ...overridesData
            };

            setOverrides(structuredClone(dataWithSchemaType));
            setOriginalOverrides(structuredClone(dataWithSchemaType));
            setConfig(configResp.payload.payload || {});

            if (!overridesData.schemaType) {
                setNeedsAutoSave(true);
            }
        });
    }, [entityId, entityType, sdk]);

    const saveOverrides = useCallback(async (newOverrides: any) => {
        if (!entityId) return;
        setSaving(true);
        const resp = await sdk.callRPC(`json-ld-structured-data:${entityType}:set`, {
            [`${entityType}Id`]: entityId,
            overrides: newOverrides
        });
        if (resp.code !== 0) {
            sdk.notify(resp.message, 'error');
        } else {
            setOverrides(newOverrides);
            setOriginalOverrides(structuredClone(newOverrides));
            sdk.notify('Settings saved successfully', 'success');
        }
        setSaving(false);
    }, [entityId, entityType, sdk]);

    // Auto-save default schema type when needed
    useEffect(() => {
        if (needsAutoSave && overrides.schemaType && !saving) {
            saveOverrides(overrides);
            setNeedsAutoSave(false);
        }
    }, [needsAutoSave, overrides, saving, saveOverrides]);

    const hasChanges = useMemo(() => {
        return !deepEqual(overrides, originalOverrides);
    }, [overrides, originalOverrides]);

    const saveCurrentOverrides = useCallback(async () => {
        await saveOverrides(overrides);
    }, [saveOverrides, overrides]);

    const generatePreview = useCallback(async () => {
        if (!entityId) return;

        try {
            const resp = await sdk.callRPC(`json-ld-structured-data:${entityType}:generate`, {
                [`${entityType}Id`]: entityId
            });
            const jsonLd = handleRPCResponse(resp);

            setPreview(jsonLd);
            setShowPreview(true);
            setValidationError(null);

        } catch (error) {
            if (isValidationError(error)) {
                // Show validation error in the UI
                setValidationError(error.message);
                setPreview(null);
                setShowPreview(false);
            } else {
                // Other errors get notified
                sdk.notify(error.message || 'Failed to generate preview', 'error');
                setPreview(null);
                setShowPreview(false);
            }
        }
    }, [entityId, entityType, sdk]);

    const updateField = useCallback((field: string, value: any) => {
        const newOverrides = {...overrides, [field]: value};
        setOverrides(newOverrides);
    }, [overrides]);

    const updateNestedField = useCallback((path: string, value: any) => {
        const keys = path.split('.');
        const newOverrides = {...overrides};
        let obj = newOverrides;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj[keys[i]] = {...obj[keys[i]]};
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = value;
        setOverrides(newOverrides);
    }, [overrides]);

    const selectImage = useCallback(async (field: string) => {
        try {
            const response: any = await sdk.startIntent('select-media', {
                options: {
                    mediaType: 'image',
                    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
                    maxSize: 5 * 1024 * 1024,
                    allowUpload: false
                }
            });

            if (response && response.media) {
                const imageData = {
                    mediaId: response.media._id,
                    url: response.media.url,
                    alt: response.media.alt || '',
                    width: response.media.metadata?.width,
                    height: response.media.metadata?.height
                };

                updateNestedField(field, imageData);
            }
        } catch (error) {
            const clientError = new ClientError('Failed to select image', 'image-selection');
            sdk.notify(clientError.message, 'error');
        }
    }, [sdk, updateNestedField]);

    const entityName = context?.form?.data?.name || context?.data?.name || context?.form?.data?.title || context?.data?.title || '';
    const schemaTypes = ENTITY_SCHEMA_TYPES[entityType];
    const defaultSchemaType = entityType === 'user' ? 'Person' : entityType === 'category' ? 'CategoryCode' : 'DefinedTerm';
    const currentSchemaType = overrides.schemaType || defaultSchemaType;

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>

            <div className="p-3 space-y-3">
                {/* Schema Type Selection */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Schema Type</label>
                    <select
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                        value={currentSchemaType}
                        onChange={e => updateField('schemaType', e.target.value)}
                    >
                        {schemaTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Choose the structured data schema type to generate</p>
                </div>

                {/* Basic Schema Fields */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name Override</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                        placeholder={entityName || `${entityType} name`}
                        value={overrides.name || ''}
                        onChange={e => updateField('name', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Override the default {entityType} name</p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm h-20 resize-none focus:ring-1 focus:ring-blue-500"
                        placeholder={`Describe this ${entityType}`}
                        value={overrides.description || ''}
                        onChange={e => updateField('description', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Provide a description for better SEO</p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                    <input
                        type="url"
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                        placeholder={`https://example.com/${entityType}s/...`}
                        value={overrides.url || ''}
                        onChange={e => updateField('url', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Override the canonical URL</p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Image</label>
                    {overrides.imageMedia ? (
                        <div className="inline-block p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex flex-col items-center space-y-2">
                                <img
                                    src={overrides.imageMedia.url}
                                    alt={overrides.imageMedia.alt}
                                    className="w-20 h-20 object-contain border border-gray-300 rounded bg-white p-1"
                                />
                                <input
                                    type="text"
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Alt text"
                                    value={overrides.imageMedia.alt || ''}
                                    onChange={e => {
                                        const updated = {
                                            ...overrides.imageMedia,
                                            alt: e.target.value
                                        };
                                        updateField('imageMedia', updated);
                                    }}
                                />
                                <button
                                    className="text-xs text-red-600 hover:text-red-700"
                                    onClick={() => updateField('imageMedia', null)}
                                >
                                    Remove Image
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                            onClick={() => selectImage('imageMedia')}
                        >
                            Select Image from Media Library
                        </button>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-gray-200 space-y-2">
                {hasChanges && (
                    <button
                        className="w-full px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={saveCurrentOverrides}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                )}

                <button
                    className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    onClick={generatePreview}
                >
                    Generate Preview
                </button>

                {validationError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs font-medium text-red-800 mb-1">Validation Error:</p>
                        <p className="text-xs text-red-700">{validationError}</p>
                        <p className="text-xs text-gray-600 mt-1 italic">
                            Please configure the required fields in the Type-Specific section or ensure
                            your {entityType} has the necessary data.
                        </p>
                    </div>
                )}

                {showPreview && preview && (
                    <div className="mt-2">
                        <div className="bg-gray-50 border border-gray-200 rounded p-2">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-700">JSON-LD Preview</h4>
                                <button
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowPreview(false)}
                                >
                                    Hide
                                </button>
                            </div>
                            <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                                {JSON.stringify(preview, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}