import {h} from 'preact';
import {useState} from 'preact/hooks';
import {DynamicFormFieldType} from './types';

interface PasswordFieldProps {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}

const PasswordField = ({field, onChange}: PasswordFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const [value, setValue] = useState(field.value || '');

    const handleChange = (e: any) => {
        const newValue = e.currentTarget.value;
        setValue(newValue);
        onChange(field.key, newValue);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
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
                    id={field.key}
                    name={field.key}
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={field.placeholder || field.label}
                    required={field.required}
                    disabled={field.disabled}
                />
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={togglePasswordVisibility}
                >
                    {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    )}
                </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
                {field.required ? 'Required • ' : ''}Use a strong, unique password
            </p>
        </div>
    );
};

export default PasswordField;