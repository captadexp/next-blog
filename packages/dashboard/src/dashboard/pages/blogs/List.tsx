import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useEffect, useState} from 'preact/hooks';
import {useUser} from '../../../context/UserContext';
import {Blog, PaginatedResponse} from '@supergrowthai/next-blog-types';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {usePagination} from '../../../hooks/usePagination';
import {PaginationControls} from '../../../components/PaginationControls';

interface BlogsListProps {
    path?: string;
}

const BlogsList: FunctionComponent<BlogsListProps> = () => {
    const location = useLocation();
    const {apis, user, hasPermission} = useUser();
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginatedResponse<Blog> | null>(null);

    const {page, setPage, getParams} = usePagination();

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!user && !loading) {
            location.route('/api/next-blog/dashboard/login');
            return;
        }

        // Function to fetch blogs from the API
        const fetchBlogs = async () => {
            try {
                const params = getParams();
                const response = await apis.getBlogs(params);

                if (response.code === 0 && response.payload) {
                    setBlogs(response.payload.data);
                    setPagination(response.payload);
                } else {
                    throw new Error(response.message || 'Failed to fetch blogs');
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching blogs:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchBlogs();
    }, [user, loading, page]);

    // Format date for display
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <ExtensionZone name="blogs-list" context={{data: blogs}}>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold m-0">Blogs</h2>
                {hasPermission('blogs:create') && (
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
                )}
            </div>

            <ExtensionPoint name="blogs-list-toolbar" context={{blogs}}/>

            {loading ? (
                <p>Loading blogs...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : blogs.length === 0 ? (
                <p>No blogs found. Create your first blog post!</p>
            ) : (
                <ExtensionZone name="blogs-table" context={{data: blogs}}>
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
                                <>
                                    <ExtensionPoint name="blog-item:before" context={{blog}}/>
                                    <tr key={blog._id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="p-3">
                                            {blog.title}{blog.status === 'draft' &&
                                            <span className="ml-2 text-gray-500 text-sm font-medium">[Draft]</span>}
                                        </td>
                                        <td className="p-3">{formatDate(blog.createdAt)}</td>
                                        <td className="p-3">{formatDate(blog.updatedAt)}</td>
                                        <td className="p-3">
                                            {hasPermission('blogs:update') && (
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
                                            )}
                                            {hasPermission('blogs:delete') && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Are you sure you want to delete "${blog.title}"?`)) {
                                                            try {
                                                                const response = await apis.deleteBlog(blog._id);

                                                                if (response.code === 0) {
                                                                    // Remove the blog from state
                                                                    setBlogs(blogs.filter(b => b._id !== blog._id));
                                                                } else {
                                                                    alert(`Error: ${response.message}`);
                                                                }
                                                            } catch (err) {
                                                                console.error('Error deleting blog:', err);
                                                                alert('Failed to delete blog. Please try again.');
                                                            }
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    <ExtensionPoint name="blog-item:after" context={{blog}}/>
                                </>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </ExtensionZone>
            )}

            <PaginationControls
                pagination={pagination}
                currentPage={page}
                dataLength={blogs.length}
                onPageChange={setPage}
            />
        </ExtensionZone>
    );
};

export default BlogsList;