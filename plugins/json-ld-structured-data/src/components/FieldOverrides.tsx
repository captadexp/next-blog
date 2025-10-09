import type {BlogJsonLdOverrides, SchemaType} from '../types/plugin-types.js';
import {getSchemaTypeDefinition} from '../schema/schema-definitions.js';
import {StepsEditor} from './StepsEditor.js';

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
        <div className="mb-6">
            <h4 className="text-sm font-medium mb-4">Field Overrides</h4>
            <p className="text-xs text-gray-600 mb-4">
                Toggle field overrides to customize specific values. Unchecked fields will use automatic
                values derived from your blog content and global settings.
            </p>

            {schemaTypeDefinition.fields.map(field => {
                const isOverridden = overrides.overrides?.[field.key] || false;
                const customValue = overrides.custom?.[field.key] || '';

                return (
                    <div
                        key={field.key}
                        className="border border-gray-200 rounded p-3 mb-4"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">{field.label}</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                    {isOverridden ? 'Custom' : 'Auto'}
                                </span>
                                <button
                                    onClick={() => onOverrideToggle(field.key, !isOverridden)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full border-none cursor-pointer transition-colors duration-200 ${
                                        isOverridden ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-3 w-3 rounded-full bg-white transition-transform duration-200 ${
                                            isOverridden ? 'translate-x-5' : 'translate-x-1'
                                        }`}
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
                                        className="w-full p-2 border border-gray-300 rounded outline-none resize-y focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        value={customValue}
                                        onChange={(e) => onCustomValueChange(field.key, e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
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
                                    <StepsEditor
                                        steps={Array.isArray(customValue) ? customValue : []}
                                        onChange={(steps) => onCustomValueChange(field.key, steps)}
                                    />
                                ) : (
                                    <input
                                        type={field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text'}
                                        value={customValue}
                                        onChange={(e) => onCustomValueChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="w-full p-2 border border-gray-300 rounded outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
                                    />
                                )}
                            </div>
                        )}

                        {field.description && (
                            <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}