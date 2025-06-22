import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {Plugin, UpdatePluginInput, PluginType} from '../../../types/api';
import {useUser} from "../../../context/UserContext.tsx";
import {useLocation, useRoute} from "preact-iso";

const UpdatePlugin = ({id}: { id: string }) => {
    const {apis: api} = useUser();
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [plugin, setPlugin] = useState<Plugin | null>(null);
    const {route} = useLocation()
    const [formData, setFormData] = useState<UpdatePluginInput>({
        name: '',
        description: '',
        version: '',
        type: 'external' as PluginType,
        entryPoint: '',
        author: ''
    });

    useEffect(() => {
        fetchPlugin();
    }, [id]);

    const fetchPlugin = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.getPlugin(id);
            if (response.code === 0 && response.payload) {
                const pluginData = response.payload;
                setPlugin(pluginData);
                setFormData({
                    name: pluginData.name,
                    description: pluginData.description,
                    version: pluginData.version,
                    type: pluginData.type,
                    entryPoint: pluginData.entryPoint,
                    author: pluginData.author
                });
            } else {
                setError(response.message || 'Failed to fetch plugin');
            }
        } catch (err) {
            setError('An error occurred while fetching the plugin');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: any) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const response = await api.updatePlugin(id, formData);
            if (response.code === 0) {
                route('/api/next-blog/dashboard/plugins');
            } else {
                setError(response.message || 'Failed to update plugin');
            }
        } catch (err) {
            setError('An error occurred while updating the plugin');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <div
                    className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!plugin) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="p-4 mb-4 bg-red-100 text-red-800 rounded-md">
                    Plugin not found
                </div>
                <div className="mt-4">
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        onClick={() => route('/api/next-blog/dashboard/plugins')}
                    >
                        Back to Plugins
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Edit Plugin: {plugin.name}</h2>
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
                            browser plugins: JavaScript function name.
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
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            disabled={saving}
                        >
                            {saving ? (
                                <div
                                    className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
                            ) : 'Update Plugin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdatePlugin;
