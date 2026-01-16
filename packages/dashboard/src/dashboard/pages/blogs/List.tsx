import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useUser} from '../../../context/UserContext';
import {Blog} from '@supergrowthai/next-blog-types';
import {ExtensionPoint, ExtensionZone} from '../../components/ExtensionZone';
import {PaginationControls} from '../../../components/PaginationControls';
import Loader from '../../../components/Loader';
import {useEntityList} from '../../../hooks/useEntityList';
import ListPage from '../../../components/ListPageLayout';

interface BlogsListProps {
    path?: string;
}

const BlogsList: FunctionComponent<BlogsListProps> = () => {
    const location = useLocation();
    const {apis, hasPermission} = useUser();

    const {
        entities: blogs,
        paginationLoading,
        error,
        pagination,
        deletingIds,
        handlePageChange,
        handleDelete,
        page
    } = useEntityList<Blog>({
        fetchFn: apis.getBlogs.bind(apis),
        deleteFn: apis.deleteBlog.bind(apis),
        entityName: 'blog'
    });

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <ExtensionZone name="blogs-list" context={{data: blogs}}>
            <ListPage paginationLoading={paginationLoading}>
                <ListPage.Header>
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
                </ListPage.Header>

                <ExtensionPoint name="blogs-list-toolbar" context={{blogs}}/>

                <ListPage.Content
                    loading={paginationLoading}
                    error={error}
                    empty={blogs.length === 0}
                    emptyMessage="No blogs found. Create your first blog post!"
                >
                    <ExtensionZone name="blogs-table" context={{data: blogs}}>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-3 text-left border-b border-gray-200">Title</th>
                                    <th className="p-3 text-left border-b border-gray-200">Created</th>
                                    <th className="p-3 text-left border-b border-gray-200">Updated</th>
                                    <th className="p-3 text-left border-b border-gray-200">Published</th>
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
                                                <span
                                                    className="ml-2 text-gray-500 text-sm font-medium">[Draft]</span>}
                                            </td>
                                            <td className="p-3">{formatDate(blog.createdAt)}</td>
                                            <td className="p-3">{formatDate(blog.updatedAt)}</td>
                                            <td className="p-3">
                                                {blog.publishedAt ? formatDate(blog.publishedAt) : (blog.status === 'published' ? formatDate(blog.createdAt) : '-')}
                                            </td>
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
                                                        onClick={() => handleDelete(blog, `Are you sure you want to delete "${blog.title}"?`)}
                                                        disabled={deletingIds.has(blog._id)}
                                                        className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0 font-inherit disabled:opacity-50"
                                                    >
                                                        {deletingIds.has(blog._id) ?
                                                            <Loader size="sm" text=""/> : 'Delete'}
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
                </ListPage.Content>

                <PaginationControls
                    pagination={pagination}
                    currentPage={page}
                    dataLength={blogs.length}
                    onPageChange={handlePageChange}
                    loading={paginationLoading}
                />
            </ListPage>
        </ExtensionZone>
    );
};

export default BlogsList;