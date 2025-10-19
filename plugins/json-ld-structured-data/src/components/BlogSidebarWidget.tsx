import type {BlogEditorContext, ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useCallback, useEffect, useRef, useState} from '@supergrowthai/plugin-dev-kit/client';
import {SchemaTypePicker} from './SchemaTypePicker.js';
import {BasicFields} from './BasicFields.js';
import {TypeSpecificFields} from './TypeSpecificFields.js';
import {AdvancedFields} from './AdvancedFields.js';
import {JsonPreview} from './JsonPreview.js';

export function BlogSidebarWidget({sdk, context}: { sdk: ClientSDK; context: BlogEditorContext }) {
    const blogId = context?.blogId as string | undefined;
    const [overrides, setOverrides] = useState<any>({});
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
            sdk.callRPC('json-ld:blog:get', {blogId}),
            sdk.callRPC('json-ld:config:get', {})
        ]).then(([blogResp, configResp]) => {
            setOverrides(blogResp?.payload?.payload || {});
            setConfig(configResp?.payload?.payload || {});
        });
    }, [blogId, sdk]);

    const saveOverrides = useCallback(async (newOverrides: any) => {
        if (!blogId) return;
        setSaving(true);
        try {
            await sdk.callRPC('json-ld:blog:set', {blogId, overrides: newOverrides});
            setOverrides(newOverrides);
        } finally {
            setSaving(false);
        }
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
        }, 500); // 500ms debounce
    }, [saveOverrides]);

    const generatePreview = useCallback(async () => {
        if (!blogId) return;
        const resp = await sdk.callRPC('json-ld:generate', {blogId});
        setPreview(resp?.payload?.payload);
        setShowPreview(true);

        // Improved validation that considers context data
        const errors: string[] = [];
        const jsonLd = resp?.payload?.payload;
        const blogTitle = context?.form?.data?.title || context?.data?.title;
        const blogExcerpt = context?.form?.data?.excerpt || context?.data?.excerpt;

        // Only show error if no headline at all (neither override nor blog title)
        if (!jsonLd?.headline && !blogTitle) {
            errors.push('Missing headline (no title in blog)');
        }
        // Only show error if no description at all
        if (!jsonLd?.description && !blogExcerpt) {
            errors.push('Missing description (no excerpt in blog)');
        }
        // Only show error if author is completely missing
        if (!jsonLd?.author?.name && !overrides.hideAuthor) {
            errors.push('Missing author name');
        }

        setValidationErrors(errors);
    }, [blogId, sdk, context, overrides.hideAuthor]);

    const updateField = useCallback((field: string, value: any) => {
        const newOverrides = {...overrides, [field]: value};
        setOverrides(newOverrides);
        debouncedSaveOverrides(newOverrides);
    }, [overrides, debouncedSaveOverrides]);

    const updateNestedField = useCallback((path: string, value: any) => {
        const keys = path.split('.');
        const newOverrides = {...overrides};
        let obj = newOverrides;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = value;
        setOverrides(newOverrides);
        debouncedSaveOverrides(newOverrides);
    }, [overrides, debouncedSaveOverrides]);

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
            sdk.notify('Failed to select image', 'error');
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
                <button
                    className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    onClick={generatePreview}
                >
                    Generate Preview
                </button>

                {validationErrors.length > 0 && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs font-medium text-yellow-800 mb-1">Validation Warnings:</p>
                        <ul className="text-xs text-yellow-700 space-y-0.5">
                            {validationErrors.map((error, i) => (
                                <li key={`error-${i}`}>• {error}</li>
                            ))}
                        </ul>
                        <p className="text-xs text-gray-600 mt-1 italic">
                            Note: Fields without overrides will use blog data automatically
                        </p>
                    </div>
                )}

                <JsonPreview
                    preview={preview}
                    show={showPreview}
                    onHide={() => setShowPreview(false)}
                />

                {saving && <div className="text-xs text-center text-gray-500">Saving…</div>}
            </div>
        </div>
    );
}