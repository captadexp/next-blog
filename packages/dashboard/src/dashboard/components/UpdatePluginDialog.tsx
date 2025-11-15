import {h} from 'preact';
import {Plugin} from '@supergrowthai/next-blog-types';
import {useEffect, useState} from 'preact/hooks';
import {useUser} from '../../context/UserContext';
import {usePlugins} from '../../context/PluginContext';

interface UpdatePluginDialogProps {
    plugin: Plugin | null;
    show: boolean;
    onClose: () => void;
}

export const UpdatePluginDialog = ({
                                       plugin,
                                       show,
                                       onClose
                                   }: UpdatePluginDialogProps) => {
    const {apis} = useUser();
    const {hardReloadPlugins} = usePlugins();
    const [updateUrl, setUpdateUrl] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (plugin) {
            setUpdateUrl(plugin.url || '');
        }
    }, [plugin]);

    const handleUpdate = async () => {
        if (!plugin) return;

        setIsUpdating(true);
        try {
            const response = await apis.updatePlugin(
                plugin._id,
                updateUrl !== plugin.url ? {url: updateUrl} : undefined
            );

            if (response.code === 0) {
                await hardReloadPlugins();
                alert('Plugin updated successfully');
                onClose();
            } else {
                alert(`Failed to update plugin: ${response.message}`);
            }
        } catch (error: any) {
            alert(`Error updating plugin: ${error.message || error}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        if (!isUpdating) {
            setUpdateUrl('');
            onClose();
        }
    };

    if (!show || !plugin) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box bg-white">
                <h3 className="font-bold text-lg">Update Plugin</h3>
                <p className="py-2">
                    Updating: <strong>{plugin.name}</strong>
                </p>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Plugin URL</span>
                    </label>
                    <input
                        type="text"
                        className="input input-bordered w-full bg-white"
                        value={updateUrl}
                        onChange={(e) => setUpdateUrl((e.target as HTMLInputElement).value)}
                        disabled={isUpdating}
                    />
                </div>

                <div className="modal-action">
                    <button
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded disabled:opacity-50"
                        onClick={handleCancel}
                        disabled={isUpdating}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                        onClick={handleUpdate}
                        disabled={isUpdating}
                    >
                        {isUpdating ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    );
};