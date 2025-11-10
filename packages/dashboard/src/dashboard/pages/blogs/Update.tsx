import {FunctionComponent, h} from 'preact';
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import DynamicForm, {DynamicFormFieldType} from '../../../components/utils/dynamic-form';
import {useUser} from "../../../context/UserContext.tsx";
import {Blog, BlogEditorContext, Category, Media, Tag} from "@supergrowthai/next-blog-types";
import {ExtensionPoint, ExtensionZone} from "../../components/ExtensionZone";

const uniqById = <T extends { _id: string }>(arr: T[]) => {
    const map = new Map<string, T>();
    arr.forEach(i => map.set(i._id, i));
    return Array.from(map.values());
};

const toOptions = <T extends { _id: string; name: string }>(arr: T[]) =>
    arr.map(it => ({value: it._id, label: it.name}));

const UpdateBlog: FunctionComponent<{ id: string }> = ({id}) => {
    const location = useLocation();
    const [blog, setBlog] = useState<Blog | null>(null);
    const [formData, setFormData] = useState<Partial<Blog> | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [featuredMedia, setFeaturedMedia] = useState<Media | null>(null);

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

                return () => {
                    this.off(event, callback)
                }
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

    useEffect(() => {
        const fetchData = async () => {
            if (!id) {
                setError('No blog ID provided');
                setLoading(false);
                return;
            }
            try {
                const blogData = await apis.getBlog(id).then(resp => resp.payload!);
                setBlog(blogData);
                setFormData(blogData);

                const [catsPage1, tagsPage1] = await Promise.all([
                    apis.getCategories({page: 1}).then(r => Array.isArray(r.payload?.data) ? r.payload?.data : []),
                    apis.getTags({page: 1}).then(r => Array.isArray(r.payload?.data) ? r.payload?.data : []),
                ]);

                const selectedCatId: string | undefined = blogData?.categoryId;
                const selectedTagIds: string[] = Array.isArray(blogData?.tagIds) ? blogData.tagIds : [];
                const featuredMediaId: string | undefined = blogData?.featuredMediaId;

                const needCatFetch = selectedCatId && !catsPage1.some(c => c._id === selectedCatId);
                const needTagsFetch = selectedTagIds.length > 0 && !selectedTagIds.every(id => tagsPage1.some(t => t._id === id));

                const [selectedCats, selectedTags, selectedMedia] = await Promise.all([
                    needCatFetch ? apis.getCategories({ids: selectedCatId}).then(r => Array.isArray(r.payload?.data) ? r.payload?.data : []) : Promise.resolve([]),
                    needTagsFetch ? apis.getTags({ids: selectedTagIds.join(',')}).then(r => Array.isArray(r.payload?.data) ? r.payload?.data : []) : Promise.resolve([]),
                    featuredMediaId ? apis.getMediaById(featuredMediaId).then(r => r.payload).catch(() => null) : Promise.resolve(null),
                ]);

                setCategories(uniqById<Category>([...catsPage1, ...selectedCats]));
                setTags(uniqById<Tag>([...tagsPage1, ...selectedTags]));
                setFeaturedMedia(selectedMedia || null);
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
    const pluginContext = useMemo<BlogEditorContext | undefined>(() => {
        if (!formData || !blog) return undefined;
        return {
            blogId: id,
            contentOwnerId: blog?.userId,
            form: {
                data: formData,
                getCategory: () => categories.find(category => formData.categoryId === category._id),
                getTags: () => tags.filter(tag => formData.tagIds?.includes(tag._id)),
                on: editorEventBus.on,
                off: editorEventBus.off
            },

            //for backward compat will remove soon and update other plugins too
            editor: {
                getTitle: () => formData.title || '',
                getContent: () => formData.content || '',
            },
            on: editorEventBus.on,
            off: editorEventBus.off,
            data: blog
        };
    }, [id, blog, categories, tags, formData, editorEventBus, tempRefresher]);

    const handleFieldChange = (key: string, value: any) => {
        setFormData(currentFormData => {
            const newData = {...currentFormData, [key]: value};
            editorEventBus.emit(`${key}:change`, value);
            return newData;
        });
        return null;
    };

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

    const handleUpdateBlog = async (data: any) => {
        const blogData = {
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt,
            content: data.content,
            status: data.status,
            categoryId: data.categoryId,
            tagIds: Array.isArray(data.tagIds) ? data.tagIds : [],
            featuredMediaId: data.featuredMediaId || null,
        };

        const result = await apis.updateBlog(blog!._id, blogData);

        location.route('/api/next-blog/dashboard/blogs');

        return result;
    };

    const getFormFields = useMemo((): DynamicFormFieldType[] => {
        if (!formData) return [];
        return [
            {key: 'title', label: 'Title', type: 'text', value: formData.title, required: true},
            {key: 'slug', label: 'Slug', type: 'text', value: formData.slug, required: true},
            {key: 'excerpt', label: 'Excerpt', type: 'textarea', value: formData.excerpt},
            {
                key: 'featuredMediaId',
                label: 'Featured Media',
                type: 'media',
                value: formData.featuredMediaId,
                mediaData: featuredMedia || undefined,
                intentOptions: {
                    options: {
                        mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
                        maxSize: 2 * 1024 * 1024,
                        allowUpload: true
                    }
                }
            },
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
                options: toOptions(categories),
                required: true,
                onSearch: searchCategories,
                onAdd: addNewCategory
            },
            {
                key: 'tagIds',
                label: 'Tags',
                type: 'multiselect',
                value: formData.tagIds,
                options: toOptions(tags),
                onSearch: searchTags,
                onAdd: addNewTag
            },
        ];
    }, [formData, categories, tags, featuredMedia, apis, editorRef.current]);

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
                <button onClick={() => window.history.back()}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100">
                    Back to List
                </button>
            </div>
            {loading ? <p>Loading blog data...</p> : error ?
                <div className="p-4 bg-red-100 text-red-800 rounded">Error: {error}</div> : !blog || !formData ?
                    <div className="p-4 bg-yellow-100 text-yellow-800 rounded">Blog not found</div> : (
                        <ExtensionZone name="blog-update-form" context={pluginContext}>
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-grow bg-white p-6 rounded-lg shadow-md mb-6">
                                    <ExtensionPoint name="blog-update-before" context={pluginContext}/>
                                    <DynamicForm
                                        id="updateBlog"
                                        submitLabel="Update Blog"
                                        apiMethod={handleUpdateBlog}
                                        fields={getFormFields}
                                        onFieldChange={handleFieldChange}
                                    />
                                    <ExtensionPoint name="blog-update-after" context={pluginContext}/>
                                </div>
                                <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0">
                                    <div className="sticky flex flex-col gap-2">
                                        {/*for backward compat*/}
                                        <ExtensionPoint name="editor-sidebar-widget" context={pluginContext}/>
                                        <ExtensionPoint name="blog-update-sidebar-widget" context={pluginContext}/>
                                    </div>
                                </div>
                            </div>
                        </ExtensionZone>
                    )}
        </div>
    );
};

export default UpdateBlog;
