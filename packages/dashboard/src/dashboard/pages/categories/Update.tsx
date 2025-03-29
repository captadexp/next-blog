import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from "../../../context/UserContext.tsx";

interface UpdateCategoryProps {
    path?: string;
    id?: string;
}

interface Category {
    _id: string;
    name: string;
    slug: string;
    description?: string;
}

const UpdateCategory: FunctionComponent<UpdateCategoryProps> = ({id}) => {
    const location = useLocation();
    const [category, setCategory] = useState<Category | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {apis} = useUser();

    useEffect(() => {
        // Function to fetch category from the API
        const fetchCategory = async () => {
            if (!id) {
                setError('No category ID provided');
                setLoading(false);
                return;
            }

            try {
                // Fetch category data from API
                const response = await apis.getCategory(id);

                if (response.code !== 0) {
                    throw new Error(`Error fetching category: ${response.message}`);
                }

                const data = response.payload!;
                setCategory(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching category:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);

            }
        };

        fetchCategory();
    }, [id]);

    // Define form fields based on category data
    const getFormFields = (): DynamicFormFieldType[] => {
        if (!category) return [];

        return [
            {key: 'id', label: 'ID', type: 'text', value: category._id, disabled: true},
            {key: 'name', label: 'Name', type: 'text', value: category.name, required: true},
            {key: 'slug', label: 'Slug', type: 'text', value: category.slug, required: true},
            {key: 'description', label: 'Description', type: 'textarea', value: category.description || ''},
        ];
    };

    return (
        <div className="max-w-4xl mx-auto p-2 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Update Category</h2>
                <button
                    onClick={() => location.route('/api/next-blog/dashboard/categories')}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    Back to List
                </button>
            </div>

            {loading ? (
                <p>Loading category data...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : !category ? (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                    Category not found
                </div>
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <DynamicForm
                        id="updateCategory"
                        submitLabel="Update Category"
                        postTo={`/api/next-blog/api/category/${category._id}/update`}
                        redirectTo={"/api/next-blog/dashboard/categories"}
                        fields={getFormFields()}
                    />
                </div>
            )}
        </div>
    );
};

export default UpdateCategory;