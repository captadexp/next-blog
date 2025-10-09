import {FunctionComponent, h} from 'preact';
import {PluginSlot} from './plugins/PluginSlot';

interface ExtensionZoneProps {
    name: string;
    children: any;
    context?: Record<string, any>;
    className?: string;
}

/**
 * ExtensionZone - Smart wrapper that creates extension points before and after content
 *
 * Usage:
 * <ExtensionZone name="blogs-list" page="blogs" data={blogs}>
 *   <BlogsTable />
 * </ExtensionZone>
 *
 * This automatically creates two hook points:
 * - blogs-list:before
 * - blogs-list:after
 *
 * And passes rich context to plugins including page, entity, data, and actions
 */
export const ExtensionZone: FunctionComponent<ExtensionZoneProps> = ({
                                                                         name,
                                                                         children,
                                                                         context,
                                                                         className
                                                                     }) => {

    return (
        <>
            {/* Extension point before content */}
            <PluginSlot
                hookName={`${name}:before`}
                context={context}
            />
            <div className={"h-2"}/>
            {/* Main content */}
            <div data-zone={name} className={className}>
                {children}
            </div>
            <div className={"h-2"}/>
            {/* Extension point after content */}
            <PluginSlot
                hookName={`${name}:after`}
                context={context}
            />
        </>
    );
};

// Convenience component for inline extension points
export const ExtensionPoint: FunctionComponent<{
    name: string;
    context?: Record<string, any>;
    pluginFilter?: string;
}> = ({name, context = {}, pluginFilter}) => {
    return <PluginSlot hookName={name} context={context} pluginFilter={pluginFilter}/>;
};