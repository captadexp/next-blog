import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import {useUser} from '../../../context/UserContext';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {Category, Tag} from '@supergrowthai/next-blog-types';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';

const uniqById = <T extends { _id: string }>(arr: T[]) => {
    const map = new Map<string, T>();
    arr.forEach(i => map.set(i._id, i));
    return Array.from(map.values());
};

const toOptions = <T extends { _id: string; name: string }>(arr: T[]) =>
    arr.map(it => ({value: it._id, label: it.name}));

interface CreateBlogProps {
    path?: string;
}

const CreateBlog: FunctionComponent<CreateBlogProps> = () => {
    const location = useLocation();
    const {apis, user, loading: userLoading} = useUser();
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);

    useEffect(() => {
        // Skip if not authenticated
        if (!user) return;

        // Function to fetch categories and tags from the API
        const fetchData = async () => {
            try {
                // Fetch first page of categories and tags using paginated API
                const [catsPage1, tagsPage1] = await Promise.all([
                    apis.getCategories({page: 1}).then(r => Array.isArray(r.payload?.data) ? r.payload?.data : []),
                    apis.getTags({page: 1}).then(r => Array.isArray(r.payload?.data) ? r.payload?.data : []),
                ]);

                setCategories(catsPage1);
                setTags(tagsPage1);
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };

        fetchData();
    }, [user, apis]);

    // Functions for handling search and adding new items
    const searchCategories = async (query: string): Promise<{ value: string; label: string }[]> => {
        const resp = await apis.getCategories({search: query, page: 1});
        const results: Category[] = Array.isArray(resp.payload?.data) ? resp.payload?.data : [];

        return toOptions(results);
    };

    const searchTags = async (query: string): Promise<{ value: string; label: string }[]> => {
        const resp = await apis.getTags({search: query, page: 1});
        const results: Tag[] = Array.isArray(resp.payload?.data) ? resp.payload?.data : [];

        return toOptions(results);
    };

    const addNewCategory = async (item: { value: string; label: string }) => {
        try {
            const response = await apis.createCategory({
                name: item.label,
                description: '',
                slug: item.label.toLowerCase().replace(/\s+/g, '-'),
            });
            if (response.code !== 0) throw new Error(`Failed to create category: ${response.message}`);
            const newCategory = response.payload!;
            setCategories(old => uniqById<Category>([...old, newCategory]));
            return {value: newCategory._id, label: newCategory.name};
        } catch (error) {
            console.error('Error adding new category:', error);
            return null;
        }
    };

    const addNewTag = async (item: { value: string; label: string }) => {
        try {
            const response = await apis.createTag({
                name: item.label,
                slug: item.label.toLowerCase().replace(/\s+/g, '-'),
            });
            if (response.code !== 0) throw new Error(`Failed to create tag: ${response.message}`);
            const newTag = response.payload!;
            setTags(old => uniqById<Tag>([...old, newTag]));
            return {value: newTag._id, label: newTag.name};
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
        {
            key: 'featuredMediaId',
            label: 'Featured Media',
            type: 'media',
            intentOptions: {
                options: {
                    mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
                    maxSize: 2 * 1024 * 1024,
                    allowUpload: true
                }
            }
        },
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
            options: toOptions(categories),
            required: true,
            onSearch: searchCategories,
            onAdd: addNewCategory
        },
        {
            key: 'tags',
            label: 'Tags',
            type: 'multiselect',
            options: toOptions(tags),
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
            featuredMediaId: data.featuredMediaId || null,
        };

        return apis.createBlog(blogData);
    };

    if (userLoading) {
        return <div className="flex justify-center py-8">Loading user information...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <ExtensionZone name="blog-create" context={{data: {fields}}}>
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
                <ExtensionPoint name="blog-create-form:toolbar" context={{fields}}/>
                <ExtensionZone name="blog-create-form" context={{data: {fields}}}>
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
            </div>
        </ExtensionZone>
    )

};

export default CreateBlog;