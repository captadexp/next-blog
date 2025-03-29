import {h, FunctionComponent} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useLocation} from "preact-iso";

interface HomeProps {
    path?: string;
}

// Dashboard home page
const Home: FunctionComponent<HomeProps> = () => {
    const [isClient, setIsClient] = useState(false);

    // Effect to run client-side code
    useEffect(() => {
        setIsClient(true);
        console.log('Home component mounted');
    }, []);

    // Event handler demo
    const handleClick = () => {
        alert('Hello from client-side dashboard!');
        console.log('Button clicked');
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-5">Dashboard Home</h2>

            <div className="mb-8">
                <p className="mb-4">Welcome to the Next-Blog dashboard. Use the navigation above to manage your
                    content.</p>
                {isClient && (
                    <button
                        onClick={handleClick}
                        className="bg-blue-500 hover:bg-blue-600 text-white border-none py-2 px-4 rounded cursor-pointer mt-2"
                    >
                        Test Client Interaction
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Content section cards */}
                <SectionCard
                    title="Blogs"
                    description="Manage your blog posts"
                    link="/api/next-blog/dashboard/blogs"
                />
                <SectionCard
                    title="Categories"
                    description="Organize content with categories"
                    link="/api/next-blog/dashboard/categories"
                />
                <SectionCard
                    title="Tags"
                    description="Add tags to your content"
                    link="/api/next-blog/dashboard/tags"
                />
                <SectionCard
                    title="Authors"
                    description="Manage content creators"
                    link="/api/next-blog/dashboard/authors"
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
}

const SectionCard: FunctionComponent<SectionCardProps> = ({title, description, link}) => {
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
                className="inline-block no-underline text-blue-500 hover:text-blue-700 font-semibold text-sm"
            >
                Manage →
            </a>
        </div>
    );
};

export default Home;