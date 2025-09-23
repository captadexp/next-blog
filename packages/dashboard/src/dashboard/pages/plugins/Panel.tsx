import {FunctionComponent, h} from 'preact';
import {usePlugins} from '../../../context/PluginContext.tsx';
import {PluginSlot} from '../../components/plugins/PluginSlot.tsx';
import {useUser} from "../../../context/UserContext.tsx";

const PluginPanel: FunctionComponent<{ pluginId: string }> = ({pluginId}) => {
    const {plugins} = usePlugins();
    const {config} = useUser();
    const plugin = plugins.find(p => p._id === pluginId);

    if (!plugin) {
        return <div>Plugin not found or not loaded.</div>;
    }

    const panelHookName = `dashboard-panel-${plugin.name.toLowerCase().replace(/\s/g, '-')}`;

    return (
        <div className="plugin-panel">
            <h2 className="text-2xl font-bold mb-4">{plugin.name} Panel</h2>
            <PluginSlot hookName={panelHookName}/>
        </div>
    );
};

export default PluginPanel;
