interface JsonPreviewProps {
    preview: any;
    show: boolean;
    onHide: () => void;
}

export function JsonPreview({preview, show, onHide}: JsonPreviewProps) {
    if (!show || !preview) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-gray-700">JSON-LD Preview</h4>
                <button
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={onHide}
                >
                    Hide
                </button>
            </div>
            <pre className="p-2 bg-gray-50 border border-gray-200 rounded text-xs overflow-auto max-h-48 font-mono">
                {JSON.stringify(preview, null, 2)}
            </pre>
            <div className="flex gap-2">
                <button
                    className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
                    }}
                >
                    Copy to Clipboard
                </button>
                <button
                    className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    onClick={() => {
                        const url = `https://search.google.com/test/rich-results?code=${encodeURIComponent(JSON.stringify(preview))}`;
                        window.open(url, '_blank');
                    }}
                >
                    Test in Google
                </button>
            </div>
        </div>
    );
}