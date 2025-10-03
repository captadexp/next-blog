import {BrokenLink} from '../types';

interface LinkReportProps {
    linkData: BrokenLink;
}

export function LinkReport({linkData}: LinkReportProps) {
    return (
        <li className="mb-4 p-3 border rounded bg-gray-50">
            <div className="font-semibold text-red-600 break-all">
                URL: {linkData.url}
            </div>
            <div className="text-sm text-gray-700">
                Status: {linkData.status}
            </div>
            <div className="mt-2">
                <strong className="text-sm">Found in:</strong>
                <ul className="list-disc list-inside pl-2 mt-1">
                    {linkData.posts.map((post) => (
                        <li>
                            <a
                                href={`/api/next-blog/dashboard/blogs/${post.postId}`}
                                className="text-blue-600 hover:underline"
                            >
                                {post.postTitle}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </li>
    );
}