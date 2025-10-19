import {h} from 'preact';
import {useEffect} from 'preact/hooks';
import {HiddenDynamicFormField} from './types';

interface HiddenFieldProps {
    field: HiddenDynamicFormField;
    onChange: (key: string, value: any) => void;
}

/**
 * HiddenField component for dynamic forms.
 * Renders a hidden input field that is not visible to the user
 * but its value is included in form submissions.
 */
const HiddenField = ({field, onChange}: HiddenFieldProps) => {
    // When the component mounts or field value changes, update the form data
    useEffect(() => {
        if (field.value !== undefined) {
            onChange(field.key, field.value);
        }
    }, [field.key, onChange]);

    // Render a hidden input (not visible to users)
    return (
        <input
            type="hidden"
            id={field.key}
            name={field.key}
            value={field.value || ''}
            data-testid={`hidden-field-${field.key}`}
        />
    );
};

export default HiddenField;