import {FunctionComponent, h} from 'preact';
import {usePlugins} from '../../../context/PluginContext.tsx';
import {ExtensionPoint} from '../../components/ExtensionZone';
import {useUser} from "../../../context/UserContext.tsx";

const PluginPanel: FunctionComponent<{ pluginId: string }> = ({pluginId}) => {
    const {plugins} = usePlugins();
    const {config} = useUser();
    const plugin = plugins.find(p => p._id === pluginId);

    if (!plugin) {
        return <div>Plugin not found or not loaded.</div>;
    }

    return (
        <div className="plugin-panel">
            <h2 className="text-2xl font-bold mb-4">{plugin.name} Panel</h2>
            <ExtensionPoint
                name="system:plugin:settings-panel"
                pluginFilter={pluginId}
            />
        </div>
    );
};

export default PluginPanel;
