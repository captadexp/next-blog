import {FunctionComponent, h} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from "../../../context/UserContext.tsx";
import {Tag, TagEditorContext} from '@supergrowthai/next-blog-types';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

interface UpdateTagProps {
    path?: string;
    id?: string;
}

const UpdateTag: FunctionComponent<UpdateTagProps> = ({id}) => {
    const location = useLocation();
    const [tag, setTag] = useState<Tag | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {apis} = useUser();

    useEffect(() => {
        // Function to fetch tag from the API
        const fetchTag = async () => {
            if (!id) {
                setError('No tag ID provided');
                setLoading(false);
                return;
            }

            try {
                // Fetch tag data from API
                const response = await apis.getTag(id);

                if (response.code !== 0) {
                    throw new Error(`Error fetching tag: ${response.message}`);
                }

                const data = response.payload!;
                setTag(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching tag:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchTag();
    }, [id]);

    // Define form fields based on tag data
    const getFormFields = (): DynamicFormFieldType[] => {
        if (!tag) return [];

        return [
            {key: 'id', label: 'ID', type: 'text', value: tag._id, disabled: true},
            {key: 'name', label: 'Name', type: 'text', value: tag.name, required: true},
            {key: 'slug', label: 'Slug', type: 'text', value: tag.slug, required: true},
            {key: 'description', label: 'Description', type: 'textarea', value: tag.description || ''},
        ];
    };

    // Event bus for form field changes
    const eventBus = useMemo(() => {
        const listeners: Record<string, Function[]> = {};
        return {
            on(event: string, callback: Function) {
                if (!listeners[event]) {
                    listeners[event] = [];
                }
                listeners[event].push(callback);
                return () => this.off(event, callback);
            },
            off(event: string, callback: Function) {
                if (listeners[event]) {
                    listeners[event] = listeners[event].filter(c => c !== callback);
                }
            },
            emit(event: string, data?: any) {
                if (listeners[event]) {
                    listeners[event].forEach(cb => cb(data));
                }
            },
        };
    }, []);

    const handleFieldChange = (key: string, value: any) => {
        eventBus.emit(`${key}:change`, value);
        return null;
    };

    const handleUpdateTag = async (data: any) => {
        const result = await apis.updateTag(tag!._id, data);
        location.route('/api/next-blog/dashboard/tags');
        return result;
    };

    const context = useMemo<TagEditorContext | undefined>(() => {
        if (!tag) return undefined;
        return {
            tagId: id!,
            data: tag,
            form: {
                data: tag,
                on: eventBus.on,
                off: eventBus.off
            }
        };
    }, [id, tag, eventBus]);

    return (
        <div className="max-w-4xl mx-auto p-2 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Update Tag</h2>
                <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    Back to List
                </button>
            </div>

            {loading ? (
                <p>Loading tag data...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : !tag ? (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                    Tag not found
                </div>
            ) : (
                <ExtensionZone name="tag-update-form" context={context}>

                    <div className="flex-grow bg-white p-6 rounded-lg shadow-md mb-6">
                        <ExtensionPoint name="tag-update-before" context={context}/>
                        <DynamicForm
                            id="updateTag"
                            submitLabel="Update Tag"
                            apiMethod={handleUpdateTag}
                            fields={getFormFields()}
                            onFieldChange={handleFieldChange}
                        />
                        <ExtensionPoint name="tag-update-after" context={context}/>
                    </div>
                    <ExtensionPoint name="tag-update-sidebar-widget" context={context}/>
                </ExtensionZone>
            )}
        </div>
    );
};

export default UpdateTag;