import {h} from 'preact';
import {useCallback, useRef, useState} from 'preact/hooks';
import {DynamicFormFieldType} from './types';
import {memo} from "preact/compat"
import {useEffect} from "react";

interface RichTextProps {
    field: DynamicFormFieldType;
    onChange: (key: string, value: any) => void;
}

const RichText = memo(({field, onChange}: RichTextProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [editorLoaded, setEditorLoaded] = useState(false);
    const editorInstanceRef = useRef<any>(null);
    const prevValueRef = useRef<string>(field.value);
    const {key, value, disabled, label, ref} = field;

    // Memoize the onChange handler to prevent recreation on each render
    const handleChange = useCallback((data: string) => {
        onChange(key, data);
    }, [key, onChange]);

    // Load CKEditor script only once
    useEffect(() => {
        if (typeof window !== 'undefined') {
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
        }
        // No cleanup needed as we want the script to remain loaded
    }, []);

    // Initialize CKEditor only when necessary
    useEffect(() => {
        if (!editorLoaded || !editorRef.current) return;

        // Only create/update editor if we don't have an instance yet
        if (!editorInstanceRef.current) {
            let mounted = true;

            const initEditor = async () => {
                try {
                    // Create new editor instance
                    const editor = await (window as any).ClassicEditor.create(editorRef.current, {
                        initialData: value || ''
                    });

                    if (!mounted) {
                        editor.destroy();
                        return;
                    }

                    editorInstanceRef.current = editor;
                    if (ref)
                        ref.current = editor;

                    // Listen for changes
                    editor.model.document.on('change:data', () => {
                        const data = editor.getData();
                        handleChange(data);
                    });

                    // Handle disabled state
                    editor.isReadOnly = !!disabled;
                } catch (error) {
                    console.error('CKEditor initialization failed:', error);
                }
            };

            // Ensure ClassicEditor is available
            setTimeout(initEditor, 0);

            // Cleanup on component unmount
            return () => {
                mounted = false;
                if (editorInstanceRef.current) {
                    editorInstanceRef.current.destroy().catch(console.error);
                    editorInstanceRef.current = null;
                }

                if (ref)
                    ref.current = null;
            };
        }
    }, [editorLoaded]); // Only run when editor loads

    // Update editor content/state if props change
    useEffect(() => {
        // Only run if we have an editor instance and the value has changed
        if (editorInstanceRef.current && prevValueRef.current !== value) {
            const editor = editorInstanceRef.current;

            // Only set data if the value is different from current editor content
            // This prevents cursor jumping
            const editorData = editor.getData();
            if (editorData !== value) {
                editor.setData(value || '');
            }

            prevValueRef.current = value;
        }

        // Update read-only state if disabled prop changes
        if (editorInstanceRef.current && editorInstanceRef.current.isReadOnly !== !!disabled) {
            editorInstanceRef.current.isReadOnly = !!disabled;
        }
    }, [value, disabled]);

    return (
        <div className="w-full mb-4">
            <label
                htmlFor={key}
                className="block mb-1 text-sm font-medium text-gray-700"
            >
                {label}
            </label>
            <div
                className="border border-gray-300 rounded-md min-h-24"
                ref={editorRef}
                id={key}
            />
            {!editorLoaded && (
                <div className="text-sm text-gray-500 mt-1">Loading editor...</div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.field.key === nextProps.field.key &&
        prevProps.field.value === nextProps.field.value &&
        prevProps.field.disabled === nextProps.field.disabled &&
        prevProps.onChange === nextProps.onChange &&
        prevProps.field.ref === nextProps.field.ref
    );
});

export default RichText;