import {PluginState} from '../types';

interface StatusIndicatorProps {
    state: PluginState;
}

export function StatusIndicator({state}: StatusIndicatorProps) {
    if (state.isLoading && !state.isScanning) {
        return <p>Loading report...</p>;
    }

    if (state.isScanning) {
        return <p>Scanning in progress...</p>;
    }

    if (state.error) {
        return (
            <div className="text-red-500 p-3 bg-red-50 rounded">
                {state.error}
            </div>
        );
    }

    if (!state.report || state.report.length === 0) {
        return (
            <div className="text-center p-4 border-t">
                <p className="text-green-600 font-semibold">No broken links found! 🎉</p>
                <p className="text-sm text-gray-500 mt-1">
                    Click the button above to run a new scan.
                </p>
            </div>
        );
    }

    return null;
}