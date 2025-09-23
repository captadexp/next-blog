interface ScanButtonProps {
    isScanning: boolean;
    onClick: () => void;
}

export function ScanButton({isScanning, onClick}: ScanButtonProps) {
    return (
        <button
            className={`btn p-2 rounded text-white ${
                isScanning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={onClick}
            disabled={isScanning}
        >
            {isScanning ? 'Scanning...' : 'Re-Scan All Posts'}
        </button>
    );
}