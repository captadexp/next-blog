import {FunctionComponent, h} from 'preact';
import {PluginSlot} from './plugins/PluginSlot';

interface ExtensionZoneProps {
    name: string;
    children: any;
    // Additional context to pass to plugins
    page?: string;
    entity?: string;
    data?: any;
    actions?: Record<string, Function>;
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
                                                                         page,
                                                                         entity,
                                                                         data,
                                                                         actions,
                                                                         className,
                                                                         ...additionalContext
                                                                     }) => {
    // Build context object for plugins
    const context = {
        zone: name,
        page,
        entity,
        data,
        actions,
        ...additionalContext
    };

    return (
        <>
            {/* Extension point before content */}
            <PluginSlot
                hookName={`${name}:before`}
                context={context}
            />

            {/* Main content */}
            <div data-zone={name} className={className}>
                {children}
            </div>

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
    context?: Record<string, any>
}> = ({name, context = {}}) => {
    return <PluginSlot hookName={name} context={context}/>;
};