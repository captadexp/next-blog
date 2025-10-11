import {ClientSDK, useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import type {AIProvider, BlogGenerationSettings, PluginStatus} from '../utils/types.js';
import {setApiKey} from '../utils/actions.js';

interface ProviderConfigProps {
    status: PluginStatus;
    sdk: ClientSDK;
    onUpdate: (status: PluginStatus) => void;
}

export function ProviderConfig({status, sdk, onUpdate}: ProviderConfigProps) {
    const [aiProvider, setAiProvider] = useState<AIProvider>(status.aiProvider);
    const [currentApiKey, setCurrentApiKey] = useState('');
    const [dailyLimit, setDailyLimit] = useState(status.dailyLimit);
    const [updating, setUpdating] = useState(false);

    const getCurrentApiKey = (provider: AIProvider) => {
        switch (provider) {
            case 'openai':
                return status.openaiApiKey || '';
            case 'grok':
                return status.grokApiKey || '';
            case 'gemini':
                return status.geminiApiKey || '';
            default:
                return '';
        }
    };

    const getKeyPlaceholder = (provider: AIProvider) => {
        switch (provider) {
            case 'openai':
                return 'sk-...';
            case 'grok':
                return 'xai-...';
            case 'gemini':
                return 'AIza...';
            default:
                return '';
        }
    };

    const getProviderDisplayName = (provider: AIProvider) => {
        switch (provider) {
            case 'openai':
                return 'OpenAI';
            case 'grok':
                return 'Grok (xAI)';
            case 'gemini':
                return 'Google Gemini';
            default:
                return provider;
        }
    };

    const updateSettings = async (updates: Partial<BlogGenerationSettings>) => {
        setUpdating(true);
        await sdk.callRPC('ai-generator:updateSettings', updates);
        const statusResponse = await sdk.callRPC('ai-generator:getStatus', {});
        onUpdate(statusResponse.payload as PluginStatus);
        setUpdating(false);
    };

    const updateDailyLimit = () => updateSettings({dailyLimit});

    // Update API key when provider changes
    useEffect(() => {
        setCurrentApiKey(getCurrentApiKey(aiProvider));
    }, [aiProvider, status]);

    // Update local state when status changes
    useEffect(() => {
        setAiProvider(status.aiProvider);
        setDailyLimit(status.dailyLimit);
    }, [status]);

    return (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>

            {/* AI Provider Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">AI Provider</label>
                <div className="flex items-center space-x-2">
                    <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                        className="border border-gray-300 rounded px-3 py-2 flex-1"
                    >
                        <option value="openai">OpenAI (GPT-4)</option>
                        <option value="grok">Grok (xAI)</option>
                        <option value="gemini">Google Gemini</option>
                    </select>
                    <button
                        onClick={() => updateSettings({aiProvider})}
                        disabled={updating || aiProvider === status.aiProvider}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Update
                    </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                    Choose which AI provider to use for content generation
                </p>
            </div>

            {/* API Key Configuration */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    {getProviderDisplayName(aiProvider)} API Key
                </label>
                <div className="flex items-center space-x-2">
                    <input
                        type="password"
                        placeholder={getKeyPlaceholder(aiProvider)}
                        value={currentApiKey}
                        onChange={(e) => setCurrentApiKey(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2"
                    />
                    <button
                        onClick={async () => {
                            setUpdating(true);
                            try {
                                const updatedStatus = await setApiKey(sdk, aiProvider, currentApiKey);
                                onUpdate(updatedStatus);
                            } catch (error) {
                                console.error('Failed to set API key:', error);
                            } finally {
                                setUpdating(false);
                            }
                        }}
                        disabled={updating}
                        className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                        Save
                    </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                    API key for the selected provider. Keys are stored securely in the backend.
                </p>
            </div>

            {/* Daily Limit */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Daily Blog Limit</label>
                <div className="flex items-center space-x-2">
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1)}
                        className="border border-gray-300 rounded px-3 py-2 w-20"
                    />
                    <button
                        onClick={updateDailyLimit}
                        disabled={updating || dailyLimit === status.dailyLimit}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Update
                    </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                    Maximum number of blog posts to generate per day (1-10)
                </p>
            </div>
        </div>
    );
}