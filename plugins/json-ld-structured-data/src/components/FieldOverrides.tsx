import type {BlogJsonLdOverrides, SchemaType} from '../types/plugin-types.js';
import {getSchemaTypeDefinition} from '../schema/schema-definitions.js';

interface FieldOverridesProps {
    schemaType: SchemaType;
    overrides: BlogJsonLdOverrides;
    onOverrideToggle: (field: string, enabled: boolean) => void;
    onCustomValueChange: (field: string, value: any) => void;
}

export function FieldOverrides({
                                   schemaType,
                                   overrides,
                                   onOverrideToggle,
                                   onCustomValueChange
                               }: FieldOverridesProps) {
    const schemaTypeDefinition = getSchemaTypeDefinition(schemaType);

    if (!schemaTypeDefinition) {
        return null;
    }

    return (
        <div style={{marginBottom: '1.5rem'}}>
            <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '1rem'
            }}>Field Overrides</h4>
            <p style={{
                fontSize: '0.75rem',
                color: '#4b5563',
                marginBottom: '1rem'
            }}>
                Toggle field overrides to customize specific values. Unchecked fields will use automatic
                values derived from your blog content and global settings.
            </p>

            {schemaTypeDefinition.fields.map(field => {
                const isOverridden = overrides.overrides?.[field.key] || false;
                const customValue = overrides.custom?.[field.key] || '';

                return (
                    <div
                        key={field.key}
                        style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.25rem',
                            padding: '0.75rem',
                            marginBottom: '1rem'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem'
                        }}>
                            <label style={{
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}>{field.label}</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280'
                                }}>
                                    {isOverridden ? 'Custom' : 'Auto'}
                                </span>
                                <button
                                    onClick={() => onOverrideToggle(field.key, !isOverridden)}
                                    style={{
                                        position: 'relative',
                                        display: 'inline-flex',
                                        height: '1.25rem',
                                        width: '2.25rem',
                                        alignItems: 'center',
                                        borderRadius: '9999px',
                                        backgroundColor: isOverridden ? '#3b82f6' : '#d1d5db',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            height: '0.75rem',
                                            width: '0.75rem',
                                            borderRadius: '50%',
                                            backgroundColor: 'white',
                                            transform: isOverridden ? 'translateX(1.25rem)' : 'translateX(0.25rem)',
                                            transition: 'transform 0.2s'
                                        }}
                                    />
                                </button>
                            </div>
                        </div>

                        {isOverridden && (
                            <div>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        value={customValue}
                                        onChange={(e) => onCustomValueChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.25rem',
                                            outline: 'none',
                                            resize: 'vertical'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#3b82f6';
                                            e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#d1d5db';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        value={customValue}
                                        onChange={(e) => onCustomValueChange(field.key, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.25rem',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#3b82f6';
                                            e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#d1d5db';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map(option => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === 'array' && field.key === 'steps' ? (
                                    <div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '0.75rem'
                                        }}>
                                            <span style={{
                                                fontSize: '0.875rem',
                                                fontWeight: '500'
                                            }}>Steps</span>
                                            <button
                                                onClick={() => {
                                                    const currentSteps = Array.isArray(customValue) ? customValue : [];
                                                    const newSteps = [...currentSteps, {text: '', name: ''}];
                                                    onCustomValueChange(field.key, newSteps);
                                                }}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '0.25rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                + Add Step
                                            </button>
                                        </div>
                                        {(Array.isArray(customValue) ? customValue : []).map((step: any, index: number) => (
                                            <div
                                                key={index.toString()}
                                                style={{
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '0.25rem',
                                                    padding: '0.75rem',
                                                    marginBottom: '0.75rem'
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: '500'
                                                    }}>Step {index + 1}</span>
                                                    <button
                                                        onClick={() => {
                                                            const currentSteps = Array.isArray(customValue) ? customValue : [];
                                                            const newSteps = currentSteps.filter((_: any, i: number) => i !== index);
                                                            onCustomValueChange(field.key, newSteps);
                                                        }}
                                                        style={{
                                                            padding: '0.25rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '0.25rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div style={{marginBottom: '0.5rem'}}>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        marginBottom: '0.25rem'
                                                    }}>Step Title (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={step.name || ''}
                                                        onChange={(e) => {
                                                            const currentSteps = Array.isArray(customValue) ? customValue : [];
                                                            const newSteps = [...currentSteps];
                                                            newSteps[index] = {
                                                                ...newSteps[index],
                                                                name: e.target.value
                                                            };
                                                            onCustomValueChange(field.key, newSteps);
                                                        }}
                                                        placeholder="e.g., Preparation"
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '0.25rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        marginBottom: '0.25rem'
                                                    }}>Instructions *</label>
                                                    <textarea
                                                        value={step.text || ''}
                                                        onChange={(e) => {
                                                            const currentSteps = Array.isArray(customValue) ? customValue : [];
                                                            const newSteps = [...currentSteps];
                                                            newSteps[index] = {
                                                                ...newSteps[index],
                                                                text: e.target.value
                                                            };
                                                            onCustomValueChange(field.key, newSteps);
                                                        }}
                                                        placeholder="Detailed instructions for this step..."
                                                        rows={3}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '0.25rem',
                                                            outline: 'none',
                                                            resize: 'vertical'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        type={field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text'}
                                        value={customValue}
                                        onChange={(e) => onCustomValueChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.25rem',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#3b82f6';
                                            e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#d1d5db';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        {field.description && (
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                            }}>{field.description}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}