import {h, FunctionComponent} from 'preact';
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Content section cards */}
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
                <SectionCard
                    title="Tags"
                    description="Add tags to your content"
                    link="/api/next-blog/dashboard/tags"
                    color={config?.theme?.primaryColor}
                />
                <SectionCard
                    title="Authors"
                    description="Manage content creators"
                    link="/api/next-blog/dashboard/authors"
                    color={config?.theme?.primaryColor}
                />
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

export default Home;