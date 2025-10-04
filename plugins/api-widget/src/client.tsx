import type {ClientSDK} from "@supergrowthai/plugin-dev-kit/client";
import {defineClient} from "@supergrowthai/plugin-dev-kit";

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

interface StandardResponse<T> {
    authenticated?: boolean;
    code: number;
    message: string;
    payload?: T;
}

// Plugin state with proper typing
interface PluginState {
    latestSdk: ClientSDK | null;
    cachedData: Blog | { title: string } | null;
}

// Plugin state persists between re-renders
const pluginState: PluginState = {
    latestSdk: null,
    cachedData: null
};

// Component for loading state
function LoadingState() {
    return <p>Initializing widget...</p>;
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
    pluginState.latestSdk = sdk;

    const fetchData = async (): Promise<void> => {
        const currentSdk = pluginState.latestSdk;
        if (!currentSdk) {
            console.error('SDK not available');
            return;
        }

        // Show loading state
        pluginState.cachedData = {title: "Loading..."};
        currentSdk.refresh(); // Refresh immediately to show "Loading..."

        try {
            const response = await currentSdk.apis.getBlogs();

            if (response.code === 0 && response.payload && response.payload.length > 0) {
                // Get the latest blog post (last item in array)
                const latestBlog = response.payload[response.payload.length - 1];
                if (latestBlog) {
                    currentSdk.notify("Latest blog loaded");
                    pluginState.cachedData = latestBlog;
                } else {
                    pluginState.cachedData = {title: "No blogs found."};
                }
            } else {
                pluginState.cachedData = {title: "Could not fetch latest blog."};
            }
        } catch (err: unknown) {
            console.error('Error fetching blogs:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            pluginState.cachedData = {title: `Error: ${errorMessage}`};
        }

        // After the API call is done, refresh again with the final data
        currentSdk.refresh();
    };

    // If we have no data yet, trigger the initial fetch
    if (pluginState.cachedData === null) {
        // Use setTimeout to avoid an infinite loop if the API fails instantly
        setTimeout(() => fetchData(), 0);
        return <LoadingState/>;
    }

    // Render the UI based on the current cachedData
    return (
        <div className="p-4 border border-gray-100 rounded my-2">
            <BlogDisplay blog={pluginState.cachedData}/>
            <RefreshButton onClick={fetchData}/>
        </div>
    );
}

export default defineClient({
    hooks: {
        "dashboard-widget": DashboardWidget
    }
});