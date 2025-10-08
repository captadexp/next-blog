import type {SchemaType} from '../types/plugin-types.js';
import {getAllSchemaTypes, getSchemaTypeDefinition} from '../schema/schema-definitions.js';

interface SchemaTypePickerProps {
    selectedType: SchemaType;
    onTypeChange: (type: SchemaType) => void;
}

export function SchemaTypePicker({ selectedType, onTypeChange }: SchemaTypePickerProps) {
    const schemaTypes = getAllSchemaTypes();
    const schemaTypeDefinition = getSchemaTypeDefinition(selectedType);

    return (
        <div style={{marginBottom: '1.5rem'}}>
            <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem'
            }}>Content Type</label>
            <select
                value={selectedType}
                onChange={(e) => onTypeChange(e.target.value as SchemaType)}
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
                {schemaTypes.map(type => (
                    <option
                        key={type.type}
                        value={type.type}
                    >
                        {type.icon} {type.label}
                    </option>
                ))}
            </select>
            {schemaTypeDefinition && (
                <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginTop: '0.25rem'
                }}>{schemaTypeDefinition.description}</p>
            )}
        </div>
    );
}