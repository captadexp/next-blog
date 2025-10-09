import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import type {BlogJsonLdOverrides, SchemaType} from '../types/plugin-types.js';
import {LoadingSpinner} from './LoadingSpinner.js';
import {SchemaTypePicker} from './SchemaTypePicker.js';
import {ValidationErrors} from './ValidationErrors.js';
import {FieldOverrides} from './FieldOverrides.js';
import {JsonPreview} from './JsonPreview.js';

interface BlogSidebarWidgetProps {
    sdk: ClientSDK;
    isLoading: boolean;
    currentOverrides: BlogJsonLdOverrides;
    jsonPreview: string;
    showPreview: boolean;
    isGeneratingPreview: boolean;
    showFieldOverrides: boolean;
    validationErrors: Array<{ field: string; message: string }>;
    onTypeChange: (type: SchemaType) => void;
    onOverrideToggle: (field: string, enabled: boolean) => void;
    onCustomValueChange: (field: string, value: any) => void;
    onPreviewToggle: () => void;
    onFieldOverridesToggle: () => void;
    onSave: () => void;
}

export function BlogSidebarWidget({
                                      sdk,
                                      isLoading,
                                      currentOverrides,
                                      jsonPreview,
                                      showPreview,
                                      isGeneratingPreview,
                                      showFieldOverrides,
                                      validationErrors,
                                      onTypeChange,
                                      onOverrideToggle,
                                      onCustomValueChange,
                                      onPreviewToggle,
                                      onFieldOverridesToggle,
                                      onSave
                                  }: BlogSidebarWidgetProps) {
    if (isLoading) {
        return <LoadingSpinner/>;
    }

    return (
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <span className="text-lg mr-2">🏷️</span>
                    <h3 className="text-lg font-semibold">JSON-LD Structured Data</h3>
                </div>
                <button
                    onClick={onPreviewToggle}
                    className="px-3 py-1 text-sm bg-gray-100 rounded border-none cursor-pointer hover:bg-gray-200"
                >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
            </div>

            <SchemaTypePicker
                selectedType={currentOverrides['@type'] || 'Article'}
                onTypeChange={onTypeChange}
            />

            <ValidationErrors errors={validationErrors}/>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium">Field Overrides</h4>
                    <button
                        onClick={onFieldOverridesToggle}
                        className="px-3 py-1 text-sm bg-gray-100 rounded border-none cursor-pointer hover:bg-gray-200"
                    >
                        {showFieldOverrides ? 'Hide' : 'Show'}
                    </button>
                </div>

                {showFieldOverrides && (
                    <FieldOverrides
                        schemaType={currentOverrides['@type'] || 'Article'}
                        overrides={currentOverrides}
                        onOverrideToggle={onOverrideToggle}
                        onCustomValueChange={onCustomValueChange}
                    />
                )}
            </div>

            {showPreview && (
                <JsonPreview
                    jsonPreview={jsonPreview}
                    isGeneratingPreview={isGeneratingPreview}
                    sdk={sdk}
                />
            )}

            <button
                onClick={onSave}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded border-none cursor-pointer transition-colors duration-200 hover:bg-blue-600"
            >
                Save JSON-LD Settings
            </button>
        </div>
    );
}