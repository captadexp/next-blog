export function formatLastGenerated(timestamp: number): string {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
        const diffMinutes = Math.floor(diffHours * 60);
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        const hours = Math.floor(diffHours);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
}

export function getStatusBadge(status: string): { text: string; className: string } {
    switch (status) {
        case 'draft':
            return {text: 'Draft', className: 'bg-yellow-100 text-yellow-800'};
        case 'published':
            return {text: 'Published', className: 'bg-green-100 text-green-800'};
        case 'private':
            return {text: 'Private', className: 'bg-gray-100 text-gray-800'};
        default:
            return {text: status, className: 'bg-gray-100 text-gray-800'};
    }
}