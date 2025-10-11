import type {RecentBlog} from '../utils/types.js';
import {formatDate, getStatusBadge} from '../utils/formatters.js';

interface RecentBlogsProps {
    recentBlogs: RecentBlog[];
    onRefresh: () => void;
}

export function RecentBlogs({recentBlogs, onRefresh}: RecentBlogsProps) {
    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Generated Blogs</h2>
                <button
                    onClick={onRefresh}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Refresh
                </button>
            </div>

            {recentBlogs.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📝</div>
                    <p className="text-gray-500">No blogs generated yet</p>
                    <p className="text-xs text-gray-400 mt-1">Generated blogs will appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {recentBlogs.map((blog, index) => {
                        const statusBadge = getStatusBadge(blog.status);
                        return (
                            <div key={`blog-${blog.id}-${index}`}
                                 className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h3 className="font-medium text-gray-900 truncate">{blog.title}</h3>
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                                {statusBadge.text}
                                            </span>
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                🤖 AI Generated
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                            <span>📅 {formatDate(blog.createdAt)}</span>
                                            {blog.topic && <span>🏷️ {blog.topic}</span>}
                                            <span>🔗 {blog.slug}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                    <strong>Plugin Metadata:</strong> All generated blogs include metadata tags:
                    <code className="ml-1 px-1 bg-gray-200 rounded">generatedBy: "ai-blog-generator"</code>,
                    <code className="ml-1 px-1 bg-gray-200 rounded">aiGenerated: true</code>,
                    <code className="ml-1 px-1 bg-gray-200 rounded">requiresReview: true</code>
                </p>
            </div>
        </div>
    );
}