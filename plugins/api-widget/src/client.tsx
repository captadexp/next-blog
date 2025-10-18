import type {ClientSDK} from "@supergrowthai/plugin-dev-kit/client";
import {useEffect, useState} from "@supergrowthai/plugin-dev-kit/client";
import {defineClient} from "@supergrowthai/plugin-dev-kit";
import "./styles.css"

// Type definitions for API responses and data structures
interface Blog {
    _id: string;
    title: string;
    slug: string;
    content: string;
    category: string;
    tags: string[];
    userId: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
    type?: 'post' | 'page' | string;
    status?: 'draft' | 'pending' | 'private' | 'published' | 'trash';
    featuredImage?: string;
    excerpt?: string;
    parent?: string;
}

// Component for loading state
function LoadingState() {
    return <p>Loading...</p>;
}

// Component for displaying blog data
interface BlogDisplayProps {
    blog: Blog | { title: string };
}

function BlogDisplay({blog}: BlogDisplayProps) {
    const isFullBlog = '_id' in blog;

    return (
        <>
            <h3 className="font-bold">Latest Blog Post</h3>
            <p>{blog.title}</p>
            {isFullBlog && blog.excerpt && (
                <p className="text-sm text-gray-600 mt-1">{blog.excerpt}</p>
            )}
            {isFullBlog && blog.status && (
                <span className="text-xs text-gray-500">Status: {blog.status}</span>
            )}
        </>
    );
}

// Component for refresh button
interface RefreshButtonProps {
    onClick: () => void;
}

function RefreshButton({onClick}: RefreshButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="btn mt-2 p-2 border border-gray-100 rounded hover:bg-gray-50 transition-colors"
        >
            Refresh Data
        </button>
    );
}

// Main dashboard widget component
function DashboardWidget(sdk: ClientSDK) {
    const [cachedData, setCachedData] = useState<Blog | { title: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        setCachedData({title: "Loading..."});

        try {
            const response = await sdk.apis.getBlogs();

            if (response.code === 0 && response.payload && response.payload.data.length > 0) {
                // Get the latest blog post (last item in array)
                const latestBlog = response.payload.data[response.payload.data.length - 1];
                if (latestBlog) {
                    sdk.notify("Latest blog loaded");
                    setCachedData(latestBlog);
                } else {
                    setCachedData({title: "No blogs found."});
                }
            } else {
                setCachedData({title: "Could not fetch latest blog."});
            }
        } catch (err: unknown) {
            console.error('Error fetching blogs:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setCachedData({title: `Error: ${errorMessage}`});
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []); // Empty dependency array - only run once on mount

    // Show loading state while initial fetch is happening
    if (isLoading && cachedData === null) {
        return <LoadingState/>;
    }

    // Render the UI based on the current cachedData
    return (
        <div className="p-4 border border-gray-100 rounded my-2">
            {cachedData && <BlogDisplay blog={cachedData}/>}
            <RefreshButton onClick={fetchData}/>
        </div>
    );
}

export default defineClient({
    hooks: {
        "dashboard-widget": DashboardWidget
    }
});