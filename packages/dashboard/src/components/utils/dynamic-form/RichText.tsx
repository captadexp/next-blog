import {h} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import {RichTextDynamicFormField} from './types';
import {memo} from "preact/compat"
import contentObjectToEditorJS from './htmlToJson/contentobject-to-editorjs';
import editorJSToContentObject from './htmlToJson/editorjs-to-contentobject';
import type {OutputBlockData} from '@editorjs/editorjs';
import ImageSelectorTool from './editorjs-tools/ImageSelectorTool.ts';

interface RichTextProps {
    field: RichTextDynamicFormField;
    onChange: (key: string, value: any) => void;
}

const RichText = memo(({field, onChange}: RichTextProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const {key, value, disabled, label, ref} = field;

    useEffect(() => {
        let mounted = true;

        const initEditor = async () => {
            try {
                // Wait for EditorJS to be available
                const EditorJS = (window as any).EditorJS;

                if (!EditorJS || !editorRef.current || editorInstanceRef.current) return;

                // Get available tools
                const Header = (window as any).Header;
                const List = (window as any).List;
                const Quote = (window as any).Quote;
                const Table = (window as any).Table;
                const InlineCode = (window as any).InlineCode;
                const CodeTool = (window as any).CodeTool;

                // Prepare initial data
                let initialData;
                try {
                    initialData = value ? contentObjectToEditorJS(value) : {
                        time: new Date().getTime(),
                        blocks: []
                    };
                } catch (err) {
                    console.log('Error converting data:', err);
                    initialData = {
                        time: new Date().getTime(),
                        blocks: []
                    };
                }

                // Build tools config
                const tools: any = {};

                if (Header) {
                    tools.header = {
                        class: Header,
                        config: {
                            levels: [1, 2, 3, 4, 5, 6],
                            defaultLevel: 2
                        }
                    };
                }

                if (List) {
                    tools.list = {
                        class: List,
                        inlineToolbar: true,
                        config: {
                            defaultStyle: 'unordered'
                        }
                    };
                }

                if (Quote) {
                    tools.quote = Quote;
                }

                // Add our custom image selector tool
                tools.image = {
                    class: ImageSelectorTool,
                    config: {
                        placeholder: 'Click to select an image from your media library'
                    }
                };

                if (Table) {
                    tools.table = {
                        class: Table,
                        inlineToolbar: true,
                        config: {
                            rows: 2,
                            cols: 3,
                        }
                    };
                }

                if (InlineCode) {
                    tools.inlineCode = InlineCode;
                }

                if (CodeTool) {
                    tools.code = {
                        class: CodeTool,
                        config: {
                            placeholder: 'Enter your code here...'
                        }
                    };
                }

                // Create editor instance
                const editor = new EditorJS({
                    holder: editorRef.current,
                    data: initialData,
                    readOnly: !!disabled,
                    minHeight: 30,
                    placeholder: 'Let\'s write an awesome story!',
                    onChange: async () => {
                        try {
                            const outputData = await editor.saver.save();
                            // Ensure all paragraphs have text field
                            outputData.blocks = outputData.blocks.map((block: OutputBlockData) => {
                                if (block.type === 'paragraph' && !block.data.text) {
                                    block.data.text = '';
                                }
                                return block;
                            });
                            const contentObject = editorJSToContentObject(outputData);
                            onChange(key, contentObject);
                        } catch (error) {
                            console.error('Error saving:', error);
                        }
                    },
                    tools: tools,
                    onReady: () => {
                        if (mounted) {
                            setIsLoading(false);
                        }
                    }
                });

                editorInstanceRef.current = editor;

                if (ref)
                    ref.current = editor;

            } catch (error) {
                console.error('Failed to initialize editor:', error);
                setIsLoading(false);
            }
        };

        // Load scripts then initialize
        const loadScripts = async () => {
            try {
                // Load EditorJS first
                if (!(window as any).EditorJS) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@editorjs/editorjs@latest';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }

                // Load tools in parallel
                const toolPromises = [];

                if (!(window as any).Header) {
                    toolPromises.push(new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@editorjs/header@latest';
                        script.onload = resolve;
                        script.onerror = () => {
                            console.warn('Failed to load Header tool');
                            resolve(null);
                        };
                        document.head.appendChild(script);
                    }));
                }

                if (!(window as any).List) {
                    toolPromises.push(new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@editorjs/list@latest';
                        script.onload = resolve;
                        script.onerror = () => {
                            console.warn('Failed to load List tool');
                            resolve(null);
                        };
                        document.head.appendChild(script);
                    }));
                }

                if (!(window as any).Quote) {
                    toolPromises.push(new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@editorjs/quote@latest';
                        script.onload = resolve;
                        script.onerror = () => {
                            console.warn('Failed to load Quote tool');
                            resolve(null);
                        };
                        document.head.appendChild(script);
                    }));
                }

                if (!(window as any).Table) {
                    toolPromises.push(new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@editorjs/table@latest';
                        script.onload = resolve;
                        script.onerror = () => {
                            console.warn('Failed to load Table tool');
                            resolve(null);
                        };
                        document.head.appendChild(script);
                    }));
                }

                if (!(window as any).InlineCode) {
                    toolPromises.push(new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@editorjs/inline-code@latest';
                        script.onload = resolve;
                        script.onerror = () => {
                            console.warn('Failed to load InlineCode tool');
                            resolve(null);
                        };
                        document.head.appendChild(script);
                    }));
                }

                if (!(window as any).CodeTool) {
                    toolPromises.push(new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@editorjs/code@latest';
                        script.onload = resolve;
                        script.onerror = () => {
                            console.warn('Failed to load Code tool');
                            resolve(null);
                        };
                        document.head.appendChild(script);
                    }));
                }

                // Wait for all tools to load
                await Promise.all(toolPromises);

                // Initialize editor after a small delay
                if (mounted) {
                    setTimeout(initEditor, 100);
                }
            } catch (error) {
                console.error('Failed to load scripts:', error);
                // Try to initialize with whatever loaded
                if (mounted) {
                    setTimeout(initEditor, 100);
                }
            }
        };

        loadScripts();

        return () => {
            mounted = false;
            if (editorInstanceRef.current) {
                editorInstanceRef.current.destroy();
                editorInstanceRef.current = null;
            }
        };
    }, []);

    // Update readonly state
    useEffect(() => {
        if (editorInstanceRef.current && editorInstanceRef.current.readOnly) {
            editorInstanceRef.current.readOnly.toggle(!!disabled);
        }
    }, [disabled]);

    useEffect(() => {
        console.log("RichText Mounted")
        return () => {
            console.log("RichText unmounted")
        }
    }, []);

    return (
        <div className="w-full mb-4">
            <label
                htmlFor={key}
                className="block mb-1 text-sm font-medium text-gray-700"
            >
                {label}
            </label>
            <div
                className="border border-gray-300 rounded-md min-h-24 p-2"
                ref={editorRef}
                id={key}
            >
                {isLoading && (
                    <div className="text-gray-500 text-sm">Loading editor...</div>
                )}
            </div>
        </div>
    );
});

export default RichText;