
interface LoadingSpinnerProps {
    message?: string;
}

export function LoadingSpinner({ message = 'Loading JSON-LD settings...' }: LoadingSpinnerProps) {
    return (
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-gray-600">{message}</span>
            </div>
        </div>
    );
}