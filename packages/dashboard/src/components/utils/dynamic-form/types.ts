import {RefObject} from "preact";
import {Media} from "@supergrowthai/next-blog-types";

export type DynamicFormFieldType = {
    label?: string;
    value?: any;
    type: string;
    key: string;
    ref?: RefObject<any>;
    disabled?: boolean;
    placeholder?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    onSearch?: (query: string) => Promise<Array<{ value: string; label: string }>>;
    onAdd?: (item: { value: string; label: string }) => Promise<{ value: string; label: string } | null>;
    groupedOptions?: Record<string, string[]>; // For grouped checkbox fields
    showLabels?: boolean; // Whether to show group labels in checkbox groups
    mediaData?: Media; // For media fields to store fetched media data
    intentOptions?: any; // For media fields to pass options to the intent
};