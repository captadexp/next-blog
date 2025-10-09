import {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';

interface JsonPreviewProps {
    jsonPreview: string;
    sdk: ClientSDK;
}

export function JsonPreview({ jsonPreview, sdk }: JsonPreviewProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(jsonPreview);
        sdk.notify('JSON-LD copied to clipboard', 'success');
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">JSON-LD Preview</h4>
                <button
                    onClick={handleCopy}
                    className="px-2 py-1 text-xs bg-gray-100 rounded border-none cursor-pointer hover:bg-gray-200"
                >
                    Copy
                </button>
            </div>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-64 m-0 border border-gray-200">
                {jsonPreview || 'Generating preview...'}
            </pre>
        </div>
    );
}