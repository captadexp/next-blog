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
        <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Content Type</label>
            <select
                value={selectedType}
                onChange={(e) => onTypeChange(e.target.value as SchemaType)}
                className="w-full p-2 border border-gray-300 rounded outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.5)]"
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
                <p className="text-xs text-gray-500 mt-1">{schemaTypeDefinition.description}</p>
            )}
        </div>
    );
}