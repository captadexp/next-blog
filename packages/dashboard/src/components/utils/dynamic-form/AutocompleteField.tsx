import {h} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import {DynamicFormFieldType} from './types';

interface AutocompleteFieldProps {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
    multiple?: boolean;
}

const AutocompleteField = ({field, onChange, multiple = false}: AutocompleteFieldProps) => {
    const [inputValue, setInputValue] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<Array<{
        value: string;
        label: string
    }>>(field.options || []);
    const [selectedOptions, setSelectedOptions] = useState<Array<{ value: string; label: string }>>(
        multiple && Array.isArray(field.value)
            ? field.value.map(v => {
                const option = (field.options || []).find(opt => opt.value === v);
                return option || {value: v, label: v};
            })
            : field.value ? [(field.options || []).find(opt => opt.value === field.value) || {
                value: field.value,
                label: field.value
            }] : []
    );
    const [isFocused, setIsFocused] = useState(false);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newItemLabel, setNewItemLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update filtered options when input value changes
    useEffect(() => {
        const filterOptions = async () => {
            if (field.onSearch && inputValue.trim().length > 0) {
                setIsLoading(true);
                try {
                    const results = await field.onSearch(inputValue);
                    setFilteredOptions(results);
                } catch (error) {
                    console.error('Error searching options:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Local filtering when no onSearch provided
                const filtered = (field.options || []).filter(option =>
                    option.label.toLowerCase().includes(inputValue.toLowerCase())
                );
                setFilteredOptions(filtered);
            }
        };

        filterOptions();
    }, [inputValue, field.options, field.onSearch]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (e: any) => {
        setInputValue(e.target.value);
    };

    const handleInputFocus = () => {
        setIsFocused(true);
    };

    const handleSelectOption = (option: { value: string; label: string }) => {
        if (multiple) {
            const isAlreadySelected = selectedOptions.some(
                selected => selected.value === option.value
            );

            if (!isAlreadySelected) {
                const newSelectedOptions = [...selectedOptions, option];
                setSelectedOptions(newSelectedOptions);
                onChange(field.key, newSelectedOptions.map(opt => opt.value));
            }
        } else {
            setSelectedOptions([option]);
            onChange(field.key, option.value);
            setIsFocused(false);
        }

        setInputValue('');
    };

    const handleRemoveOption = (optionValue: string) => {
        const newSelectedOptions = selectedOptions.filter(
            option => option.value !== optionValue
        );
        setSelectedOptions(newSelectedOptions);
        onChange(field.key, multiple ? newSelectedOptions.map(opt => opt.value) : '');
    };

    const handleAddNewItem = async () => {
        if (!field.onAdd || newItemLabel.trim() === '') return;

        setIsLoading(true);
        try {
            const newOption = await field.onAdd({value: '', label: newItemLabel.trim()});
            if (newOption) {
                handleSelectOption(newOption);
            }
            setIsAddingNew(false);
            setNewItemLabel('');
        } catch (error) {
            console.error('Error adding new item:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const showAddOption = inputValue.trim().length > 0 &&
        filteredOptions.every(option => option.label.toLowerCase() !== inputValue.toLowerCase()) &&
        field.onAdd !== undefined;

    return (
        <div className="w-full mb-4">
            <label
                htmlFor={field.key}
                className="block mb-1 text-sm font-medium text-gray-700"
            >
                {field.label}
            </label>

            {/* Selected chips display */}
            {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedOptions.map(option => (
                        <div
                            key={option.value}
                            className="flex items-center bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md text-sm"
                        >
                            <span>{option.label}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveOption(option.value)}
                                className="ml-1 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                                disabled={field.disabled}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20"
                                     fill="currentColor">
                                    <path fillRule="evenodd"
                                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                          clipRule="evenodd"/>
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input field */}
            <div className="relative">
                <input
                    ref={inputRef}
                    id={field.key}
                    name={field.key}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={selectedOptions.length > 0 && multiple ? 'Add more...' : field.placeholder || field.label}
                    required={field.required && (!multiple || selectedOptions.length === 0)}
                    disabled={field.disabled}
                    autocomplete={"off"}
                />

                {/* Dropdown for options */}
                {isFocused && !isAddingNew && (
                    <div
                        ref={dropdownRef}
                        className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto"
                    >
                        {isLoading ? (
                            <div className="py-2 px-3 text-gray-500 text-sm">Loading...</div>
                        ) : filteredOptions.length > 0 ? (
                            <ul className="py-1">
                                {filteredOptions.map(option => (
                                    <li
                                        key={option.value}
                                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
                                            selectedOptions.some(sel => sel.value === option.value) ? 'bg-indigo-50 text-indigo-800' : ''
                                        }`}
                                        onClick={() => handleSelectOption(option)}
                                    >
                                        {option.label}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="py-2 px-3 text-gray-500 text-sm">No options found</div>
                        )}

                        {/* Add new option button */}
                        {showAddOption && (
                            <div className="border-t border-gray-200">
                                <button
                                    type="button"
                                    className="w-full py-2 px-3 text-left text-sm text-indigo-600 hover:bg-indigo-50 focus:outline-none"
                                    onClick={() => setIsAddingNew(true)}
                                >
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none"
                                             viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                        </svg>
                                        Add "{inputValue}"
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add new item dialog */}
            {isAddingNew && (
                <>
                    <input type="checkbox" className="modal-toggle" checked={isAddingNew} readOnly/>
                    <dialog className="modal">
                        <div className="modal-box bg-white rounded-md shadow-lg">
                            <h3 className="font-bold text-lg mb-4">Add New {field.label}</h3>
                            <input
                                type="text"
                                value={newItemLabel}
                                onChange={(e) => setNewItemLabel(e.currentTarget.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={`Enter new ${(`${field.label?.toLowerCase()} `) || ""}name`}
                                autoFocus
                            />
                            <div className="modal-action mt-4">
                                <button
                                    type="button"
                                    className="btn btn-primary rounded-md"
                                    onClick={handleAddNewItem}
                                    disabled={isLoading || !newItemLabel.trim()}
                                >
                                    {isLoading ? 'Saving...' : 'Add'}
                                </button>
                                <button
                                    type="button"
                                    className="btn rounded-md"
                                    onClick={() => {
                                        setIsAddingNew(false);
                                        setNewItemLabel('');
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </dialog>
                </>
            )}

            <p className="mt-1 text-xs text-gray-500">
                {field.required ? 'Required • ' : ''}
                {multiple ? 'You can select multiple items' : 'Select one item'}
            </p>
        </div>
    );
};

export default AutocompleteField;