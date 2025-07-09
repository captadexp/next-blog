import {FunctionComponent, h} from 'preact';
import {useLocation} from 'preact-iso';
import {useEffect, useState} from 'preact/hooks';
import {useUser} from "../../../context/UserContext.tsx";

interface TagsListProps {
    path?: string;
}

// Simple Tag interface
interface Tag {
    _id: string;
    name: string;
    slug?: string;
    createdAt?: number;
    updatedAt?: number;
}

const TagsList: FunctionComponent<TagsListProps> = () => {
    const location = useLocation();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const {apis} = useUser();

    const fetchTags = async () => {
        try {
            // Fetch tags data from API
            const response = await apis.getTags()

            if (response.code !== 0) {
                throw new Error(`Error fetching tags: ${response.message}`);
            }

            const data = response.payload!;
            setTags(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching tags:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    // Format date for display
    const formatDate = (timestamp?: number) => {
        return timestamp ? new Date(timestamp).toLocaleDateString() : 'N/A';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold m-0">Tags</h2>
                <a
                    href="/api/next-blog/dashboard/tags/create"
                    onClick={(e) => {
                        e.preventDefault();
                        location.route('/api/next-blog/dashboard/tags/create');
                    }}
                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white no-underline px-4 py-2 rounded"
                >
                    Create New Tag
                </a>
            </div>

            {loading ? (
                <p>Loading tags...</p>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded">
                    Error: {error}
                </div>
            ) : tags.length === 0 ? (
                <p>No tags found. Create your first tag!</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 text-left border-b border-gray-200">Name</th>
                            <th className="p-3 text-left border-b border-gray-200">Slug</th>
                            <th className="p-3 text-left border-b border-gray-200">Created</th>
                            <th className="p-3 text-left border-b border-gray-200">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {tags.map(tag => (
                            <tr key={tag._id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-3">{tag.name}</td>
                                <td className="p-3">{tag.slug || 'N/A'}</td>
                                <td className="p-3">{formatDate(tag.createdAt)}</td>
                                <td className="p-3">
                                    <a
                                        href={`/api/next-blog/dashboard/tags/${tag._id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            location.route(`/api/next-blog/dashboard/tags/${tag._id}`);
                                        }}
                                        className="text-blue-500 hover:text-blue-700 no-underline mr-3"
                                    >
                                        Edit
                                    </a>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Delete tag: ${tag._id}`)) {
                                                apis.deleteTag(tag._id)
                                                    .then(() => fetchTags());
                                            }
                                        }}
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

export default TagsList;