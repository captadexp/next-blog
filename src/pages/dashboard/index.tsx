export default function Dashboard() {
    return (
        <div className="max-w-lg mx-auto p-5 bg-gray-50 rounded-lg shadow-md">
            <ul className="list-none m-0 p-0">
                <li className="border-b border-gray-200 p-3">
                    <a href="/api/next-blog/dashboard/blogs" className="text-blue-500 text-lg hover:underline">
                        Blogs
                    </a>
                </li>
                <li className="border-b border-gray-200 p-3">
                    <a href="/api/next-blog/dashboard/tags" className="text-blue-500 text-lg hover:underline">
                        Tags
                    </a>
                </li>
                <li className="border-b border-gray-200 p-3">
                    <a href="/api/next-blog/dashboard/categories" className="text-blue-500 text-lg hover:underline">
                        Categories
                    </a>
                </li>
                <li className="border-b border-gray-200 p-3">
                    <a href="/api/next-blog/dashboard/authors" className="text-blue-500 text-lg hover:underline">
                        Authors
                    </a>
                </li>
            </ul>
        </div>
    );
}
