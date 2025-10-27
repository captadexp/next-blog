import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

interface CreateTagProps {
    path?: string;
}

const CreateTag: FunctionComponent<CreateTagProps> = () => {
    const location = useLocation();

    // Define form fields
    const fields: DynamicFormFieldType[] = [
        {key: 'name', label: 'Name', type: 'text', required: true},
        {key: 'slug', label: 'Slug', type: 'text', required: true},
        {key: 'description', label: 'Description', type: 'textarea'},
    ];

    return (
        <ExtensionZone name="tag-create" context={{data: {fields}}}>
            <div className="max-w-4xl mx-auto p-2 md:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Create New Tag</h2>
                    <button
                        onClick={() => location.route('/api/next-blog/dashboard/tags')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                        Back to List
                    </button>
                </div>

                <ExtensionPoint name="tag-create-form:toolbar" context={{fields}}/>
                <ExtensionZone name="tag-create-form" context={{data: {fields}}}>
                    <div className="flex-grow bg-white p-6 rounded-lg shadow-md mb-6">
                        <DynamicForm
                            id="createTag"
                            submitLabel="Create Tag"
                            postTo={"/api/next-blog/api/tags/create"}
                            redirectTo={"/api/next-blog/dashboard/tags"}
                            fields={fields}
                        />
                    </div>
                </ExtensionZone>
            </div>
        </ExtensionZone>
    );
};

export default CreateTag;