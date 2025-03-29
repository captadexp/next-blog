import {h, FunctionComponent} from 'preact';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';

interface CreateCategoryProps {
    path?: string;
}

const CreateCategory: FunctionComponent<CreateCategoryProps> = () => {
    const location = useLocation();

    // Define form fields
    const fields: DynamicFormFieldType[] = [
        {key: 'name', label: 'Name', type: 'text', required: true},
        {key: 'slug', label: 'Slug', type: 'text', required: true},
        {key: 'description', label: 'Description', type: 'textarea'},
    ];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Create New Category</h2>
                <button
                    onClick={() => location.route('/api/next-blog/dashboard/categories')}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    Back to List
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <DynamicForm
                    id="createCategory"
                    submitLabel="Create Category"
                    postTo={"/api/next-blog/api/categories/create"}
                    redirectTo={"/api/next-blog/dashboard/categories"}
                    fields={fields}
                />
            </div>
        </div>
    );
};

export default CreateCategory;