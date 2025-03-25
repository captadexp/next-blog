import { useRef, useState, useEffect } from "preact/hooks";

export type DynamicFormFieldType = {
    label: string;
    value?: any;
    type: string;
    key: string;
    disabled?: boolean;
};

const TextField = ({ field }: { field: DynamicFormFieldType }) => (
    <div className="w-full mb-4">
        <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
            {field.label}
        </label>
        <input
            custom-attribute="df"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={field.value}
            type="text"
            disabled={field.disabled}
            id={field.key}
            name={field.key}
            placeholder={field.label}
            required
        />
    </div>
);

const TextareaField = ({ field }: { field: DynamicFormFieldType }) => (
    <div className="w-full mb-4">
        <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
            {field.label}
        </label>
        <textarea
            custom-attribute="df"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={field.value}
            id={field.key}
            disabled={field.disabled}
            name={field.key}
            placeholder={field.label}
            required
        />
    </div>
);

const RichtextField = ({ field }: { field: DynamicFormFieldType }) => (
    <div className="w-full mb-4">
        <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
            {field.label}
        </label>
        <script src="https://cdn.ckeditor.com/ckeditor5/41.2.1/classic/ckeditor.js"></script>
        <div
            datatype="richtext"
            id={field.key}
            className="border border-gray-300 rounded-md p-3 bg-white shadow-md"
            dangerouslySetInnerHTML={{ __html: field.value }}
        />
        <script
            dangerouslySetInnerHTML={{
                __html: `
          ClassicEditor.create(document.querySelector('#${field.key}'))
            .then(editor => {
              window.editors = window.editors || {};
              window.editors['${field.key}'] = editor;
            })
            .catch(error => console.error(error));
        `,
            }}
        />
    </div>
);

export interface AutocompleteFieldProps extends DynamicFormFieldType {
    apiEndpoint?: string;
    subtype?: string;
}

function AutocompleteField({ apiEndpoint, subtype, ...field }: AutocompleteFieldProps) {
    const [inputValue, setInputValue] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!inputValue) {
            setSuggestions([]);
            return;
        }

        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const endpoint = apiEndpoint || `/api/next-blog/api/${subtype || ""}`;
                const res = await fetch(`${endpoint}?q=${encodeURIComponent(inputValue)}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setSuggestions(data.map((item) => item.name));
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Autocomplete error:", error);
                setSuggestions([]);
            }
            setLoading(false);
        };

        const debounce = setTimeout(fetchSuggestions, 300);

        return () => clearTimeout(debounce);
    }, [inputValue]);

    const handleSelect = (item: string) => {
        if (!selectedItems.includes(item)) {
            setSelectedItems([...selectedItems, item]);
        }
        setInputValue("");
        setSuggestions([]);
    };

    const handleRemove = (item: string) => {
        setSelectedItems(selectedItems.filter((i) => i !== item));
    };

    return (
        <div className="w-full mb-4 relative">
            <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
                {field.label}
            </label>

            <div className="flex flex-wrap mb-2">
                {selectedItems.map((item) => (
                    <div
                        key={item}
                        className="flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-1 mr-2 mb-2 text-sm"
                    >
                        <span className="mr-1">{item}</span>
                        <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="text-blue-500 hover:text-blue-700 focus:outline-none"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <input
                custom-attribute="df"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                id={field.key}
                name={field.key}
                placeholder={field.label}
                value={inputValue}
                onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
            />

            {loading && <div className="text-sm text-gray-500 mt-1">Loading...</div>}

            {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                        <li
                            key={suggestion}
                            onClick={() => handleSelect(suggestion)}
                            className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}

            <input type="hidden" name={field.key} value={selectedItems.join(",")} />
        </div>
    );
}

const FormField = ({ field }: { field: DynamicFormFieldType }) => {
    switch (field.type) {
        case "text":
            return <TextField field={field} />;
        case "textarea":
            return <TextareaField field={field} />;
        case "richtext":
            return <RichtextField field={field} />;
        case "autocomplete":
            return <AutocompleteField subtype={"tags"} {...field} />;
        default:
            return null;
    }
};

const DynamicForm = ({
                         id,
                         postTo,
                         fields,
                         submitLabel,
                         redirectTo,
                     }: {
    id: string;
    postTo: string;
    fields: DynamicFormFieldType[];
    submitLabel: string;
    redirectTo: string;
}) => (
    <>
        <form id={id} className="flex flex-col space-y-4">
            {fields.map((field, index) => (
                <FormField key={index} field={field} />
            ))}
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition">
                {submitLabel}
            </button>
        </form>
        <script
            type="application/javascript"
            dangerouslySetInnerHTML={{
                __html: `
          document.getElementById('${id}').addEventListener('submit', function (event) {
            event.preventDefault();
            const formData = {};
            event.target.querySelectorAll('input, textarea').forEach(input => {
              if(input.attributes.getNamedItem("custom-attribute")?.value === "df") {
                formData[input.name] = input.value;
              }
            });
            event.target.querySelectorAll('div[datatype="richtext"]').forEach(div => {
              formData[div.id] = window.editors[div.id].getData();
            });
            fetch('${postTo}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
              window.location.replace('${redirectTo}');
            })
            .catch(error => console.error('Error:', error));
          });
        `,
            }}
        />
    </>
);

export default DynamicForm;
