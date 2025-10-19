import {h} from 'preact';
import {DynamicFormFieldType} from './types';
import TextField from './TextField';
import TextArea from './TextArea';
import RichText from './RichText';
import PasswordField from './PasswordField';
import AutocompleteField from './AutocompleteField';
import CheckboxGroupField from './CheckboxGroupField';
import HiddenField from './HiddenField';
import MediaField from './MediaField';

interface FormFieldProps {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}

const FormField = ({field, onChange}: FormFieldProps) => {
    switch (field.type) {
        case 'text':
            return <TextField field={field} onChange={onChange}/>;
        case 'textarea':
            return <TextArea field={field} onChange={onChange}/>;
        case 'richtext':
            return <RichText field={field} onChange={onChange}/>;
        case 'password':
            return <PasswordField field={field} onChange={onChange}/>;
        case 'select':
            return <AutocompleteField field={field} onChange={onChange} multiple={false}/>;
        case 'multiselect':
            return <AutocompleteField field={field} onChange={onChange} multiple={true}/>;
        case 'checkboxgroup':
            return <CheckboxGroupField field={field} onChange={onChange}/>;
        case 'hidden':
            return <HiddenField field={field} onChange={onChange}/>;
        case 'media':
            return <MediaField field={field} onChange={onChange}/>;
        default:
            return null;
    }
};

export default FormField;