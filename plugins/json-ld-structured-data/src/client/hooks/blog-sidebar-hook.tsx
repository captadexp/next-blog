import {ClientSDK, PluginRuntime} from '@supergrowthai/plugin-dev-kit/client';
import {BlogSidebarWidget} from '../../components/index.js';
import type {BlogJsonLdOverrides, SchemaType} from '../../types/plugin-types.js';
import {getBlogOverrides, setBlogOverrides} from '../utils/plugin-state.js';
import {loadBlogData, loadGlobalSettings} from '../utils/data-loaders.js';
import {getSchemaTypeDefinition} from '../../schema/schema-definitions.js';

// Get global utils
const {utils} = (window as any).PluginRuntime as PluginRuntime;

// Local state for this hook - minimal and focused
interface BlogSidebarState {
    currentBlogId: string | null;
    jsonPreview: string;
    showPreview: boolean;
    isGeneratingPreview: boolean;
    showFieldOverrides: boolean;
    validationErrors: Array<{ field: string; message: string }>;
    currentPreviewRequest: AbortController | null;
}

const state: BlogSidebarState = {
    currentBlogId: null,
    jsonPreview: '',
    showPreview: false,
    isGeneratingPreview: false,
    showFieldOverrides: true,
    validationErrors: [],
    currentPreviewRequest: null
};

// Core preview generation logic
async function generatePreviewCore(sdk: ClientSDK, blogId: string, overrides: BlogJsonLdOverrides) {
    // Cancel previous request
    if (state.currentPreviewRequest) {
        state.currentPreviewRequest.abort();
    }

    const abortController = new AbortController();
    state.currentPreviewRequest = abortController;
    state.isGeneratingPreview = true;
    sdk.refresh();

    try {
        const response = await sdk.callRPC('jsonLd:generatePreview', {
            blogId,
            overrides
        });

        if (abortController.signal.aborted) return;

        const {jsonLd, validation} = response.payload.payload;
        state.jsonPreview = JSON.stringify(jsonLd, null, 2);
        state.validationErrors = validation?.errors || [];
        state.currentPreviewRequest = null;
        state.isGeneratingPreview = false;
    } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
            state.jsonPreview = 'Error generating preview';
            state.validationErrors = [];
            state.currentPreviewRequest = null;
            state.isGeneratingPreview = false;
        }
    }
    sdk.refresh();
}

// Core save logic
async function saveBlogOverridesCore(sdk: ClientSDK, blogId: string, overrides: BlogJsonLdOverrides) {
    try {
        await sdk.callRPC('jsonLd:saveBlogOverrides', {
            blogId,
            overrides
        });
        sdk.notify('JSON-LD settings saved', 'success');
    } catch (error) {
        sdk.notify('Failed to save JSON-LD settings', 'error');
        throw error;
    }
}

// Create debounced/throttled functions once at module level
const debouncedGeneratePreview = utils.debounce(generatePreviewCore, 1500);
const throttledSave = utils.throttle(saveBlogOverridesCore, 2000);

export function useBlogSidebarHook(sdk: ClientSDK, prev: any, context: any) {
    if (!context?.blogId) {
        throw new Error('Blog context is required');
    }

    // Simple initialization check
    if (state.currentBlogId !== context.blogId) {
        state.currentBlogId = context.blogId;
        loadGlobalSettings(sdk);
        loadBlogData(sdk, context);
    }

    const currentOverrides = getBlogOverrides(context.blogId);

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

        setBlogOverrides(context.blogId, updatedOverrides);
        sdk.refresh();
        debouncedGeneratePreview(sdk, context.blogId, updatedOverrides);
    };

    const handleOverrideToggle = (field: string, enabled: boolean) => {
        const updatedOverrides = {
            ...currentOverrides,
            overrides: {
                ...currentOverrides.overrides,
                [field]: enabled
            }
        };
        setBlogOverrides(context.blogId, updatedOverrides);
        sdk.refresh();
        debouncedGeneratePreview(sdk, context.blogId, updatedOverrides);
    };

    const handleCustomValueChange = (field: string, value: any) => {
        const updatedOverrides = {
            ...currentOverrides,
            custom: {
                ...currentOverrides.custom,
                [field]: value
            }
        };
        setBlogOverrides(context.blogId, updatedOverrides);
        sdk.refresh();
        debouncedGeneratePreview(sdk, context.blogId, updatedOverrides);
    };

    const handlePreviewToggle = () => {
        state.showPreview = !state.showPreview;
        if (state.showPreview) {
            debouncedGeneratePreview(sdk, context.blogId, currentOverrides);
        }
        sdk.refresh();
    };

    const handleFieldOverridesToggle = () => {
        state.showFieldOverrides = !state.showFieldOverrides;
        sdk.refresh();
    };

    const handleSave = () => {
        throttledSave(sdk, context.blogId, currentOverrides);
    };

    return (
        <BlogSidebarWidget
            sdk={sdk}
            isLoading={false}
            currentOverrides={currentOverrides}
            jsonPreview={state.jsonPreview}
            showPreview={state.showPreview}
            isGeneratingPreview={state.isGeneratingPreview}
            showFieldOverrides={state.showFieldOverrides}
            validationErrors={state.validationErrors}
            onTypeChange={handleTypeChange}
            onOverrideToggle={handleOverrideToggle}
            onCustomValueChange={handleCustomValueChange}
            onPreviewToggle={handlePreviewToggle}
            onFieldOverridesToggle={handleFieldOverridesToggle}
            onSave={handleSave}
        />
    );
}