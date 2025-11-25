import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {TextDynamicFormField} from './types';

interface TextFieldProps {
    field: TextDynamicFormField;
    onChange: (key: string, value: string) => void;
}

const TextField = ({field, onChange}: TextFieldProps) => {
    const [value, setValue] = useState(field.value || '');
    const [error, setError] = useState<string | undefined>();
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (!field.validator) return;

        const validate = async () => {
            setIsValidating(true);
            const result = await field.validator!(value);
            setError(result.isValid ? undefined : result.message);
            if (result.value !== undefined && result.value !== value) {
                setValue(result.value);
                onChange(field.key, result.value);
            }
            setIsValidating(false);
        };

        validate();
    }, [value, field.validator]);

    const handleChange = (e: any) => {
        const newValue = e.currentTarget.value;
        if (newValue === value) return;
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
            <div className="relative">
                <input
                    className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${isValidating ? 'pr-10' : ''}`}
                    value={value}
                    onChange={handleChange}
                    type="text"
                    disabled={field.disabled}
                    id={field.key}
                    name={field.key}
                    placeholder={field.placeholder || field.label}
                    required={field.required}
                />
                {isValidating && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg"
                             fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
};

export default TextField;