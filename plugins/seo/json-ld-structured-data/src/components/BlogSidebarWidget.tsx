import type {BlogEditorContext, ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useMemo, useRef, useState} from '@supergrowthai/plugin-dev-kit/client';
import {ClientError, handleRPCResponse, RPCResponse, ValidationError} from '../errors.js';
import {SchemaTypePicker} from './SchemaTypePicker.js';
import {BasicFields} from './BasicFields.js';
import {TypeSpecificFields} from './TypeSpecificFields.js';
import {AdvancedFields} from './AdvancedFields.js';
import {JsonPreview} from './JsonPreview.js';
import {JsonLdSchema} from "../types";

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

export function BlogSidebarWidget({sdk, context}: { sdk: ClientSDK; context: BlogEditorContext }) {
    const blogId = context?.blogId as string | undefined;
    const [overrides, setOverrides] = useState<any>({});
    const [originalOverrides, setOriginalOverrides] = useState<any>({});
    const [config, setConfig] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'typeSpecific'>('basic');
    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!blogId) return;
        Promise.all([
            sdk.callRPC('json-ld-structured-data:blog:get', {blogId}),
            sdk.callRPC('json-ld-structured-data:config:get', {})
        ]).then(([blogResp, configResp]) => {
            if (blogResp.code !== 0) {
                sdk.notify(blogResp.message, 'error');
                return;
            }
            if (configResp.code !== 0) {
                sdk.notify(configResp.message, 'error');
                return;
            }
            const overridesData = blogResp.payload || {};
            setOverrides(structuredClone(overridesData));
            setOriginalOverrides(structuredClone(overridesData));
            setConfig(configResp.payload || {});
        });
    }, [blogId, sdk]);

    const saveOverrides = useCallback(async (newOverrides: any) => {
        if (!blogId) return;
        setSaving(true);
        const resp = await sdk.callRPC('json-ld-structured-data:blog:set', {blogId, overrides: newOverrides});
        if (resp.code !== 0) {
            sdk.notify(resp.message, 'error');
        } else {
            setOverrides(newOverrides);
            setOriginalOverrides(structuredClone(newOverrides));
            sdk.notify('Settings saved successfully', 'success');
        }
        setSaving(false);
    }, [blogId, sdk]);

    // Debounced save function
    const debouncedSaveOverrides = useCallback((newOverrides: any) => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for save
        saveTimeoutRef.current = setTimeout(() => {
            saveOverrides(newOverrides);
            saveTimeoutRef.current = null;
        }, 500) as unknown as number; // 500ms debounce
    }, [saveOverrides]);

    const hasChanges = useMemo(() => {
        return !deepEqual(overrides, originalOverrides);
    }, [overrides, originalOverrides]);

    const saveCurrentOverrides = useCallback(async () => {
        await saveOverrides(overrides);
    }, [saveOverrides, overrides]);

    const generatePreview = useCallback(async () => {
        if (!blogId) return;

        try {
            const resp: RPCResponse<JsonLdSchema> = await sdk.callRPC('json-ld-structured-data:generate', {blogId});
            const jsonLd = handleRPCResponse(resp);

            setPreview(jsonLd);
            setShowPreview(true);
            setValidationErrors([]); // Clear any previous validation errors

            // Context-aware validation warnings
            const warnings: string[] = [];
            const blogTitle = context?.form?.data?.title || context?.data?.title;
            const blogExcerpt = context?.form?.data?.excerpt || context?.data?.excerpt;

            if (!jsonLd?.headline && !blogTitle) {
                warnings.push('Missing headline (no title in blog)');
            }
            if (!jsonLd?.description && !blogExcerpt) {
                warnings.push('Missing description (no excerpt in blog)');
            }
            if (!jsonLd?.author?.name && !overrides.hideAuthor) {
                warnings.push('Missing author name');
            }

            setValidationErrors(warnings);

        } catch (error: any) {
            if (error instanceof ValidationError) {
                // Show validation error in the UI
                setValidationErrors([error.message]);
                setPreview(null);
                setShowPreview(false);
            } else {
                // Other errors get notified
                sdk.notify(error.message || 'Failed to generate preview', 'error');
                setPreview(null);
                setShowPreview(false);
            }
        }
    }, [blogId, sdk, context, overrides.hideAuthor]);

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

                if (field === 'featuredImage') {
                    updateField('featuredImageMedia', imageData);
                } else if (field.startsWith('images.')) {
                    const index = parseInt(field.split('.')[1]);
                    const images = [...(overrides.imagesMedia || [])];
                    images[index] = imageData;
                    updateField('imagesMedia', images);
                } else {
                    updateNestedField(field, imageData);
                }
            }
        } catch (error) {
            const clientError = new ClientError('Failed to select image', 'image-selection');
            sdk.notify(clientError.message, 'error');
        }
    }, [sdk, overrides, updateField, updateNestedField]);

    const addImageItem = useCallback(() => {
        const images = [...(overrides.imagesMedia || [])];
        images.push({mediaId: '', url: '', alt: ''});
        updateField('imagesMedia', images);
    }, [overrides, updateField]);

    const removeImageItem = useCallback((index: number) => {
        const images = [...(overrides.imagesMedia || [])];
        images.splice(index, 1);
        updateField('imagesMedia', images);
    }, [overrides, updateField]);

    const schemaType = overrides.type || config.article?.defaultType || 'Article';

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">JSON-LD Structured Data</h3>
                <p className="text-xs text-gray-500 mt-1">Configure schema.org structured data for better SEO</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`px-3 py-2 text-xs font-medium ${activeTab === 'basic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('basic')}
                >
                    Basic
                </button>
                <button
                    className={`px-3 py-2 text-xs font-medium ${activeTab === 'typeSpecific' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('typeSpecific')}
                >
                    Type-Specific
                </button>
                <button
                    className={`px-3 py-2 text-xs font-medium ${activeTab === 'advanced' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('advanced')}
                >
                    Advanced
                </button>
            </div>

            <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                {activeTab === 'basic' && (
                    <>
                        <SchemaTypePicker
                            value={schemaType}
                            onChange={(value) => updateField('type', value)}
                        />
                        <BasicFields
                            overrides={overrides}
                            config={config}
                            context={context}
                            onFieldChange={updateField}
                            onNestedFieldChange={updateNestedField}
                            onSelectImage={selectImage}
                            onAddImage={addImageItem}
                            onRemoveImage={removeImageItem}
                        />
                    </>
                )}

                {activeTab === 'typeSpecific' && (
                    <TypeSpecificFields
                        schemaType={schemaType}
                        overrides={overrides}
                        onNestedFieldChange={updateNestedField}
                        onSelectImage={selectImage}
                    />
                )}

                {activeTab === 'advanced' && (
                    <AdvancedFields
                        overrides={overrides}
                        config={config}
                        onFieldChange={updateField}
                    />
                )}
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

                {validationErrors.length > 0 && (
                    <div className={`p-2 border rounded ${
                        validationErrors.some(error => error.includes('requires'))
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                    }`}>
                        <p className={`text-xs font-medium mb-1 ${
                            validationErrors.some(error => error.includes('requires'))
                                ? 'text-red-800'
                                : 'text-yellow-800'
                        }`}>
                            {validationErrors.some(error => error.includes('requires'))
                                ? 'Validation Errors:'
                                : 'Validation Warnings:'}
                        </p>
                        <ul className={`text-xs space-y-0.5 ${
                            validationErrors.some(error => error.includes('requires'))
                                ? 'text-red-700'
                                : 'text-yellow-700'
                        }`}>
                            {validationErrors.map((error, i) => (
                                <li key={`error-${i}`}>• {error}</li>
                            ))}
                        </ul>
                        <p className="text-xs text-gray-600 mt-1 italic">
                            {validationErrors.some(error => error.includes('requires'))
                                ? 'Please configure the required fields in the Type-Specific section.'
                                : 'Note: Fields without overrides will use blog data automatically'
                            }
                        </p>
                    </div>
                )}

                <JsonPreview
                    preview={preview}
                    show={showPreview}
                    onHide={() => setShowPreview(false)}
                />
            </div>
        </div>
    );
}