import {h, RefObject} from 'preact';
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

type TabType = 'images' | 'videos' | 'audio' | 'upload' | 'imago' | 'generative';

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

interface UploadTabProps {
    allowUpload: boolean;
    fileInputRef: RefObject<HTMLInputElement>;
    mimeTypes: string[];
    handleFileSelect: (event: Event) => void;
    uploading: boolean;
}

const UploadTab = ({allowUpload, fileInputRef, mimeTypes, handleFileSelect, uploading}: UploadTabProps) => {
    if (!allowUpload) return null;

    return (
        <div className="space-y-6">
            <div>
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
        </div>
    );
};

interface ComingSoonTabProps {
    activeTab: TabType;
}

const ComingSoonTab = ({activeTab}: ComingSoonTabProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <h3 className="text-lg font-semibold text-base-content">Coming Soon</h3>
            <p className="text-base-content/60 text-center">
                {activeTab === 'imago'
                    ? 'Image search powered by Imago'
                    : 'Generate images using artificial intelligence'
                }
            </p>
        </div>
    );
};

interface MediaGridTabProps {
    activeTab: TabType;
    search: string;
    setSearch: (search: string) => void;
    loading: boolean;
    mediaItems: Media[];
    selectedMedia: Media | null;
    setSelectedMedia: (media: Media | null) => void;
    pagination: PaginatedResponse<Media> | null;
    page: number;
    setPage: (page: number) => void;
    openEditDialog: (media: Media) => void;
    openDeleteConfirmation: (media: Media) => void;
    getEmptyMessage: () => string;
}

const MediaGridTab = ({
                          activeTab,
                          search,
                          setSearch,
                          loading,
                          mediaItems,
                          selectedMedia,
                          setSelectedMedia,
                          pagination,
                          page,
                          setPage,
                          openEditDialog,
                          openDeleteConfirmation,
                          getEmptyMessage
                      }: MediaGridTabProps) => {
    const getTabLabel = (tab: TabType) => {
        switch (tab) {
            case 'images':
                return 'Images';
            case 'videos':
                return 'Videos';
            case 'audio':
                return 'Audio';
            default:
                return 'Media';
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <input
                    type="text"
                    placeholder={`Search ${getTabLabel(activeTab).toLowerCase()}...`}
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
                <div className="grid grid-cols-2 gap-4">
                    {mediaItems.map(media => (
                        <div
                            key={media._id}
                            className={`card bg-base-100 cursor-pointer hover:shadow-lg transition-shadow relative group ${
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

                            {/* Action buttons - show on hover */}
                            <div
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col gap-2">
                                <button
                                    className="btn btn-xs bg-blue-500 hover:bg-blue-600 text-white border-none shadow-lg text-xs font-medium px-3 rounded-md"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(media);
                                    }}
                                    title="Edit filename"
                                >
                                    Edit
                                </button>
                                <button
                                    className="btn btn-xs bg-red-500 hover:bg-red-600 text-white border-none shadow-lg text-xs font-medium px-3 rounded-md"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteConfirmation(media);
                                    }}
                                    title="Delete media"
                                >
                                    Delete
                                </button>
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
        </div>
    );
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
    const [activeTab, setActiveTab] = useState<TabType>('images');
    const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);
    const [mediaToEdit, setMediaToEdit] = useState<Media | null>(null);
    const [editFilename, setEditFilename] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [editing, setEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);

    const options = request.payload.options || {};
    const {
        mediaType = 'all',
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowUpload = true,
        selectedMediaId
    } = options;

    const getTabMimeTypes = (tab: TabType): string[] => {
        switch (tab) {
            case 'images':
                return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            case 'videos':
                return ['video/mp4', 'video/webm', 'video/ogg'];
            case 'audio':
                return ['audio/mp3', 'audio/wav', 'audio/ogg'];
            case 'upload':
                return options.mimeTypes || getDefaultMimeTypes(mediaType);
            default:
                return [];
        }
    };

    const mimeTypes = getTabMimeTypes(activeTab);

    useEffect(() => {
        // Open modal on mount
        if (dialogRef.current) {
            dialogRef.current.showModal();
        }
        loadMedia();

        // Load initially selected media if provided
        if (selectedMediaId) {
            loadSelectedMedia(selectedMediaId);
        }
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

    useEffect(() => {
        // Don't clear selected media if it was initially provided
        if (!selectedMediaId) {
            setSelectedMedia(null);
        }
        setSearch('');
        setPage(1);
        if (activeTab === 'images' || activeTab === 'videos' || activeTab === 'audio') {
            loadMedia(true);
        }
    }, [activeTab]);

    const loadSelectedMedia = async (mediaId: string) => {
        try {
            const response = await apis.getMediaById(mediaId);
            if (response.code === 0 && response.payload) {
                setSelectedMedia(response.payload);

                // Set the appropriate tab based on media type
                const mediaType = getMediaTypeFromMime(response.payload.mimeType);
                if (mediaType === 'image') {
                    setActiveTab('images');
                } else if (mediaType === 'video') {
                    setActiveTab('videos');
                } else if (mediaType === 'audio') {
                    setActiveTab('audio');
                }
            } else {
                console.warn('Failed to load selected media:', response.message);
            }
        } catch (err) {
            console.error('Error loading selected media:', err);
        }
    };

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

    const handleDeleteMedia = async () => {
        if (!mediaToDelete) return;

        setDeleting(true);
        try {
            const response = await apis.deleteMedia(mediaToDelete._id);
            if (response.code === 0) {
                setMediaItems(prev => prev.filter(item => item._id !== mediaToDelete._id));
                if (selectedMedia?._id === mediaToDelete._id) {
                    setSelectedMedia(null);
                }
                toast.success('Media deleted successfully');
            } else {
                toast.error(response.message || 'Failed to delete media');
            }
        } catch (err) {
            console.error('Error deleting media:', err);
            toast.error('Failed to delete media');
        } finally {
            setDeleting(false);
            setMediaToDelete(null);
        }
    };

    const handleEditMedia = async () => {
        if (!mediaToEdit) return;

        setEditing(true);
        try {
            const response = await apis.updateMedia(mediaToEdit._id, {
                filename: editFilename
            });
            if (response.code === 0 && response.payload) {
                setMediaItems(prev => prev.map(item =>
                    item._id === mediaToEdit._id ? response.payload! : item
                ));
                if (selectedMedia?._id === mediaToEdit._id) {
                    setSelectedMedia(response.payload);
                }
                toast.success('Media updated successfully');
            } else {
                toast.error(response.message || 'Failed to update media');
            }
        } catch (err) {
            console.error('Error updating media:', err);
            toast.error('Failed to update media');
        } finally {
            setEditing(false);
            setMediaToEdit(null);
            setEditFilename('');
        }
    };

    const openDeleteConfirmation = (media: Media) => {
        setMediaToDelete(media);
    };

    const openEditDialog = (media: Media) => {
        setMediaToEdit(media);
        setEditFilename(media.filename);
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
        const typeText = activeTab === 'images' ? 'images' :
            activeTab === 'videos' ? 'videos' :
                activeTab === 'audio' ? 'audio files' : 'media files';
        return search
            ? `No ${typeText} found matching your search.`
            : `No ${typeText} found. Upload a file to get started.`;
    };


    const getTabLabel = (tab: TabType) => {
        switch (tab) {
            case 'images':
                return 'Images';
            case 'videos':
                return 'Videos';
            case 'audio':
                return 'Audio';
            case 'upload':
                return 'Upload';
            case 'imago':
                return 'Imago';
            case 'generative':
                return 'Generative AI';
            default:
                return '';
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'upload':
                return (
                    <UploadTab
                        allowUpload={allowUpload}
                        fileInputRef={fileInputRef}
                        mimeTypes={mimeTypes}
                        handleFileSelect={handleFileSelect}
                        uploading={uploading}
                    />
                );

            case 'imago':
            case 'generative':
                return <ComingSoonTab activeTab={activeTab}/>;

            case 'images':
            case 'videos':
            case 'audio':
            default:
                return (
                    <MediaGridTab
                        activeTab={activeTab}
                        search={search}
                        setSearch={setSearch}
                        loading={loading}
                        mediaItems={mediaItems}
                        selectedMedia={selectedMedia}
                        setSelectedMedia={setSelectedMedia}
                        pagination={pagination}
                        page={page}
                        setPage={setPage}
                        openEditDialog={openEditDialog}
                        openDeleteConfirmation={openDeleteConfirmation}
                        getEmptyMessage={getEmptyMessage}
                    />
                );
        }
    };

    return (
        <dialog ref={dialogRef} className="modal">
            <div
                className="modal-box w-full max-w-2xl lg:max-w-4xl h-full max-h-full rounded-none rounded-l-xl absolute right-0 top-0 bottom-0 m-0 flex flex-col bg-gray-50"
                style={{
                    animation: 'slide-left 0.3s ease-out'
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
                    <h2 className="text-xl font-bold">Select Media</h2>
                    <button
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={handleCancel}
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="tabs tabs-bordered border-b border-gray-200 px-6 bg-white">
                    {(['images', 'videos', 'audio', 'upload', 'imago', 'generative'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            className={`tab tab-bordered ${
                                activeTab === tab ? 'tab-active' : ''
                            }`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {getTabLabel(tab)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderTabContent()}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                        <button
                            className="btn btn-primary flex-1"
                            onClick={handleSelect}
                            disabled={!selectedMedia || activeTab === 'imago' || activeTab === 'generative'}
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
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={handleCancel}>close</button>
            </form>

            {/* Delete Confirmation Dialog */}
            {mediaToDelete && (
                <div className="modal modal-open">
                    <div className="modal-box bg-red-50 border border-red-200 rounded-2xl shadow-2xl">
                        <h3 className="font-bold text-lg text-red-800">Delete Media</h3>
                        <p className="py-4 text-red-700">
                            Are you sure you want to delete <strong
                            className="text-red-900">{mediaToDelete.filename}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="modal-action">
                            <button
                                className="btn btn-error hover:bg-red-600 rounded-xl"
                                onClick={handleDeleteMedia}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                            <button
                                className="btn btn-ghost hover:bg-gray-100 rounded-xl"
                                onClick={() => setMediaToDelete(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Dialog */}
            {mediaToEdit && (
                <div className="modal modal-open">
                    <div className="modal-box bg-blue-50 border border-blue-200 rounded-2xl shadow-2xl">
                        <h3 className="font-bold text-lg text-blue-800">Edit Media</h3>
                        <div className="py-4">
                            <label className="label">
                                <span className="label-text text-blue-700 font-medium">Filename</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full rounded-xl border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={editFilename}
                                onChange={(e) => setEditFilename((e.target as HTMLInputElement).value)}
                                placeholder="Enter filename"
                            />
                        </div>
                        <div className="modal-action">
                            <button
                                className="btn btn-primary hover:bg-blue-600 rounded-xl"
                                onClick={handleEditMedia}
                                disabled={editing || !editFilename.trim()}
                            >
                                {editing ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </button>
                            <button
                                className="btn btn-ghost hover:bg-gray-100 rounded-xl"
                                onClick={() => {
                                    setMediaToEdit(null);
                                    setEditFilename('');
                                }}
                                disabled={editing}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

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