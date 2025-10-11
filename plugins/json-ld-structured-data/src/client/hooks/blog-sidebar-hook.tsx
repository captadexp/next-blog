import { useState, useEffect, useCallback, useRef } from '@supergrowthai/plugin-dev-kit/client';
import { BlogSidebarWidget } from '../../components/index.js';
import type { BlogJsonLdOverrides, SchemaType } from '../../types/plugin-types.js';
import { getSchemaTypeDefinition } from '../../schema/schema-definitions.js';

export function useBlogSidebarHook(sdk: any, prev: any, context: any) {
    if (!context.blogId) {
        throw new Error('Blog ID is required');
    }

    const [overrides, setOverrides] = useState<BlogJsonLdOverrides | null>(null);
    const [jsonPreview, setJsonPreview] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [showFieldOverrides, setShowFieldOverrides] = useState(true);
    const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([]);

    const abortControllerRef = useRef<AbortController | null>(null);
    const prevBlogIdRef = useRef<string | null>(null);

    const loadBlogData = useCallback(async () => {
        const response = await sdk.callRPC('jsonLd:getBlogOverrides', { blogId: context.blogId });
        setOverrides(response.payload);
    }, [context.blogId, sdk]);

    useEffect(() => {
        if (prevBlogIdRef.current !== context.blogId) {
            prevBlogIdRef.current = context.blogId;
            loadBlogData();
        }
    }, [context.blogId, loadBlogData]);

    // Debounced preview generation
    const generatePreview = useCallback(
        sdk.utils.debounce(async (blogId: string, currentOverrides: BlogJsonLdOverrides) => {
            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const abortController = new AbortController();
            abortControllerRef.current = abortController;
            setIsGeneratingPreview(true);

            try {
                const response = await sdk.callRPC('jsonLd:generatePreview', {
                    blogId,
                    overrides: currentOverrides
                });

                if (abortController.signal.aborted) return;

                const { jsonLd, validation } = response.payload.payload;
                setJsonPreview(JSON.stringify(jsonLd, null, 2));
                setValidationErrors(validation.errors);
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    throw error;
                }
            } finally {
                setIsGeneratingPreview(false);
                abortControllerRef.current = null;
            }
        }, 1500),
        [sdk]
    );

    // Save overrides with throttling
    const saveOverrides = useCallback(
        sdk.utils.throttle(async (blogId: string, currentOverrides: BlogJsonLdOverrides) => {
            await sdk.callRPC('jsonLd:saveBlogOverrides', {
                blogId,
                overrides: currentOverrides
            });
        }, 2000),
        [sdk]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleTypeChange = useCallback((newType: SchemaType) => {
        const newSchemaDefinition = getSchemaTypeDefinition(newType);
        if (!newSchemaDefinition) return;

        // Get the field keys for the new schema type
        const newFieldKeys = new Set(newSchemaDefinition.fields.map(field => field.key));

        // Preserve existing overrides and custom values for fields that exist in the new schema
        const preservedOverrides: Record<string, boolean> = {};
        const preservedCustom: Record<string, any> = {};

        if (!overrides) return;

        // Preserve compatible overrides
        Object.entries(overrides.overrides || {}).forEach(([key, value]) => {
            if (newFieldKeys.has(key)) {
                preservedOverrides[key] = value;
            }
        });

        // Preserve compatible custom values
        Object.entries(overrides.custom || {}).forEach(([key, value]) => {
            if (newFieldKeys.has(key)) {
                preservedCustom[key] = value;
            }
        });

        // For HowTo type, initialize important fields as overridden by default
        if (newType === 'HowTo') {
            if (!preservedOverrides.steps) {
                preservedOverrides.steps = true;
                if (!preservedCustom.steps) {
                    preservedCustom.steps = [];
                }
            }
        }

        const updatedOverrides = {
            '@type': newType,
            overrides: preservedOverrides,
            custom: preservedCustom
        };

        setOverrides(updatedOverrides);
        generatePreview(context.blogId, updatedOverrides);
    }, [overrides, context.blogId, generatePreview]);

    const handleOverrideToggle = useCallback((field: string, enabled: boolean) => {
        if (!overrides) return;

        const updatedOverrides = {
            ...overrides,
            overrides: {
                ...overrides.overrides,
                [field]: enabled
            }
        };
        setOverrides(updatedOverrides);
        generatePreview(context.blogId, updatedOverrides);
    }, [overrides, context.blogId, generatePreview]);

    const handleCustomValueChange = useCallback((field: string, value: any) => {
        if (!overrides) return;

        const updatedOverrides = {
            ...overrides,
            custom: {
                ...overrides.custom,
                [field]: value
            }
        };
        setOverrides(updatedOverrides);
        generatePreview(context.blogId, updatedOverrides);
    }, [overrides, context.blogId, generatePreview]);

    const handlePreviewToggle = useCallback(() => {
        const newShowPreview = !showPreview;
        setShowPreview(newShowPreview);
        if (newShowPreview) {
            generatePreview(context.blogId, overrides);
        }
    }, [showPreview, context.blogId, overrides, generatePreview]);

    const handleFieldOverridesToggle = useCallback(() => {
        setShowFieldOverrides(!showFieldOverrides);
    }, [showFieldOverrides]);

    const handleSave = useCallback(() => {
        saveOverrides(context.blogId, overrides);
    }, [context.blogId, overrides, saveOverrides]);

    if (!overrides) {
        return null;
    }

    return (
        <BlogSidebarWidget
            sdk={sdk}
            isLoading={false}
            currentOverrides={overrides}
            jsonPreview={jsonPreview || ''}
            showPreview={showPreview}
            isGeneratingPreview={isGeneratingPreview}
            showFieldOverrides={showFieldOverrides}
            validationErrors={validationErrors}
            onTypeChange={handleTypeChange}
            onOverrideToggle={handleOverrideToggle}
            onCustomValueChange={handleCustomValueChange}
            onPreviewToggle={handlePreviewToggle}
            onFieldOverridesToggle={handleFieldOverridesToggle}
            onSave={handleSave}
        />
    );
}