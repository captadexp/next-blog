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
    validationErrors: Array<{ field: string; message: string }>;
    onTypeChange: (type: SchemaType) => void;
    onOverrideToggle: (field: string, enabled: boolean) => void;
    onCustomValueChange: (field: string, value: any) => void;
    onPreviewToggle: () => void;
    onSave: () => void;
}

export function BlogSidebarWidget({
                                      sdk,
                                      isLoading,
                                      currentOverrides,
                                      jsonPreview,
                                      showPreview,
                                      validationErrors,
                                      onTypeChange,
                                      onOverrideToggle,
                                      onCustomValueChange,
                                      onPreviewToggle,
                                      onSave
                                  }: BlogSidebarWidgetProps) {
    if (isLoading) {
        return <LoadingSpinner/>;
    }

    return (
        <div style={{
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            backgroundColor: 'white'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <span style={{
                        fontSize: '1.125rem',
                        marginRight: '0.5rem'
                    }}>🏷️</span>
                    <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600'
                    }}>JSON-LD Structured Data</h3>
                </div>
                <button
                    onClick={onPreviewToggle}
                    style={{
                        paddingLeft: '0.75rem',
                        paddingRight: '0.75rem',
                        paddingTop: '0.25rem',
                        paddingBottom: '0.25rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
            </div>

            <SchemaTypePicker
                selectedType={currentOverrides['@type'] || 'Article'}
                onTypeChange={onTypeChange}
            />

            <ValidationErrors errors={validationErrors}/>

            <FieldOverrides
                schemaType={currentOverrides['@type'] || 'Article'}
                overrides={currentOverrides}
                onOverrideToggle={onOverrideToggle}
                onCustomValueChange={onCustomValueChange}
            />

            {showPreview && (
                <JsonPreview
                    jsonPreview={jsonPreview}
                    sdk={sdk}
                />
            )}

            <button
                onClick={onSave}
                style={{
                    width: '100%',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
                Save JSON-LD Settings
            </button>
        </div>
    );
}