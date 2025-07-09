import {h} from 'preact';
import {useState} from 'preact/hooks';
import {useUser} from "../../../context/UserContext.tsx";
import {useLocation} from "preact-iso";

const CreatePlugin = () => {
    const {apis: api} = useUser();
    const {route} = useLocation();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState<string>('');

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.createPlugin({url});
            if (response.code === 0) {
                route('/api/next-blog/dashboard/plugins?r=1');
            } else {
                setError(response.message || 'Failed to create plugin');
            }
        } catch (err) {
            setError('An error occurred while creating the plugin');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Create New Plugin</h2>
            </div>

            {error && (
                <div className="p-4 mb-4 bg-red-100 text-red-800 rounded-md flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md">
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="url">
                            Plugin URL
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="url"
                            type="text"
                            name="url"
                            value={url}
                            onChange={(e: any) => setUrl(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => route('/api/next-blog/dashboard/plugins')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? (
                                <div
                                    className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
                            ) : 'Create Plugin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePlugin;
