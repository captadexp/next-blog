import {useState, useEffect} from 'preact/compat';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import {JSX} from "preact/compat";

type SingleSelect = {
    label: string;
    value?: any,
    type: "single-select";
    key: string;
    options: { label: string, value: string }[],
    disabled?: boolean
}
type MultiSelect = {
    label: string;
    value?: any,
    type: "multi-select";
    key: string;
    selectedOptions: { label: string, value: string }[],
    options: { label: string, value: string }[],
    disabled?: boolean
}

export type DynamicFormFieldType =
    SingleSelect
    | MultiSelect
    | { label: string; value?: string, type: "text" | "textarea" | "richtext"; key: string; disabled?: boolean }

type FieldProps<T extends DynamicFormFieldType = DynamicFormFieldType> = {
    handleChange(key: string, value: any): void,
    field: T
}

const TextInput = ({field, handleChange}: FieldProps) => {

    const [value, setValue] = useState(field.value)

    useEffect(() => {
        handleChange(field.key, value)
    }, value)

    return (
        <div style={{width: "100%", marginBottom: "15px"}}>
            <label htmlFor={field.key} style={{display: "block", marginBottom: "5px", fontSize: "16px"}}>
                {field.label}
            </label>
            <input
                custom-attribute="df"
                style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
                }}
                value={value}
                type="text"
                disabled={field.disabled}
                id={field.key}
                name={field.key}
                placeholder={field.label}
                required
                onChange={e => setValue(e.currentTarget.value)}
            />
        </div>
    );
};

const TextArea = ({field, handleChange}: FieldProps) => {
    const [value, setValue] = useState(field.value)

    useEffect(() => {
        handleChange(field.key, value)
    }, value)

    return (
        <div>
            <label htmlFor={field.key}>{field.label}</label>
            <p>
        <textarea
            custom-attribute="df"
            value={field.value}
            id={field.key}
            disabled={field.disabled}
            name={field.key}
            placeholder={field.label}
            required
            onChange={e => setValue(e.currentTarget.value)}
        ></textarea>
            </p>
            <br/>
        </div>
    );
};

const RichText = ({field, handleChange}: FieldProps) => {
    const [editor, setEditor] = useState<ClassicEditor | null>(null);
    const [value, setValue] = useState(field.value)

    useEffect(() => {
        handleChange(field.key, value)
    }, value)

    useEffect(() => {
        const editorInstance = ClassicEditor.create(document.getElementById(field.key)!)
            .then((editor) => {
                setEditor(editor);
                editor.setData(field.value);
            })
            .catch((error) => console.error(error));

        return () => {
            if (editor) {
                editor.destroy();
            }
        };
    }, [field.key, field.value]);

    useEffect(() => {
        if (editor) {
            const handleDataChange = () => {
                handleChange(field.key, editor.getData());
            };
            editor.model.document.on('change:data', handleDataChange);
            return () => {
                editor.model.document.off('change:data', handleDataChange);
            };
        }
    }, [editor, field.key, handleChange]);

    return (
        <div>
            <label htmlFor={field.key}>{field.label}</label>:
            <div id={field.key}></div>
        </div>
    );
};

const SingleSelect = ({field, handleChange}: FieldProps<SingleSelect>) => {
    const [value, setValue] = useState(field.value)

    useEffect(() => {
        handleChange(field.key, value)
    }, value)

    return (
        <div>
            <label htmlFor={field.key}>{field.label}</label>
            <select
                custom-attribute="df"
                value={field.value}
                id={field.key}
                name={field.key}
                required
                onChange={e => setValue(e.currentTarget.value)}
            >
                <option value="">Select an option</option>
                {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

const MultiSelect = ({field, handleChange}: FieldProps<MultiSelect>) => {
    const [value, setValue] = useState<{ label: string, value: string }[]>(field.value)

    useEffect(() => {
        handleChange(field.key, value)
    }, value)

    return (
        <div>
            <label htmlFor={field.key}>{field.label}</label>
            <select
                custom-attribute="df"
                value={field.value}
                id={field.key}
                name={field.key}
                multiple
                required
                onChange={e => setValue(o =>
                    Array.from(e.currentTarget.selectedOptions, a => ({
                        label: a.label,
                        value: a.value
                    })))}
            >
                {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

const FormField = ({field, handleChange}: FieldProps) => {
    switch (field.type) {
        case 'text':
            return <TextInput field={field} handleChange={handleChange}/>;
        case 'textarea':
            return <TextArea field={field} handleChange={handleChange}/>;
        case 'richtext':
            return <RichText field={field} handleChange={handleChange}/>;
        case 'multi-select':
            return <MultiSelect field={field} handleChange={handleChange}/>;
        case "single-select":
            return <SingleSelect field={field} handleChange={handleChange}/>;
        default:
            return null;
    }
};

const DynamicForm = ({id, postTo, fields, submitLabel, redirectTo}: {
    id: string,
    postTo: string,
    fields: DynamicFormFieldType[],
    submitLabel: string,
    redirectTo: string
}) => {
    const [formData, setFormData] = useState({});

    const handleChange = (name: string, value: any) => {
        setFormData({...formData, [name]: value});
    };

    const handleSubmit = (event: JSX.TargetedEvent<HTMLElement>) => {
        event.preventDefault();

        fetch(postTo, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                window.location.replace(redirectTo);
                console.log('Success:', data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };

    return (
        <form id={id} onSubmit={e => handleSubmit(e as any)}>
            <div style={{display: "flex", flexDirection: "column"}}>
                {fields.map((field, index) => (
                    <FormField key={index} field={field} handleChange={handleChange}/>
                ))}
                <button type="submit">{submitLabel}</button>
            </div>
        </form>
    );
};

export default DynamicForm;
