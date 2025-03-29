import { h, FunctionComponent } from 'preact';
import { useLocation } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';

interface AuthorsListProps {
  path?: string;
}

// Simple Author interface
interface Author {
  _id: string;
  name: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
}

const AuthorsList: FunctionComponent<AuthorsListProps> = () => {
  const location = useLocation();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Function to fetch authors from the API
    const fetchAuthors = async () => {
      try {
        // Fetch authors data from API
        const response = await fetch('/api/next-blog/api/authors');
        
        if (!response.ok) {
          throw new Error(`Error fetching authors: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAuthors(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching authors:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        
        // For testing, set some dummy data
        setAuthors([
          { _id: '1', name: 'John Doe', email: 'john@example.com', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 43200000 },
          { _id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: Date.now() - 172800000, updatedAt: Date.now() - 86400000 },
          { _id: '3', name: 'Alex Johnson', email: 'alex@example.com', createdAt: Date.now() - 259200000, updatedAt: Date.now() - 172800000 },
        ]);
      }
    };

    fetchAuthors();
  }, []);

  // Format date for display
  const formatDate = (timestamp?: number) => {
    return timestamp ? new Date(timestamp).toLocaleDateString() : 'N/A';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold m-0">Authors</h2>
        <a 
          href="/api/next-blog/dashboard/authors/create"
          onClick={(e) => {
            e.preventDefault();
            location.route('/api/next-blog/dashboard/authors/create');
          }}
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white no-underline px-4 py-2 rounded"
        >
          Create New Author
        </a>
      </div>

      {loading ? (
        <p>Loading authors...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          Error: {error}
        </div>
      ) : authors.length === 0 ? (
        <p>No authors found. Create your first author!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left border-b border-gray-200">Name</th>
                <th className="p-3 text-left border-b border-gray-200">Email</th>
                <th className="p-3 text-left border-b border-gray-200">Created</th>
                <th className="p-3 text-left border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {authors.map(author => (
                <tr key={author._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3">{author.name}</td>
                  <td className="p-3">{author.email || 'N/A'}</td>
                  <td className="p-3">{formatDate(author.createdAt)}</td>
                  <td className="p-3">
                    <a 
                      href={`/api/next-blog/dashboard/authors/${author._id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        location.route(`/api/next-blog/dashboard/authors/${author._id}`);
                      }}
                      className="text-blue-500 hover:text-blue-700 no-underline mr-3"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => alert(`Delete author: ${author._id}`)}
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

export default AuthorsList;