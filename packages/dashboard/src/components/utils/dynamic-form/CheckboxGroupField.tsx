import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {DynamicFormFieldType} from './types';

interface CheckboxGroupFieldProps {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}

const CheckboxGroupField = ({field, onChange}: CheckboxGroupFieldProps) => {
    const [selectedValues, setSelectedValues] = useState<string[]>(
        Array.isArray(field.value) ? field.value : []
    );

    // Update internal state when field value changes
    useEffect(() => {
        if (field.value && Array.isArray(field.value)) {
            setSelectedValues(field.value);
        }
    }, [field.value]);

    // Handle checkbox toggle
    const handleValueChange = (value: string, checked: boolean) => {
        let updatedValues: string[];

        if (checked && !selectedValues.includes(value)) {
            updatedValues = [...selectedValues, value];
        } else if (!checked && selectedValues.includes(value)) {
            updatedValues = selectedValues.filter(v => v !== value);
        } else {
            return; // No change
        }

        setSelectedValues(updatedValues);
        onChange(field.key, updatedValues);
    };

    if (!field.groupedOptions || Object.keys(field.groupedOptions).length === 0) {
        return (
            <div className="mt-4 mb-4">
                <p className="text-gray-500">No options available</p>
            </div>
        );
    }

    // Default show labels to true if not specified
    const showLabels = field.showLabels !== false;

    return (
        <div className="w-full mb-4">
            <label
                className="block mb-2 text-sm font-medium text-gray-700"
            >
                {field.label}
            </label>

            {Object.entries(field.groupedOptions).map(([group, options]) => (
                <div key={group} className="mb-4">
                    {showLabels && (
                        <h3 className="font-medium text-gray-800 mb-2 capitalize">{group}</h3>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {options.map(value => (
                            <div key={value} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`${field.key}-${value}`}
                                    checked={selectedValues.includes(value)}
                                    onChange={e => handleValueChange(
                                        value,
                                        (e.target as HTMLInputElement).checked
                                    )}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    disabled={field.disabled}
                                />
                                <label
                                    htmlFor={`${field.key}-${value}`}
                                    className="ml-2 text-sm text-gray-700"
                                >
                                    {value}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CheckboxGroupField;