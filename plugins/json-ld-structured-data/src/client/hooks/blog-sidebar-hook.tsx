import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {BlogSidebarWidget} from '../../components/index.js';
import type {BlogJsonLdOverrides, SchemaType} from '../../types/plugin-types.js';
import {getBlogOverrides, getPluginState, setBlogOverrides, updatePluginState} from '../utils/plugin-state.js';
import {loadBlogData, loadGlobalSettings} from '../utils/data-loaders.js';
import {getSchemaTypeDefinition} from '../../schema/schema-definitions.js';

export function useBlogSidebarHook(sdk: ClientSDK, prev: any, context: any) {
    const state = getPluginState();

    // Initialize blog data loading
    if (!state.initialized || state.currentBlogId !== context?.blogId) {
        if (!state.initialized) {
            updatePluginState({initialized: true});
            loadGlobalSettings(sdk);
        }

        if (state.currentBlogId !== context?.blogId) {
            updatePluginState({currentBlogId: context?.blogId});
            loadBlogData(sdk, context);
        }
    }

    const currentOverrides = getBlogOverrides(state.currentBlogId || '');

    // Debounced preview generation to avoid excessive API calls
    const debouncedGeneratePreview = sdk.utils!.debounce(async (sdk: ClientSDK, overrides: BlogJsonLdOverrides) => {
        try {
            if (!state.currentBlogId) return;

            // Cancel previous request if still pending
            if (state.currentPreviewRequest) {
                state.currentPreviewRequest.abort();
            }

            // Create new abort controller for this request
            const abortController = new AbortController();
            updatePluginState({currentPreviewRequest: abortController});

            const response = await sdk.callRPC('jsonLd:generatePreview', {
                blogId: state.currentBlogId,
                overrides
            });

            // Check if request was aborted
            if (abortController.signal.aborted) {
                return;
            }

            const {jsonLd, validation} = response.payload.payload;
            updatePluginState({
                jsonPreview: JSON.stringify(jsonLd, null, 2),
                validationErrors: validation?.errors || [],
                currentPreviewRequest: null
            });
        } catch (error) {
            // Don't show error if request was aborted
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }

            sdk.log.error('Failed to generate preview:', error);
            updatePluginState({
                jsonPreview: 'Error generating preview',
                validationErrors: [],
                currentPreviewRequest: null
            });
        }
        sdk.refresh();
    }, 1500);

    // Throttled save function to prevent rapid clicking
    const throttledSave = sdk.utils!.throttle(async () => {
        if (!state.currentBlogId) return;
        try {
            await sdk.callRPC('jsonLd:saveBlogOverrides', {
                blogId: state.currentBlogId,
                overrides: currentOverrides
            });
            sdk.notify('JSON-LD settings saved', 'success');
        } catch (error) {
            sdk.log.error('Failed to save blog overrides:', error);
            sdk.notify('Failed to save JSON-LD settings', 'error');
        }
    }, 2000);

    const handleTypeChange = (newType: SchemaType) => {
        const newSchemaDefinition = getSchemaTypeDefinition(newType);
        if (!newSchemaDefinition) return;

        // Get the field keys for the new schema type
        const newFieldKeys = new Set(newSchemaDefinition.fields.map(field => field.key));

        // Preserve existing overrides and custom values for fields that exist in the new schema
        const preservedOverrides: Record<string, boolean> = {};
        const preservedCustom: Record<string, any> = {};

        // Preserve compatible overrides
        Object.entries(currentOverrides.overrides || {}).forEach(([key, value]) => {
            if (newFieldKeys.has(key)) {
                preservedOverrides[key] = value;
            }
        });

        // Preserve compatible custom values
        Object.entries(currentOverrides.custom || {}).forEach(([key, value]) => {
            if (newFieldKeys.has(key)) {
                preservedCustom[key] = value;
            }
        });

        // For HowTo type, initialize important fields as overridden by default
        if (newType === 'HowTo') {
            // Initialize steps field as overridden with empty array if not already set
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

        setBlogOverrides(state.currentBlogId || '', updatedOverrides);
        sdk.refresh();
        debouncedGeneratePreview(sdk, updatedOverrides);
    };

    const handleOverrideToggle = (field: string, enabled: boolean) => {
        const updatedOverrides = {
            ...currentOverrides,
            overrides: {
                ...currentOverrides.overrides,
                [field]: enabled
            }
        };
        setBlogOverrides(state.currentBlogId || '', updatedOverrides);
        sdk.refresh();
        debouncedGeneratePreview(sdk, updatedOverrides);
    };

    const handleCustomValueChange = (field: string, value: any) => {
        const updatedOverrides = {
            ...currentOverrides,
            custom: {
                ...currentOverrides.custom,
                [field]: value
            }
        };
        setBlogOverrides(state.currentBlogId || '', updatedOverrides);
        sdk.refresh();
        debouncedGeneratePreview(sdk, updatedOverrides);
    };

    const generatePreview = async (sdk: ClientSDK, overrides: BlogJsonLdOverrides = currentOverrides) => {
        try {
            if (!state.currentBlogId) return;

            // Cancel previous request if still pending
            if (state.currentPreviewRequest) {
                state.currentPreviewRequest.abort();
            }

            // Create new abort controller for this request
            const abortController = new AbortController();
            updatePluginState({currentPreviewRequest: abortController});

            const response = await sdk.callRPC('jsonLd:generatePreview', {
                blogId: state.currentBlogId,
                overrides
            });

            // Check if request was aborted
            if (abortController.signal.aborted) {
                return;
            }

            const {jsonLd, validation} = response.payload.payload;
            updatePluginState({
                jsonPreview: JSON.stringify(jsonLd, null, 2),
                validationErrors: validation?.errors || [],
                currentPreviewRequest: null
            });
        } catch (error) {
            // Don't show error if request was aborted
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }

            sdk.log.error('Failed to generate preview:', error);
            updatePluginState({
                jsonPreview: 'Error generating preview',
                validationErrors: [],
                currentPreviewRequest: null
            });
        }
        sdk.refresh();
    };

    const saveBlogOverrides = throttledSave;

    const handlePreviewToggle = () => {
        updatePluginState({showPreview: !state.showPreview});
        if (!state.showPreview) {
            generatePreview(sdk);
        }
        sdk.refresh();
    };

    return (
        <BlogSidebarWidget
            sdk={sdk}
            isLoading={state.isLoadingBlogData || state.isLoadingSettings}
            currentOverrides={currentOverrides}
            jsonPreview={state.jsonPreview}
            showPreview={state.showPreview}
            validationErrors={state.validationErrors}
            onTypeChange={handleTypeChange}
            onOverrideToggle={handleOverrideToggle}
            onCustomValueChange={handleCustomValueChange}
            onPreviewToggle={handlePreviewToggle}
            onSave={saveBlogOverrides}
        />
    );
}