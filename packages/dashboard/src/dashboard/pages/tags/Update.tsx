import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from "../../../context/UserContext.tsx";
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

interface UpdateTagProps {
    path?: string;
    id?: string;
}

interface Tag {
    _id: string;
    name: string;
    slug: string;
    description?: string;
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

    return (
        <ExtensionZone name="tag-update"
                       context={{zone: 'tag-update', page: 'tags', entity: 'tag', data: {tag, loading, error}}}>
            <div className="max-w-4xl mx-auto p-2 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Update Tag</h2>
                    <button
                        onClick={() => location.route('/api/next-blog/dashboard/tags')}
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
                    <>
                        <ExtensionPoint name="tag-update-form:toolbar" context={{tag, fields: getFormFields()}}/>

                        <ExtensionZone name="tag-update-form" context={{
                            zone: 'tag-update-form',
                            page: 'tags',
                            entity: 'tag',
                            data: {tag, fields: getFormFields()}
                        }}>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <DynamicForm
                                    id="updateTag"
                                    submitLabel="Update Tag"
                                    postTo={`/api/next-blog/api/tag/${tag._id}/update`}
                                    redirectTo={"/api/next-blog/dashboard/tags"}
                                    fields={getFormFields()}
                                />
                            </div>
                        </ExtensionZone>
                    </>
                )}
            </div>
        </ExtensionZone>
    );
};

export default UpdateTag;