import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {RenderUtils} from '@supergrowthai/plugin-dev-kit/client';
import type {AIProvider, BlogGenerationSettings, PluginStatus} from '../utils/types.js';

interface ProviderConfigProps {
    status: PluginStatus;
    sdk: ClientSDK;
    onUpdate: (status: PluginStatus) => void;
}

const ru = new RenderUtils();

export function ProviderConfig({status, sdk, onUpdate}: ProviderConfigProps) {
    ru.setReRenderer(sdk.refresh, true);
    const [aiProvider, setAiProvider] = ru.useState<AIProvider>(status.aiProvider);
    const [currentApiKey, setCurrentApiKey] = ru.useState('');
    const [dailyLimit, setDailyLimit] = ru.useState(status.dailyLimit);
    const [updating, setUpdating] = ru.useState(false);

    const getKeyName = (provider: AIProvider) => {
        switch (provider) {
            case 'openai':
                return 'ai:openai:access_key';
            case 'grok':
                return 'ai:grok:access_key';
            case 'gemini':
                return 'ai:gemini:access_key';
            default:
                return 'ai:openai:access_key';
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

    // Load current provider's API key when provider changes
    ru.useEffect(() => {
        const loadCurrentKey = async () => {
            const keyName = getKeyName(aiProvider);
            const keyValue = await sdk.settings.get(keyName);
            setCurrentApiKey(keyValue as string || '');
        };
        loadCurrentKey();
    }, [aiProvider]);

    // Update local state when status changes
    ru.useEffect(() => {
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
                            await sdk.settings.set(getKeyName(aiProvider), currentApiKey);
                            setUpdating(false);
                        }}
                        disabled={updating}
                        className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                        Save
                    </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                    API key for the selected provider. Keys are stored securely and locally.
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