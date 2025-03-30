import {h} from 'preact';
import {useState} from 'preact/hooks';
import {DynamicFormFieldType} from './types';

interface TextFieldProps {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}

const TextField = ({field, onChange}: TextFieldProps) => {
    const [value, setValue] = useState(field.value || '');

    const handleChange = (e: any) => {
        const newValue = e.currentTarget.value;
        setValue(newValue);
        onChange(field.key, newValue);
    };

    return (
        <div className="w-full mb-4">
            <label
                htmlFor={field.key}
                className="block mb-1 text-sm font-medium text-gray-700"
            >
                {field.label}
            </label>
            <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={value}
                onChange={handleChange}
                type="text"
                disabled={field.disabled}
                id={field.key}
                name={field.key}
                placeholder={field.placeholder || field.label}
                required={field.required}
            />
        </div>
    );
};

export default TextField;