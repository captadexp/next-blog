import {ClientSDK, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import type {PluginStatus} from '../utils/types.js';
import {updateSettings} from '../utils/actions.js';

interface CustomPromptProps {
    status: PluginStatus;
    sdk: ClientSDK;
}

export function CustomPrompt({status, sdk}: CustomPromptProps) {
    const [customPrompt, setCustomPrompt] = useState(status.customPrompt);
    const [updating, setUpdating] = useState(false);

    // Update local state when status changes

    const resetCustomPrompt = () => {
        setCustomPrompt(status.customPrompt);
    };

    const updateCustomPrompt = async () => {
        setUpdating(true);
        await updateSettings(sdk, {customPrompt});
        setUpdating(false);
    };

    useEffect(() => {
        setCustomPrompt(status.customPrompt);
    }, [status.customPrompt]);

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Custom Prompt Template</label>
            <textarea
                placeholder="Enter your custom prompt template here. Use {topic} as a placeholder for the selected topic..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target?.value)}
                rows={8}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <div className="flex items-center space-x-2 mt-2">
                <button
                    onClick={updateCustomPrompt}
                    disabled={updating || customPrompt === status.customPrompt}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Update Prompt
                </button>
                <button
                    onClick={resetCustomPrompt}
                    disabled={updating}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Reset
                </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
                Customize the prompt sent to the AI. Use <code
                className="bg-gray-100 px-1 rounded">{'{topic}'}</code> as a placeholder for the selected topic.
                Leave empty to use the default prompt.
            </p>
        </div>
    );
}