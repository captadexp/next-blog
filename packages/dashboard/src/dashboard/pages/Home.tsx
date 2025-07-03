import {FunctionComponent, h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from "preact-iso";
import {useUser} from '../../context/UserContext';

interface HomeProps {
    path?: string;
}

// Dashboard home page
const Home: FunctionComponent<HomeProps> = () => {
    const [isClient, setIsClient] = useState(false);
    const {user, config, loading} = useUser();
    const location = useLocation();

    // Effect to run client-side code
    useEffect(() => {
        setIsClient(true);
        console.log('Home component mounted');
    }, []);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (isClient && !loading && !user) {
            location.route('/api/next-blog/dashboard/login');
        }
    }, [isClient, loading, user, location]);

    // Get welcome text from config or use default
    const welcomeText = config?.branding?.description ||
        'Welcome to the Next-Blog dashboard. Use the navigation above to manage your content.';

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-5">Dashboard Home</h2>

            <div className="mb-8">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                {`Welcome, ${user.name}! You are logged in with ${user.permissions.join(",")} permissions.`}
                            </p>
                        </div>
                    </div>
                </div>

                <p className="mb-4">{welcomeText}</p>
            </div>

            <div className="flex flex-wrap gap-5">
                <div className="flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                        {/* Top row: Blogs and Categories */}
                        <SectionCard
                            title="Blogs"
                            description="Manage your blog posts"
                            link="/api/next-blog/dashboard/blogs"
                            color={config?.theme?.primaryColor}
                        />
                        <SectionCard
                            title="Categories"
                            description="Organize content with categories"
                            link="/api/next-blog/dashboard/categories"
                            color={config?.theme?.primaryColor}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Bottom row: Tags and Users */}
                        <SectionCard
                            title="Tags"
                            description="Add tags to your content"
                            link="/api/next-blog/dashboard/tags"
                            color={config?.theme?.primaryColor}
                        />
                        <SectionCard
                            title="Authors"
                            description="Manage content creators"
                            link="/api/next-blog/dashboard/users"
                            color={config?.theme?.primaryColor}
                        />
                    </div>
                </div>
                <div className="w-full md:w-60 lg:w-72">
                    <DraftBox/>
                </div>

            </div>
        </div>
    );
};

// Helper component for section cards
interface SectionCardProps {
    title: string;
    description: string;
    link: string;
    color?: string;
}

const SectionCard: FunctionComponent<SectionCardProps> = ({title, description, link, color = '#3498db'}) => {
    const location = useLocation();

    return (
        <div
            className="p-5 bg-white rounded-lg shadow-sm flex flex-col border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-medium mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-4 flex-grow">{description}</p>
            <a
                href={link}
                onClick={(e) => {
                    e.preventDefault();
                    location.route(link);
                }}
                className="inline-block no-underline font-semibold text-sm"
                style={{color: color}}
            >
                Manage →
            </a>
        </div>
    );
};

// DraftBox component for creating draft blogs
const DraftBox: FunctionComponent = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const {apis, hasPermission} = useUser();
    const location = useLocation();

    // Handle draft submission
    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        if (!title.trim()) {
            setMessage({text: 'Title is required', type: 'error'});
            return;
        }

        setSaving(true);

        try {
            // Create slug from title
            const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            // Fetch default category
            const categoriesResponse = await apis.getCategories();
            let categoryId = 'all';

            if (categoriesResponse.code === 0 && categoriesResponse.payload && categoriesResponse.payload.length > 0) {
                categoryId = categoriesResponse.payload[0]._id;
            }

            // Create draft blog post
            const response = await apis.createBlog({
                title,
                slug,
                content,
                status: 'draft',
                tags: [],
                category: categoryId
            });

            if (response.code === 0 && response.payload) {
                setMessage({text: 'Draft saved successfully!', type: 'success'});
                setTitle('');
                setContent('');

                // Clear success message after 3 seconds
                setTimeout(() => setMessage(null), 3000);
            } else {
                throw new Error(response.message || 'Failed to save draft');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            setMessage({
                text: error instanceof Error ? error.message : 'Failed to save draft',
                type: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    // Only show if user has permission to create blogs
    if (!hasPermission('blogs:create')) {
        return null;
    }

    return (
        <div className="border border-gray-100 rounded-lg p-4 shadow-sm bg-gray-50">
            <h2 className="text-base font-semibold mb-3">Quick Draft</h2>
            {message && (
                <div className={`p-2 mb-3 text-xs rounded ${
                    message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="block text-xs font-medium mb-1" htmlFor="draft-title">
                        Title
                    </label>
                    <input
                        type="text"
                        id="draft-title"
                        value={title}
                        onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
                        placeholder="Enter title"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="mb-3">
                    <label className="block text-xs font-medium mb-1" htmlFor="draft-content">
                        Content
                    </label>
                    <textarea
                        id="draft-content"
                        value={content}
                        onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
                        placeholder="Write something..."
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px] resize-y focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex justify-between items-center">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-3 py-1 text-xs rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <a
                        href="/api/next-blog/dashboard/blogs"
                        onClick={(e) => {
                            e.preventDefault();
                            location.route('/api/next-blog/dashboard/blogs');
                        }}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        View All
                    </a>
                </div>
            </form>
        </div>
    );
};


export default Home;