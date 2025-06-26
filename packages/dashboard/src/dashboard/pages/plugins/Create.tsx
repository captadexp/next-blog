import {h} from 'preact';
import {useState} from 'preact/hooks';
import {CreatePluginInput, PluginType} from '../../../types/api';
import {useUser} from "../../../context/UserContext.tsx";
import {useLocation} from "preact-iso";

const CreatePlugin = () => {
    const {apis: api} = useUser();
    const {route} = useLocation();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreatePluginInput>({
        name: '',
        description: '',
        version: '1.0.0',
        type: 'external' as PluginType,
        entryPoint: '',
        author: ''
    });

    const handleChange = (e: any) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.createPlugin(formData);
            if (response.code === 0) {
                route('/api/next-blog/dashboard/plugins');
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
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                            Name *
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                            Description
                        </label>
                        <textarea
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="version">
                            Version *
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="version"
                            type="text"
                            name="version"
                            value={formData.version}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="type">
                            Type *
                        </label>
                        <select
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            required
                        >
                            <option value="external">External</option>
                            <option value="lite">Lite</option>
                            <option value="browser">Browser</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="entryPoint">
                            Entry Point *
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="entryPoint"
                            type="text"
                            name="entryPoint"
                            value={formData.entryPoint}
                            onChange={handleChange}
                            required
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            For external plugins: URL to the plugin. For lite plugins: path to the plugin file. For
                            browser plugins: filename of the plugin file (e.g., hello-dolly.dashboard.client.ts).
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="author">
                            Author *
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="author"
                            type="text"
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
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
