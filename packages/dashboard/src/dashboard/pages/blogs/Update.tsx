import {FunctionComponent, h} from 'preact';
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from "../../../context/UserContext.tsx";
import {Blog, Category, Tag} from "@supergrowthai/types";
import {ExtensionPoint, ExtensionZone} from "../../components/ExtensionZone";

const UpdateBlog: FunctionComponent<{ id: string }> = ({id}) => {
    const location = useLocation();
    const [blog, setBlog] = useState<Blog | null>(null);
    const [formData, setFormData] = useState<Record<string, any> | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {apis} = useUser();
    const editorRef = useRef<any>(null); // Ref to hold the CKEditor instance

    const [tempRefresher, setTempRefresher] = useState(Date.now());

    // --- PLUGIN EVENT HANDLING ---
    // A simple event bus for the editor
    const editorEventBus = useMemo(() => {
        const listeners: Record<string, Function[]> = {};
        return {
            on(event: string, callback: Function) {
                if (!listeners[event]) {
                    listeners[event] = [];
                }
                listeners[event].push(callback);
            },
            emit(event: string, data?: any) {
                if (listeners[event]) {
                    listeners[event].forEach(cb => cb(data));
                }
            },
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) {
                setError('No blog ID provided');
                setLoading(false);
                return;
            }
            try {
                const [blogData, categoriesData, tagsData] = await Promise.all([
                    apis.getBlog(id).then(resp => resp.payload!),
                    apis.getCategories().then(resp => resp.payload!),
                    apis.getTags().then(resp => resp.payload!),
                ]);
                setBlog(blogData);
                setFormData(blogData);
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);
                setTags(Array.isArray(tagsData) ? tagsData : []);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, apis]);

    // --- PLUGIN CONTEXT ---
    const pluginContext = useMemo(() => {
        if (!formData) return {};
        return {
            blogId: id,
            contentOwnerId: blog?.userId,
            editor: {
                getTitle: () => formData.title || '',
                getContent: () => formData.content || '',
            },
            on: editorEventBus.on
        };
    }, [id, blog, formData, editorEventBus.on, tempRefresher]);

    const handleFieldChange = (key: string, value: any) => {
        setFormData(currentFormData => {
            const newData = {...currentFormData, [key]: value};
            editorEventBus.emit(`${key}:change`, value);
            return newData;
        });
        return null;
    };

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
                description: '',
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

    const getFormFields = (): DynamicFormFieldType[] => {
        if (!formData) return [];
        return [
            {key: 'title', label: 'Title', type: 'text', value: formData.title, required: true},
            {key: 'slug', label: 'Slug', type: 'text', value: formData.slug, required: true},
            {key: 'excerpt', label: 'Excerpt', type: 'textarea', value: formData.excerpt},
            {
                key: 'content',
                label: 'Content',
                type: 'richtext',
                value: formData.content,
                required: true,
                ref: editorRef
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [{label: "draft", value: "draft"}, {label: "published", value: "published"}],
                value: formData.status || 'draft'
            },
            {
                key: 'categoryId',
                label: 'Category',
                type: 'select',
                value: formData.categoryId,
                options: categories.map(cat => ({value: cat._id, label: cat.name})),
                required: true,
                onSearch: searchCategories,
                onAdd: addNewCategory
            },
            {
                key: 'tagIds',
                label: 'Tags',
                type: 'multiselect',
                value: formData.tagIds,
                options: tags.map(tag => ({value: tag._id, label: tag.name})),
                onSearch: searchTags,
                onAdd: addNewTag
            },
        ];
    };

    useEffect(() => {
        if (!!editorRef.current) return
        const i = setInterval(() => setTempRefresher(Date.now()), 500)
        return () => {
            clearInterval(i);
        }
    }, [tempRefresher]);

    return (
        <div className="max-w-7xl mx-auto p-2 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Update Blog</h2>
                <button onClick={() => location.route('/api/next-blog/dashboard/blogs')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100">
                    Back to List
                </button>
            </div>
            {loading ? <p>Loading blog data...</p> : error ?
                <div className="p-4 bg-red-100 text-red-800 rounded">Error: {error}</div> : !blog || !formData ?
                    <div className="p-4 bg-yellow-100 text-yellow-800 rounded">Blog not found</div> : (
                        <ExtensionZone name="blog-update-form" page="blogs" entity="blog" data={blog}>
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-grow bg-white p-6 rounded-lg shadow-md">
                                    <DynamicForm
                                        id="updateBlog"
                                        submitLabel="Update Blog"
                                        postTo={`/api/next-blog/api/blog/${blog._id}/update`}
                                        redirectTo={"/api/next-blog/dashboard/blogs"}
                                        fields={getFormFields()}
                                        onFieldChange={handleFieldChange}
                                    />
                                </div>
                                <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                                    <div className="sticky flex flex-col gap-2">
                                        <ExtensionPoint name="editor-sidebar-widget" context={pluginContext}/>
                                    </div>
                                </div>
                            </div>
                        </ExtensionZone>
                    )}
        </div>
    );
};

export default UpdateBlog;