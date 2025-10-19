import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useIntent} from '../../../intent';
import {MediaDynamicFormField} from './types';
import {INTENT_TYPES} from "@supergrowthai/next-blog-types";

interface MediaFieldProps {
    field: MediaDynamicFormField;
    onChange: <T>(key: string, value: T) => void;
}

interface MediaItem {
    _id: string;
    filename: string;
    url: string;
    mimeType: string;
    size?: number;
}

const MediaField = ({field, onChange}: MediaFieldProps) => {
    const {startIntent} = useIntent();
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [loading, setLoading] = useState(false);

    // Initialize with existing value if provided
    useEffect(() => {
        if (field.value && field.mediaData && !selectedMedia) {
            // Use the provided media data
            setSelectedMedia(field.mediaData);
        } else if (field.value && !field.mediaData && !selectedMedia) {
            // If we have a media ID but no media object, show a placeholder
            setSelectedMedia({
                _id: field.value,
                filename: 'Loading...',
                url: '',
                mimeType: '',
                size: 0
            });
        }
    }, [field.value, field.mediaData, selectedMedia]);

    const handleSelectMedia = async () => {
        if (!field.intentOptions) {
            console.error('No intent options provided for media field');
            return;
        }

        setLoading(true);
        try {
            const result: { media: MediaItem } = await startIntent(INTENT_TYPES.SELECT_IMAGE, field.intentOptions);

            if (result) {
                setSelectedMedia(result.media);
                onChange(field.key, result.media._id);
            }
        } catch (error) {
            console.error('Error selecting media:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMedia = () => {
        setSelectedMedia(null);
        onChange(field.key, null);
    };

    const renderMediaPreview = () => {
        if (!selectedMedia) return null;

        const isImage = selectedMedia.mimeType?.startsWith('image/');

        return (
            <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {isImage && selectedMedia.url ? (
                            <img
                                src={selectedMedia.url}
                                alt={selectedMedia.filename}
                                className="w-12 h-12 object-cover rounded border"
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                                <span className="text-xs text-gray-500">
                                    {selectedMedia.mimeType?.split('/')[0] || 'File'}
                                </span>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                {selectedMedia.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                                {selectedMedia.mimeType} • {formatFileSize(selectedMedia.size || 0)}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="text-red-600 hover:text-red-800 text-sm"
                    >
                        Remove
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="mb-4">
            {field.label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {selectedMedia ? (
                renderMediaPreview()
            ) : (
                <button
                    type="button"
                    onClick={handleSelectMedia}
                    disabled={loading || field.disabled}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                            Opening media selector...
                        </div>
                    ) : (
                        <>
                            <svg
                                className="w-8 h-8 mb-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                            </svg>
                            <span>Select Media</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default MediaField;