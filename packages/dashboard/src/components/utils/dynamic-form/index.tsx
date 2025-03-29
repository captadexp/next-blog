import {h} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import FormField from './FormField';
import {DynamicFormFieldType} from './types';
import {useUser} from '../../../context/UserContext';

interface DynamicFormProps {
    id: string;
    postTo: string;
    fields: DynamicFormFieldType[];
    submitLabel: string;
    redirectTo: string;
    apiMethod?: (data: any) => Promise<any>; // Optional API method to use instead of postTo
    onSubmitSuccess?: (data: any) => void;
    onSubmitError?: (error: Error) => void;
    onFieldChange?: (key: string, value: any, formData: Record<string, any>) => Record<string, any> | null; // Optional callback when field changes
}

function DynamicForm(props: DynamicFormProps) {
    const {
        id,
        postTo,
        fields,
        submitLabel,
        redirectTo,
        apiMethod,
        onSubmitSuccess,
        onSubmitError
    } = props;
    const {apis} = useUser();
    const location = useLocation();
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form data from fields
    useEffect(() => {
        const initialData: Record<string, any> = {};
        fields.forEach(field => {
            if (field.value !== undefined) {
                // Pay special attention to hidden fields - they need to be initialized right away
                // since the user won't be able to interact with them
                initialData[field.key] = field.value;
            }
        });
        setFormData(initialData);
    }, [fields]);

    const handleFieldChange = (key: string, value: any) => {
        setFormData(prevData => {
            // Process specific field types
            const processedValue = key === 'tags' && typeof value === 'string' ? value.split(',') : value;

            // Create updated data with the new value
            const updatedData = {
                ...prevData,
                [key]: processedValue
            };

            // Call custom field change handler if provided
            if (props.onFieldChange) {
                const additionalChanges = props.onFieldChange(key, value, updatedData);
                if (additionalChanges) {
                    // Merge additional changes into the updated data
                    return {...updatedData, ...additionalChanges};
                }
            }

            return updatedData;
        });
    };

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

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
        const submitData: any = {
            ...formData,
            ...richTextData
        };

        try {
            let data;

            if (apiMethod) {
                // Use the provided API method
                data = await apiMethod(submitData);
            } else {
                // Use the generic API client or fallback to direct fetch
                if (apis) {
                    // Determine which API method to use based on postTo
                    let response;

                    if (postTo.includes('/blogs/create')) {
                        response = await apis.createBlog(submitData);
                    } else if (postTo.includes('/users/create')) {
                        response = await apis.createUser(submitData);
                    } else if (postTo.includes('/categories/create')) {
                        response = await apis.createCategory(submitData);
                    } else if (postTo.includes('/tags/create')) {
                        response = await apis.createTag(submitData);
                    } else {
                        // Fallback to direct fetch if no matching API method
                        const fetchResponse = await fetch(postTo, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(submitData)
                        });

                        if (!fetchResponse.ok) {
                            throw new Error('Network response was not ok');
                        }

                        response = await fetchResponse.json();
                    }

                    data = response;

                    if (response.code !== 0) {
                        throw new Error(response.message || 'API request failed');
                    }
                } else {
                    // Fallback to direct fetch if apiClient is not available
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

                    data = await response.json();
                }
            }

            if (onSubmitSuccess) {
                onSubmitSuccess(data);
            }

            if (redirectTo) {
                // Use location.route for client-side routing instead of window.location
                location.route(redirectTo);
            }
        } catch (error) {
            console.error('Error:', error);
            if (error instanceof Error) {
                setError(error.message);
                if (onSubmitError) {
                    onSubmitError(error);
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form id={id} onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col space-y-4">
                {error && (
                    <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 mb-4">
                        <p>{error}</p>
                    </div>
                )}

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
export type {DynamicFormFieldType};