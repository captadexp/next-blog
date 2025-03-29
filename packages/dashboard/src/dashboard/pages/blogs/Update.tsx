import {h, FunctionComponent} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from "../../../context/UserContext.tsx";
import {Blog, Category, Tag} from "../../../types/api.ts";

const UpdateBlog: FunctionComponent<{ id: string }> = ({id}) => {
    const location = useLocation();
    const [blog, setBlog] = useState<Blog | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {apis} = useUser();

    useEffect(() => {
        // Function to fetch blog from the API
        const fetchData = async () => {
            if (!id) {
                setError('No blog ID provided');
                setLoading(false);
                return;
            }

            try {
                // Fetch blog, categories, and tags data
                const [blogData, categoriesData, tagsData] = await Promise.all([
                    apis.getBlog(id).then(resp => {
                        if (resp.code !== 0) {
                            throw new Error(`Error fetching blog: ${resp.message}`);
                        }
                        return resp.payload!
                    }),
                    apis.getCategories().then(resp => {
                        if (resp.code !== 0) {
                            throw new Error(`Error fetching categories: ${resp.message}`);
                        }
                        return resp.payload!
                    }),
                    apis.getTags().then(resp => {
                        if (resp.code !== 0) {
                            throw new Error(`Error fetching tags: ${resp.message}`);
                        }
                        return resp.payload!
                    }),
                ]);

                setBlog(blogData);
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);
                setTags(Array.isArray(tagsData) ? tagsData : []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Functions for handling search and adding new items
    const searchCategories = async (query: string): Promise<{ value: string; label: string }[]> => {
        // Filter categories that match the query
        return categories
            .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
            .map(cat => ({value: cat._id, label: cat.name}));
    };

    const searchTags = async (query: string): Promise<{ value: string; label: string }[]> => {
        // Filter tags that match the query
        return tags
            .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
            .map(tag => ({value: tag._id, label: tag.name}));
    };

    const addNewCategory = async (item: { value: string; label: string }): Promise<{
        value: string;
        label: string
    } | null> => {
        try {
            // API call to create a new category
            const response = await apis.createCategory({
                name: item.label,
                slug: item.label.toLowerCase().replace(/\s+/g, '-'),
            });

            if (response.code !== 0) {
                throw new Error(`Failed to create category: ${response.message}`);
            }

            const newCategory = response.payload!;

            setCategories((old) => [...old, newCategory]);

            return {value: newCategory._id, label: newCategory.name};
        } catch (error) {
            console.error('Error adding new category:', error);
            return null;
        }
    };

    const addNewTag = async (item: { value: string; label: string }): Promise<{
        value: string;
        label: string
    } | null> => {
        try {
            const response = await apis.createTag({
                name: item.label,
                slug: item.label.toLowerCase().replace(/\s+/g, '-'),
            })

            if (response.code !== 0) {
                throw new Error(`Failed to create tag: ${response.message}`);
            }

            const newTag = response.payload!;

            // Add to local state
            setTags((tags) => [...tags, newTag]);

            return {value: newTag._id, label: newTag.name};
        } catch (error) {
            console.error('Error adding new tag:', error);
            return null;
        }
    };

    // Define form fields based on blog data
    const getFormFields = (): DynamicFormFieldType[] => {
        if (!blog) return [];

        return [
            {key: 'id', label: 'ID', type: 'text', value: blog._id, disabled: true},
            {key: 'title', label: 'Title', type: 'text', value: blog.title, required: true},
            {key: 'slug', label: 'Slug', type: 'text', value: blog.slug, required: true},
            {key: 'excerpt', label: 'Excerpt', type: 'textarea', value: blog.excerpt},
            {key: 'content', label: 'Content', type: 'richtext', value: blog.content, required: true},
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [{label: "draft", value: "draft"}, {label: "published", value: "published"}],
                value: blog.status || 'draft'
            },
            {
                key: 'category',
                label: 'Category',
                type: 'select',
                value: blog.category,
                options: categories.map(cat => ({value: cat._id, label: cat.name})),
                required: true,
                onSearch: searchCategories,
                onAdd: addNewCategory
            },
            {
                key: 'tags',
                label: 'Tags',
                type: 'multiselect',
                value: blog.tags,
                options: tags.map(tag => ({value: tag._id, label: tag.name})),
                onSearch: searchTags,
                onAdd: addNewTag
            },
        ];
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Update Blog</h2>
                <button
                    onClick={() => location.route('/api/next-blog/dashboard/blogs')}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    Back to List
                </button>
            </div>

            {loading ? (
                <p>Loading blog data...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : !blog ? (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                    Blog not found
                </div>
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <DynamicForm
                        id="updateBlog"
                        submitLabel="Update Blog"
                        postTo={`/api/next-blog/api/blog/${blog._id}/update`}
                        redirectTo={"/api/next-blog/dashboard/blogs"}
                        fields={getFormFields()}
                    />
                </div>
            )}
        </div>
    );
};

export default UpdateBlog;