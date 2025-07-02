import {h, FunctionComponent} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import {useUser} from '../../../context/UserContext';

const Settings: FunctionComponent = () => {
    const {config, apis} = useUser();
    const [blogBasePath, setBlogBasePath] = useState('');
    const [message, setMessage] = useState({type: '', text: ''});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initialize with current value if available
        if (config?.blogBasePath) {
            setBlogBasePath(config.blogBasePath);
        }
    }, [config]);
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setLoading(true);
        setMessage({type: '', text: ''});

        // Ensure path starts with a slash
        let formattedPath = blogBasePath;
        if (formattedPath && !formattedPath.startsWith('/')) {
            formattedPath = '/' + formattedPath;
        }

        // Ensure path doesn't end with a slash
        if (formattedPath && formattedPath.endsWith('/')) {
            formattedPath = formattedPath.slice(0, -1);
        }

        // If empty, default to /blog
        if (!formattedPath) {
            formattedPath = '/blog';
        }

        try {
            const response = await apis.updateConfig({
                blogBasePath: formattedPath
            });

            if (response.code === 0) {
                setMessage({
                    type: 'success',
                    text: 'Blog base path saved successfully!'
                });
                setBlogBasePath(formattedPath);
            } else {
                setMessage({
                    type: 'error',
                    text: response.message || 'Failed to save settings'
                });
            }
        } catch (err) {
            setMessage({
                type: 'error',
                text: 'An error occurred while saving settings'
            });
            console.error('Error saving settings:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-bold mb-6">Dashboard Settings</h1>

            <div className="bg-white shadow rounded-lg p-6 mb-6 bg-white">
                <h2 className="text-lg font-semibold mb-4">Blog Configuration</h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1" htmlFor="blogBasePath">
                            Blog Base Path
                        </label>
                        <input
                            type="text"
                            id="blogBasePath"
                            className="w-full p-2 border rounded focus:ring focus:ring-blue-300 bg-white dark:border-gray-600"
                            value={blogBasePath}
                            onChange={(e) => setBlogBasePath((e.target as HTMLInputElement).value)}
                            placeholder="/blog"
                        />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            The base path for your blog URLs (e.g., /blog). Will be used for generating preview URLs.
                        </p>
                    </div>

                    {message.text && (
                        <div className={`mb-4 p-2 rounded ${
                            message.type === 'success' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-800"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Settings;