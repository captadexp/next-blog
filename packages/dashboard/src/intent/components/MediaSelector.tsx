import {h} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';
import {
    IntentRequest,
    IntentResponse,
    Media,
    MediaSelectRequest,
    PaginatedResponse
} from '@supergrowthai/next-blog-types';
import {useUser} from '../../context/UserContext';
import toast from 'react-hot-toast';
import {PaginationControls} from '../../components/PaginationControls';

interface MediaSelectorProps {
    request: IntentRequest<MediaSelectRequest>;
}

const getDefaultMimeTypes = (mediaType: string) => {
    switch (mediaType) {
        case 'image':
            return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        case 'video':
            return ['video/mp4', 'video/webm', 'video/ogg'];
        case 'audio':
            return ['audio/mp3', 'audio/wav', 'audio/ogg'];
        case 'all':
        default:
            return [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm', 'video/ogg',
                'audio/mp3', 'audio/wav', 'audio/ogg'
            ];
    }
};

const getMediaTypeFromMime = (mimeType: string): 'image' | 'video' | 'audio' | 'unknown' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'unknown';
};

const MediaPreview = ({media}: { media: Media }) => {
    const mediaType = getMediaTypeFromMime(media.mimeType);

    switch (mediaType) {
        case 'image':
            return (
                <img
                    src={media.url}
                    alt={media.filename}
                    className="rounded-lg h-32 w-full object-cover"
                />
            );
        case 'video':
            return (
                <video
                    src={media.url}
                    className="rounded-lg h-32 w-full object-cover"
                    controls={false}
                    muted
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.pause();
                        video.currentTime = 0;
                    }}
                />
            );
        case 'audio':
            return (
                <div className="rounded-lg h-32 w-full bg-gray-200 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl mb-2">🎵</div>
                        <div className="text-xs text-gray-600">Audio File</div>
                    </div>
                </div>
            );
        default:
            return (
                <div className="rounded-lg h-32 w-full bg-gray-200 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <div className="text-xs text-gray-600">Unknown Type</div>
                    </div>
                </div>
            );
    }
};

export const MediaSelector = ({request}: MediaSelectorProps) => {
    const {apis} = useUser();
    const [mediaItems, setMediaItems] = useState<Media[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginatedResponse<Media> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const options = request.payload.options || {};
    const {
        mediaType = 'all',
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowUpload = true
    } = options;

    const mimeTypes = options.mimeTypes || getDefaultMimeTypes(mediaType);

    useEffect(() => {
        // Open modal on mount
        if (dialogRef.current) {
            dialogRef.current.showModal();
        }
        loadMedia();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadMedia(true);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search]);

    useEffect(() => {
        if (page > 1) {
            loadMedia();
        }
    }, [page]);

    const loadMedia = async (resetPage = false) => {
        setLoading(true);
        try {
            const currentPage = resetPage ? 1 : page;
            const searchQuery = search ? {search} : {};
            const response = await apis.getMedia({
                mimeType: mimeTypes.join(','),
                page: currentPage,
                limit: 12,
                ...searchQuery
            });

            if (response.code === 0 && response.payload) {
                if (resetPage) {
                    setMediaItems(response.payload.data);
                    setPage(1);
                } else {
                    setMediaItems(response.payload.data);
                }
                setPagination(response.payload);
            } else {
                toast.error(response.message || 'Failed to load media');
            }
        } catch (err) {
            console.error('Error loading media:', err);
            toast.error('Failed to load media');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        // Validate file type
        if (!mimeTypes.includes(file.type)) {
            toast.error(`Invalid file type. Allowed types: ${mimeTypes.join(', ')}`);
            return;
        }

        // Validate file size
        if (file.size > maxSize) {
            toast.error(`File too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
            return;
        }

        setUploading(true);

        try {
            // First create the media record
            const createResponse = await apis.createMedia({
                filename: file.name,
                url: '', // Will be updated after upload
                mimeType: file.type,
                size: file.size
            });

            if (createResponse.code !== 0 || !createResponse.payload) {
                toast.error(createResponse.message || 'Failed to create media record');
                return;
            }

            const media = createResponse.payload;

            // Upload the file
            const uploadResponse = await apis.uploadMediaFile(media._id, file);

            if (uploadResponse.code === 0 && uploadResponse.payload) {
                // Add to media list and select it
                setMediaItems(prev => [uploadResponse.payload!, ...prev]);
                setSelectedMedia(uploadResponse.payload!);
                toast.success('File uploaded successfully');
                // Reset to first page after upload
                setPage(1);
                loadMedia(true);
            } else {
                toast.error(uploadResponse.message || 'Failed to upload file');
                // Clean up the created media record if upload failed
                await apis.deleteMedia(media._id);
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            toast.error('Failed to upload file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const sendResponse = (media: Media | null, cancelled: boolean = false) => {
        const response: IntentResponse<{ media: Media | null }> = {
            requestId: request.requestId,
            intentType: request.intentType,
            success: !cancelled,
            payload: {media},
            cancelled
        };

        // Dispatch to request-specific channel
        window.dispatchEvent(new CustomEvent(`intent:response:${request.requestId}`, {
            detail: response,
            bubbles: true
        }));

        // Close the modal
        if (dialogRef.current) {
            dialogRef.current.close();
        }

        // Remove this intent from the provider
        if ((window as any).__removeIntent) {
            (window as any).__removeIntent(request.requestId);
        }
    };

    const handleSelect = () => {
        sendResponse(selectedMedia, false);
    };

    const handleCancel = () => {
        sendResponse(null, true);
    };

    const getModalTitle = () => {
        switch (mediaType) {
            case 'image':
                return 'Select Image';
            case 'video':
                return 'Select Video';
            case 'audio':
                return 'Select Audio';
            default:
                return 'Select Media';
        }
    };

    const getSearchPlaceholder = () => {
        switch (mediaType) {
            case 'image':
                return 'Search images...';
            case 'video':
                return 'Search videos...';
            case 'audio':
                return 'Search audio...';
            default:
                return 'Search media...';
        }
    };

    const getEmptyMessage = () => {
        const typeText = mediaType === 'all' ? 'media files' : `${mediaType}s`;
        return search
            ? `No ${typeText} found matching your search.`
            : `No ${typeText} found. Upload a file to get started.`;
    };

    return (
        <dialog ref={dialogRef} className="modal">
            <div
                className="modal-box w-96 max-w-96 h-full max-h-full rounded-none rounded-l-xl absolute right-0 top-0 bottom-0 m-0 overflow-y-auto bg-gray-50"
                style={{
                    animation: 'slide-left 0.3s ease-out'
                }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{getModalTitle()}</h2>
                    <button
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={handleCancel}
                    >
                        ✕
                    </button>
                </div>

                {allowUpload && (
                    <div className="mb-6">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={mimeTypes.join(',')}
                            onChange={handleFileSelect}
                            className="file-input file-input-bordered w-full"
                            disabled={uploading}
                        />
                        {uploading && (
                            <div className="mt-2">
                                <span className="loading loading-spinner loading-sm mr-2"></span>
                                Uploading...
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder={getSearchPlaceholder()}
                        value={search}
                        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                        className="input input-bordered w-full"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {mediaItems.map(media => (
                            <div
                                key={media._id}
                                className={`card bg-base-100 cursor-pointer hover:shadow-lg transition-shadow ${
                                    selectedMedia?._id === media._id ? 'ring-2 ring-primary' : ''
                                }`}
                                onClick={() => setSelectedMedia(media)}
                            >
                                <figure className="px-4 pt-4">
                                    <MediaPreview media={media}/>
                                </figure>
                                <div className="card-body p-4">
                                    <p className="text-sm truncate">{media.filename}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {mediaItems.length === 0 && !loading && (
                    <div className="text-center py-8 text-base-content/60">
                        {getEmptyMessage()}
                    </div>
                )}

                <PaginationControls
                    pagination={pagination}
                    currentPage={page}
                    dataLength={mediaItems.length}
                    onPageChange={setPage}
                />

                <div className="flex gap-2 mt-auto">
                    <button
                        className="btn btn-primary flex-1"
                        onClick={handleSelect}
                        disabled={!selectedMedia}
                    >
                        Select
                    </button>
                    <button
                        className="btn btn-ghost flex-1"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={handleCancel}>close</button>
            </form>
            <style>{`
                @keyframes slide-left {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </dialog>
    );
};