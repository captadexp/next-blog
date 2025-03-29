import {useState, useEffect, useRef} from 'preact/compat';
import {JSX} from 'preact/jsx-runtime';
import TargetedEvent = JSX.TargetedEvent
import TargetedSubmitEvent = JSX.TargetedSubmitEvent;

export type DynamicFormFieldType = {
    label: string;
    value?: any;
    type: string;
    key: string;
    disabled?: boolean;
    placeholder?: string;
    required?: boolean;
};

// TextField Component
const TextField = ({field, onChange}: {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}) => {
    const [value, setValue] = useState(field.value || '');

    const handleChange = (e: TargetedEvent<HTMLInputElement>) => {
        const newValue = e.currentTarget.value
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

// TextArea Component
const TextArea = ({field, onChange}: {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}) => {
    const [value, setValue] = useState(field.value || '');

    const handleChange = (e: TargetedEvent<HTMLTextAreaElement>) => {
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

// RichText Component using script tag approach
const RichText = ({field, onChange}: {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [editorLoaded, setEditorLoaded] = useState(false);

    // Load CKEditor script
    useEffect(() => {
        // Skip if already loaded
        if (document.querySelector('script[src*="ckeditor"]')) {
            setEditorLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = "https://cdn.ckeditor.com/ckeditor5/41.2.1/classic/ckeditor.js";
        script.async = true;
        script.onload = () => setEditorLoaded(true);
        document.body.appendChild(script);

        return () => {
            // Clean up is optional here since the script will remain for the session
        };
    }, []);

    // Initialize CKEditor after script is loaded
    useEffect(() => {
        if (!editorLoaded || !editorRef.current) return;

        // Wait for the next tick to ensure ClassicEditor is available
        setTimeout(() => {
            const initEditor = async () => {
                try {
                    // Use window.ClassicEditor which is made available by the script
                    const editor = await (window as any).ClassicEditor.create(editorRef.current, {
                        initialData: field.value || ''
                    });

                    // Store editor instance in window for access
                    (window as any).editors = (window as any).editors || {};
                    (window as any).editors[field.key] = editor;

                    // Listen for changes
                    editor.model.document.on('change:data', () => {
                        const data = editor.getData();
                        onChange(field.key, data);
                    });

                    // Handle disabled state
                    if (field.disabled) {
                        editor.isReadOnly = true;
                    }
                } catch (error) {
                    console.error('CKEditor initialization failed:', error);
                }
            };

            initEditor();
        }, 0);

        // Cleanup on component unmount
        return () => {
            const editor = (window as any).editors?.[field.key];
            if (editor && typeof editor.destroy === 'function') {
                editor.destroy();
                delete (window as any).editors[field.key];
            }
        };
    }, [editorLoaded, field.key, field.value, field.disabled, onChange]);

    return (
        <div className="w-full mb-4">
            <label
                htmlFor={field.key}
                className="block mb-1 text-sm font-medium text-gray-700"
            >
                {field.label}
            </label>
            <div
                className="border border-gray-300 rounded-md min-h-24"
                ref={editorRef}
                id={field.key}
                dangerouslySetInnerHTML={{__html: field.value || ''}}
            />
            {!editorLoaded && (
                <div className="text-sm text-gray-500 mt-1">Loading editor...</div>
            )}
        </div>
    );
};

// Factory component to render the appropriate field based on type
const FormField = ({field, onChange}: {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}) => {
    switch (field.type) {
        case 'text':
            return <TextField field={field} onChange={onChange}/>;
        case 'textarea':
            return <TextArea field={field} onChange={onChange}/>;
        case 'richtext':
            return <RichText field={field} onChange={onChange}/>;
        default:
            return null;
    }
};

interface DynamicFormProps {
    id: string;
    postTo: string;
    fields: DynamicFormFieldType[];
    submitLabel: string;
    redirectTo: string;
    onSubmitSuccess?: (data: any) => void;
    onSubmitError?: (error: Error) => void;
}

function DynamicForm(props: DynamicFormProps) {
    const {
        id,
        postTo,
        fields,
        submitLabel,
        redirectTo,
        onSubmitSuccess,
        onSubmitError
    } = props;


    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form data from fields
    useEffect(() => {
        const initialData: Record<string, any> = {};
        fields.forEach(field => {
            if (field.value !== undefined) {
                initialData[field.key] = field.value;
            }
        });
        setFormData(initialData);
    }, [fields]);

    const handleFieldChange = (key: string, value: any) => {
        setFormData(prevData => ({
            ...prevData,
            [key]: key === 'tags' && typeof value === 'string' ? value.split(',') : value
        }));
    };

    const handleSubmit = async (event: TargetedSubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);

        // Get rich text data from CKEditor instances
        const richTextFields = fields.filter(field => field.type === 'richtext');
        const richTextData: Record<string, any> = {};

        richTextFields.forEach(field => {
            const editor = (window as any).editors?.[field.key];
            if (editor) {
                richTextData[field.key] = editor.getData();
            }
        });

        // Merge form data with rich text data
        const submitData = {
            ...formData,
            ...richTextData
        };

        try {
            const response = await fetch(postTo, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (onSubmitSuccess) {
                onSubmitSuccess(data);
            }

            if (redirectTo) {
                window.location.href = redirectTo;
            }

        } catch (error) {
            console.error('Error:', error);
            if (onSubmitError && error instanceof Error) {
                onSubmitError(error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form id={id} onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col space-y-4">
                {fields.map((field, index) => (
                    <FormField
                        key={`${field.key}-${index}`}
                        field={field}
                        onChange={handleFieldChange}
                    />
                ))}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-4 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isSubmitting ? "Submitting..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default DynamicForm;