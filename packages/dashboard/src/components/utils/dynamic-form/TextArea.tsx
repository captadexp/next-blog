import { h } from 'preact';
import { useState } from 'preact/hooks';
import { DynamicFormFieldType } from './types';

interface TextAreaProps {
  field: DynamicFormFieldType;
  onChange: (key: string, value: any) => void;
}

const TextArea = ({ field, onChange }: TextAreaProps) => {
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
      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm min-h-32"
        value={value}
        onChange={handleChange}
        id={field.key}
        disabled={field.disabled}
        name={field.key}
        placeholder={field.placeholder || field.label}
        required={field.required}
      />
    </div>
  );
};

export default TextArea;