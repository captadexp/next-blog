import {h, FunctionComponent} from 'preact';
import {useLocation} from 'preact-iso';
import {useEffect, useState} from 'preact/hooks';

interface BlogsListProps {
    path?: string;
}

// Simple Blog interface
interface Blog {
    _id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

const BlogsList: FunctionComponent<BlogsListProps> = () => {
    const location = useLocation();
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Function to fetch blogs from the API
        const fetchBlogs = async () => {
            try {
                // In a real app, this would fetch from your API
                // For now, we'll simulate it
                const response = await fetch('/api/next-blog/api/blogs');

                if (!response.ok) {
                    throw new Error(`Error fetching blogs: ${response.statusText}`);
                }

                const data = await response.json();
                setBlogs(Array.isArray(data) ? data : []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching blogs:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);

                // For testing, set some dummy data
                setBlogs([
                    {
                        _id: '1',
                        title: 'Introduction to Next-Blog',
                        createdAt: Date.now() - 86400000,
                        updatedAt: Date.now() - 43200000
                    },
                    {
                        _id: '2',
                        title: 'Building with Preact',
                        createdAt: Date.now() - 172800000,
                        updatedAt: Date.now() - 86400000
                    },
                    {
                        _id: '3',
                        title: 'Client-Side Routing',
                        createdAt: Date.now() - 259200000,
                        updatedAt: Date.now() - 172800000
                    },
                ]);
            }
        };

        fetchBlogs();
    }, []);

    // Format date for display
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold m-0">Blogs</h2>
                <a 
                    href="/api/next-blog/dashboard/blogs/create"
                    onClick={(e) => {
                        e.preventDefault();
                        location.route('/api/next-blog/dashboard/blogs/create');
                    }}
                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white no-underline px-4 py-2 rounded"
                >
                    Create New Blog
                </a>
            </div>

            {loading ? (
                <p>Loading blogs...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : blogs.length === 0 ? (
                <p>No blogs found. Create your first blog post!</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 text-left border-b border-gray-200">Title</th>
                            <th className="p-3 text-left border-b border-gray-200">Created</th>
                            <th className="p-3 text-left border-b border-gray-200">Updated</th>
                            <th className="p-3 text-left border-b border-gray-200">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {blogs.map(blog => (
                            <tr key={blog._id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-3">{blog.title}</td>
                                <td className="p-3">{formatDate(blog.createdAt)}</td>
                                <td className="p-3">{formatDate(blog.updatedAt)}</td>
                                <td className="p-3">
                                    <a
                                        href={`/api/next-blog/dashboard/blogs/${blog._id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            location.route(`/api/next-blog/dashboard/blogs/${blog._id}`);
                                        }}
                                        className="text-blue-500 hover:text-blue-700 no-underline mr-3"
                                    >
                                        Edit
                                    </a>
                                    <button
                                        onClick={() => alert(`Delete blog: ${blog._id}`)}
                                        className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BlogsList;