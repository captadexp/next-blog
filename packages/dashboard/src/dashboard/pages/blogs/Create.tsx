import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import {useUser} from '../../../context/UserContext';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {Category, Tag} from '@supergrowthai/types';
import {ExtensionZone} from '../../components/ExtensionZone';

interface CreateBlogProps {
    path?: string;
}

const CreateBlog: FunctionComponent<CreateBlogProps> = () => {
    const location = useLocation();
    const {apis, user, loading: userLoading} = useUser();
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Redirect to login if not authenticated
    // useEffect(() => {
    //     if (!userLoading && !user) {
    //         location.route('/api/next-blog/dashboard/login');
    //     }
    // }, [user, userLoading, location]);

    useEffect(() => {
        // Skip if not authenticated
        if (!user) return;

        // Function to fetch categories and tags from the API
        const fetchData = async () => {
            try {
                // Fetch categories and tags data using the API client
                await Promise.all([
                    apis.getCategories()
                        .then((categoriesResponse) => {
                            if (categoriesResponse.code === 0 && categoriesResponse.payload) {
                                setCategories(categoriesResponse.payload);
                            } else {
                                throw new Error(categoriesResponse.message || 'Failed to fetch categories');
                            }
                        })
                        .catch(console.error),
                    apis.getTags()
                        .then((tagsResponse) => {
                            if (tagsResponse.code === 0 && tagsResponse.payload) {
                                setTags(tagsResponse.payload);
                            } else {
                                throw new Error(tagsResponse.message || 'Failed to fetch tags');
                            }
                        })
                        .catch(console.error),
                ]);

                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchData();
    }, [user, apis]);

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
            // Create slug from label
            const slug = item.label.toLowerCase().replace(/\s+/g, '-');

            // Use API client to create a new category
            const response = await apis.createCategory({
                name: item.label,
                description: '',
                slug: slug
            });

            if (response.code === 0 && response.payload) {
                const newCategory = response.payload;

                // Add to local state
                setCategories([...categories, newCategory]);

                return {value: newCategory._id, label: newCategory.name};
            } else {
                throw new Error(response.message || 'Failed to create category');
            }
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
            // Create slug from label
            const slug = item.label.toLowerCase().replace(/\s+/g, '-');

            // Use API client to create a new tag
            const response = await apis.createTag({
                name: item.label,
                slug: slug
            });

            if (response.code === 0 && response.payload) {
                const newTag = response.payload;

                // Add to local state
                setTags([...tags, newTag]);

                return {value: newTag._id, label: newTag.name};
            } else {
                throw new Error(response.message || 'Failed to create tag');
            }
        } catch (error) {
            console.error('Error adding new tag:', error);
            return null;
        }
    };

    // Define form fields
    const fields: DynamicFormFieldType[] = [
        {key: 'title', label: 'Title', type: 'text', required: true},
        {key: 'slug', label: 'Slug', type: 'text', required: true},
        {key: 'excerpt', label: 'Excerpt', type: 'textarea'},
        {key: 'content', label: 'Content', type: 'richtext', required: true},
        {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [{label: "draft", value: "draft"}, {label: "published", value: "published"}],
            value: 'draft'
        },
        {
            key: 'category',
            label: 'Category',
            type: 'select',
            options: categories.map(cat => ({value: cat._id, label: cat.name})),
            required: true,
            onSearch: searchCategories,
            onAdd: addNewCategory
        },
        {
            key: 'tags',
            label: 'Tags',
            type: 'multiselect',
            options: tags.map(tag => ({value: tag._id, label: tag.name})),
            onSearch: searchTags,
            onAdd: addNewTag
        },
    ];

    // Handler for blog creation using the API client directly
    const handleCreateBlog = async (data: any) => {
        const blogData = {
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt,
            content: data.content,
            status: data.status,
            category: data.category,
            tags: Array.isArray(data.tags) ? data.tags : [],
        };

        return apis.createBlog(blogData);
    };

    if (userLoading) {
        return <div className="flex justify-center py-8">Loading user information...</div>;
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <div className="max-w-4xl mx-auto p-2 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Create New Blog</h2>
                <button
                    onClick={() => location.route('/api/next-blog/dashboard/blogs')}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    Back to List
                </button>
            </div>

            {loading ? (
                <p>Loading form...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : (
                <ExtensionZone name="blog-create-form" context={{zone: 'blog-create-form', page: 'blogs', entity: 'blog'}}>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <DynamicForm
                            id="createBlog"
                            submitLabel="Create Blog"
                            postTo={"/api/next-blog/api/blogs/create"}
                            apiMethod={handleCreateBlog}
                            redirectTo={"/api/next-blog/dashboard/blogs"}
                            fields={fields}
                            onSubmitSuccess={(data) => {
                                console.log('Blog created successfully:', data);
                            }}
                            onSubmitError={(error) => {
                                console.error('Error creating blog:', error);
                            }}
                        />
                    </div>
                </ExtensionZone>
            )}
        </div>
    );
};

export default CreateBlog;