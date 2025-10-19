import {RefObject} from "preact";
import {Media} from "@supergrowthai/next-blog-types";

interface BaseDynamicFormField {
    label?: string;
    key: string;
    ref?: RefObject<any>;
    disabled?: boolean;
    required?: boolean;
}

// Text field
export interface TextDynamicFormField extends BaseDynamicFormField {
    type: "text";
    value?: string;
    placeholder?: string;
}

// Textarea field
export interface TextAreaDynamicFormField extends BaseDynamicFormField {
    type: "textarea";
    value?: string;
    placeholder?: string;
}

// Rich text field
export interface RichTextDynamicFormField extends BaseDynamicFormField {
    type: "richtext";
    value?: any; // ContentObject or string or other formats
}

// Password field
export interface PasswordDynamicFormField extends BaseDynamicFormField {
    type: "password";
    value?: string;
    placeholder?: string;
}

// Hidden field
export interface HiddenDynamicFormField extends BaseDynamicFormField {
    type: "hidden";
    value?: any;
}

// Select field (single select)
export interface SelectDynamicFormField extends BaseDynamicFormField {
    type: "select";
    value?: string;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    onSearch?: (query: string) => Promise<Array<{ value: string; label: string }>>;
    onAdd?: (item: { value: string; label: string }) => Promise<{ value: string; label: string } | null>;
}

// Multi-select field
export interface MultiSelectDynamicFormField extends BaseDynamicFormField {
    type: "multiselect";
    value?: string[];
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    onSearch?: (query: string) => Promise<Array<{ value: string; label: string }>>;
    onAdd?: (item: { value: string; label: string }) => Promise<{ value: string; label: string } | null>;
}

// Checkbox group field
export interface CheckboxGroupDynamicFormField extends BaseDynamicFormField {
    type: "checkboxgroup";
    value?: string[];
    groupedOptions?: Record<string, string[]>; // For grouped checkbox fields
    showLabels?: boolean; // Whether to show group labels in checkbox groups
}

// Media field
export interface MediaDynamicFormField extends BaseDynamicFormField {
    type: "media";
    value?: string; // Media ID
    mediaData?: Media; // For media fields to store fetched media data
    intentOptions?: any; // For media fields to pass options to the intent
}

// Union type for all dynamic form fields
export type DynamicFormField =
    | TextDynamicFormField
    | TextAreaDynamicFormField
    | RichTextDynamicFormField
    | PasswordDynamicFormField
    | HiddenDynamicFormField
    | SelectDynamicFormField
    | MultiSelectDynamicFormField
    | CheckboxGroupDynamicFormField
    | MediaDynamicFormField;

// Export the union type as the main type
export type DynamicFormFieldType = DynamicFormField;