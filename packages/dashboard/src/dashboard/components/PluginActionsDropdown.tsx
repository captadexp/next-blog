import {h} from 'preact';
import {Plugin} from '@supergrowthai/next-blog-types';
import Loader from '../../components/Loader';

interface PluginActionsDropdownProps {
    plugin: Plugin;
    onUpdate: () => void;
    onReinstall: () => void;
    onDelete: () => void;
    onSettings?: () => void;
    isProcessing?: boolean;
    permissions: {
        canUpdate: boolean;
        canReinstall: boolean;
        canDelete: boolean;
    };
}

export const PluginActionsDropdown = ({
                                          plugin,
                                          onUpdate,
                                          onReinstall,
                                          onDelete,
                                          onSettings,
                                          isProcessing,
                                          permissions
                                      }: PluginActionsDropdownProps) => {
    return (
        <div className="flex gap-2">
            {onSettings && (
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        onSettings();
                    }}
                    className="text-blue-500 hover:text-blue-700 no-underline mr-3"
                >
                    Settings
                </a>
            )}

            {!plugin.isSystem && (
                <div className="dropdown dropdown-end">
                    <button
                        tabIndex={0}
                        className="text-gray-600 hover:text-gray-800 bg-transparent border-none cursor-pointer p-0 font-inherit disabled:opacity-50"
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader size="sm" text=""/> : (
                            <>Actions <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor"
                                           viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                            </svg></>
                        )}
                    </button>
                    <ul tabIndex={0}
                        className="dropdown-content z-[1] menu p-2 shadow-lg bg-white border border-gray-200 rounded-md w-52">
                        {permissions.canUpdate && (
                            <li><a onClick={onUpdate} className="hover:bg-gray-100">Update</a></li>
                        )}
                        {permissions.canReinstall && (
                            <li><a onClick={onReinstall} className="hover:bg-gray-100">Reinstall</a></li>
                        )}
                        {permissions.canDelete && (
                            <li><a onClick={onDelete} className="text-red-500 hover:bg-red-50">Delete</a></li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};