import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import FormField from './FormField';
import {DynamicFormFieldType} from './types';
import Loader from '../../Loader';
import toast from 'react-hot-toast';
import { checkSlug } from '../../../_utils/checkValidity';
interface DynamicFormProps {
    id: string;
    fields: DynamicFormFieldType[];
    submitLabel: string;
    apiMethod: (data: any) => Promise<any>;
    onFieldChange?: (key: string, value: any, formData: Record<string, any>) => Record<string, any> | null; // Optional callback when field changes
}

function DynamicForm(props: DynamicFormProps) {
    const {
        id,
        fields,
        submitLabel,
        apiMethod
    } = props;
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
            if(key === 'slug'){
                // ignores empty string and checks the recent letter typed
                if(value !== "" && !checkSlug(value.charAt(value.length - 1))){
                    toast.error("Please avoid special characters except hypens in the slug");
                }
            }
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
            await apiMethod(submitData);
        } catch (error) {
            console.error('Error:', error);
            if (error instanceof Error) {
                setError(error.message);
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
                    {isSubmitting ? <div className="flex items-center gap-2"><Loader size="sm" text="" />Submitting...</div> : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default DynamicForm;
export type {DynamicFormFieldType};