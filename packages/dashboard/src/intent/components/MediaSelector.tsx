import {h, RefObject} from 'preact';
import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import {
    IntentRequest,
    IntentResponse,
    Media,
    MediaSelectRequest,
    PaginatedResponse
} from '@supergrowthai/next-blog-types';
import {useUser} from '../../context/UserContext';
import toast from 'react-hot-toast';
import {memo} from 'preact/compat';
import {PaginationControls} from "../../components/PaginationControls.tsx";

// --- Constants & Configuration ---
const DEBOUNCE_DELAY = 300; // ms
const PAGE_LIMIT = 12;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_PIXELS = 3840 * 2160; // 4K UHD resolution

type TabType = 'images' | 'videos' | 'audio' | 'upload' | 'imago' | 'generative';

interface MediaSelectorProps {
    request: IntentRequest<MediaSelectRequest>;
}

// Configuration for tabs makes it easier to add/remove/reorder them
const TABS: { id: TabType; label: string; isMediaGrid: boolean }[] = [
    {id: 'images', label: 'Images', isMediaGrid: true},
    {id: 'videos', label: 'Videos', isMediaGrid: true},
    {id: 'audio', label: 'Audio', isMediaGrid: true},
    {id: 'upload', label: 'Upload', isMediaGrid: false},
    {id: 'imago', label: 'Imago', isMediaGrid: false},
    {id: 'generative', label: 'Generative AI', isMediaGrid: false},
];

type DialogState =
    | { type: 'none' }
    | { type: 'delete'; media: Media }
    | { type: 'edit'; media: Media; filename: string };


// --- Utility Functions ---

const getMediaTypeFromMime = (mimeType: string): 'image' | 'video' | 'audio' | 'unknown' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'unknown';
};

const getMimeTypesForTab = (tab: TabType): string[] => {
    switch (tab) {
        case 'images':
            return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        case 'videos':
            return ['video/mp4', 'video/webm', 'video/ogg'];
        case 'audio':
            return ['audio/mp3', 'audio/wav', 'audio/ogg'];
        default:
            return [];
    }
};

/**
 * Validates an image file for resolution constraints.
 * @param file The image file to validate.
 * @returns A promise that resolves if the image is valid, or rejects with an error message.
 */
const validateImageDimensions = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        // We only validate image files
        if (!file.type.startsWith('image/')) {
            resolve();
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (e) => {
            const image = new Image();
            image.src = e.target?.result as string;

            image.onload = () => {
                const pixelCount = image.naturalWidth * image.naturalHeight;
                if (pixelCount > MAX_IMAGE_PIXELS) {
                    // It's good practice to revoke the object URL to free up memory
                    URL.revokeObjectURL(image.src);
                    reject(new Error(`Image resolution is too high. Maximum allowed is 4K (${3840}x${2160}).`));
                } else {
                    URL.revokeObjectURL(image.src);
                    resolve();
                }
            };

            image.onerror = () => {
                reject(new Error('The selected file could not be read as an image.'));
            };
        };

        reader.onerror = () => {
            reject(new Error('Failed to read the file.'));
        };
    });
};

// --- Custom Hooks for Logic Separation ---

/**
 * Encapsulates all logic for fetching, searching, and paginating media.
 */
const useMediaLibrary = (activeTab: TabType) => {
    const {apis} = useUser();
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginatedResponse<Media> | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const mimeTypes = useMemo(() => getMimeTypesForTab(activeTab), [activeTab]);

    const loadMedia = useCallback(async (isNewQuery: boolean) => {
        if (mimeTypes.length === 0) {
            setPagination(null);
            return;
        }

        setLoading(true);
        const currentPage = isNewQuery ? 1 : page;
        try {
            const response = await apis.getMedia({
                mimeType: mimeTypes.join(','),
                page: currentPage,
                limit: PAGE_LIMIT,
                ...(search && {search}),
            });

            if (response.code === 0 && response.payload) {
                setPagination(response.payload);
                if (isNewQuery) setPage(1);
            } else {
                toast.error(response.message || 'Failed to load media');
            }
        } catch (err) {
            console.error('Error loading media:', err);
            toast.error('Failed to load media');
        } finally {
            setLoading(false);
        }
    }, [apis, mimeTypes, page, search]);

    // Effect for debounced search
    useEffect(() => {
        const handler = setTimeout(() => {
            loadMedia(true);
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(handler);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect for pagination
    useEffect(() => {
        if (page > 1) {
            loadMedia(false);
        }
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect to reset and load on tab change
    useEffect(() => {
        setSearch('');
        setPage(1);
        loadMedia(true);
    }, [activeTab]);

    return {
        loading,
        pagination,
        search,
        setSearch,
        page,
        setPage,
        reloadMedia: () => loadMedia(false), // Expose a reload function
    };
};

/**
 * Encapsulates all media action logic (upload, update, delete).
 */
const useMediaActions = (onActionSuccess: () => void) => {
    const {apis} = useUser();
    const [actionState, setActionState] = useState({
        uploading: false,
        editing: false,
        deleting: false,
    });

    const uploadFile = useCallback(async (file: File, onUploadComplete: (media: Media) => void) => {
        setActionState(s => ({...s, uploading: true}));
        try {
            // NOTE: A more robust pattern is to upload to temporary storage first,
            // then make a single API call to create the media record with the final URL.
            // This makes the database operation atomic.
            const createResponse = await apis.createMedia({
                filename: file.name,
                url: '',
                mimeType: file.type,
                size: file.size,
            });

            if (createResponse.code !== 0 || !createResponse.payload) {
                throw new Error(createResponse.message || 'Failed to create media record');
            } else {
                toast.success("Uploading...");
            }

            const mediaRecord = createResponse.payload;
            const uploadResponse = await apis.uploadMediaFile(mediaRecord._id, file);

            if (uploadResponse.code === 0 && uploadResponse.payload) {
                toast.success('File uploaded successfully');
                onActionSuccess();
                onUploadComplete(uploadResponse.payload);
            } else {
                await apis.deleteMedia(mediaRecord._id); // Cleanup
                throw new Error(uploadResponse.message || 'Failed to upload file');
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
            setActionState(s => ({...s, uploading: false}));
        }
    }, [apis, onActionSuccess]);

    const updateMedia = useCallback(async (mediaId: string, filename: string) => {
        setActionState(s => ({...s, editing: true}));
        try {
            const response = await apis.updateMedia(mediaId, {filename});
            if (response.code === 0 && response.payload) {
                toast.success('Media updated successfully');
                onActionSuccess();
            } else {
                throw new Error(response.message || 'Failed to update media');
            }
        } catch (err) {
            console.error('Error updating media:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to update media');
        } finally {
            setActionState(s => ({...s, editing: false}));
        }
    }, [apis, onActionSuccess]);

    const deleteMedia = useCallback(async (mediaId: string) => {
        setActionState(s => ({...s, deleting: true}));
        try {
            const response = await apis.deleteMedia(mediaId);
            if (response.code === 0) {
                toast.success('Media deleted successfully');
                onActionSuccess();
            } else {
                throw new Error(response.message || 'Failed to delete media');
            }
        } catch (err) {
            console.error('Error deleting media:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to delete media');
        } finally {
            setActionState(s => ({...s, deleting: false}));
        }
    }, [apis, onActionSuccess]);

    return {...actionState, uploadFile, updateMedia, deleteMedia};
};


// --- UI Components ---

/**
 * Renders a preview for a given media item.
 * P0 FIX: Added loading="lazy" to images to prevent loading all grid images at once.
 * Added a placeholder poster for videos for better perceived performance.
 */
const MediaPreview = memo(({media}: { media: Media }) => {
    const mediaType = getMediaTypeFromMime(media.mimeType);

    switch (mediaType) {
        case 'image':
            return (
                <img
                    src={media.url}
                    alt={media.filename} //todo based on the image:optimization config use the resize url using `Dynamic Image Transformation for Amazon CloudFront`
                    className="rounded-lg h-32 w-full object-cover"
                    loading="lazy" // P0 Performance Fix
                />
            );
        case 'video':
            // For optimal performance, the API should provide a thumbnail URL for the `poster` attribute.
            return (
                <video
                    src={media.url}
                    className="rounded-lg h-32 w-full object-cover"
                    controls={false}
                    muted
                    playsInline
                    poster={media.thumbnailUrl || ''} // P0 Performance Fix (assumes API provides thumbnail)
                    onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={e => {
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
});

interface UploadTabProps {
    allowUpload: boolean;
    fileInputRef?: RefObject<HTMLInputElement>;
    mimeTypes: string[];
    handleFileSelect: (event: Event) => void;
    uploading: boolean;
}

const UploadTab = memo(({allowUpload, fileInputRef, mimeTypes, handleFileSelect, uploading}: UploadTabProps) => {
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
});

interface ComingSoonTabProps {
    activeTab: TabType;
}

const ComingSoonTab = memo(({activeTab}: ComingSoonTabProps) => {
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
});

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

const MediaGridTab = memo(({
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
});


// --- Main Component ---

export const MediaSelector = ({request}: MediaSelectorProps) => {
    const {apis} = useUser();
    const dialogRef = useRef<HTMLDialogElement>(null);

    // --- State Management ---
    const [activeTab, setActiveTab] = useState<TabType>('images');
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [dialogState, setDialogState] = useState<DialogState>({type: 'none'});

    // --- Custom Hooks ---
    const {
        loading, pagination, search, setSearch, page, setPage, reloadMedia
    } = useMediaLibrary(activeTab);

    const {
        uploading, editing, deleting, uploadFile, updateMedia, deleteMedia
    } = useMediaActions(reloadMedia);

    // --- Derived State ---
    const mediaItems = pagination?.data || [];
    const options = request.payload.options || {};
    const {allowUpload = true, maxSize = 10 * 1024 * 1024, selectedMediaId, mimeTypes} = options;

    // --- Effects ---

    // P0 FIX: Cleanup effect to prevent memory leaks if component unmounts unexpectedly.
    useEffect(() => {
        dialogRef.current?.showModal();

        const loadInitialMedia = async (mediaId: string) => {
            try {
                const response = await apis.getMediaById(mediaId);
                if (response.code === 0 && response.payload) {
                    const media = response.payload;
                    setSelectedMedia(media);
                    const type = getMediaTypeFromMime(media.mimeType);
                    if (type === 'image') setActiveTab('images');
                    else if (type === 'video') setActiveTab('videos');
                    else if (type === 'audio') setActiveTab('audio');
                }
            } catch (err) {
                console.error("Failed to load initial media", err);
            }
        };

        if (selectedMediaId) {
            loadInitialMedia(selectedMediaId);
        }

        return () => {
            if ((window as any).__removeIntent) {
                (window as any).__removeIntent(request.requestId);
            }
        };
    }, [request.requestId, selectedMediaId, apis]);


    // --- Handlers ---
    const sendResponse = useCallback((media: Media | null, cancelled = false) => {
        const response: IntentResponse<{ media: Media | null }> = {
            requestId: request.requestId,
            intentType: request.intentType,
            success: !cancelled,
            payload: {media},
            cancelled,
        };
        window.dispatchEvent(new CustomEvent(`intent:response:${request.requestId}`, {detail: response}));
        dialogRef.current?.close();
    }, [request.requestId, request.intentType]);

    const handleSelect = useCallback(() => sendResponse(selectedMedia), [selectedMedia, sendResponse]);
    const handleCancel = useCallback(() => sendResponse(null, true), [sendResponse]);

    const handleFileSelect = useCallback(async (event: Event) => {
        const input = (event.target as HTMLInputElement);
        const file = input.files?.[0];
        if (!file) return;

        // Validate file type
        if (!mimeTypes?.includes(file.type)) {
            toast.error(`Invalid file type. Allowed types: ${mimeTypes?.join(', ')}`, {duration: 9999999});
            input.value = '';
            return;
        }

        // 1. Check file size
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            toast.error(`File is too large. Maximum size is ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`);
            input.value = ''; // Reset the input so the user can select the same file again if they wish
            return;
        }

        // 2. Check image resolution (only for image files)
        if (file.type.startsWith('image/')) {
            try {
                await validateImageDimensions(file);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Invalid image file.');
                input.value = ''; // Reset the input
                return;
            }
        }

        uploadFile(file, (uploadedMedia) => {
            setSelectedMedia(uploadedMedia);
            const type = getMediaTypeFromMime(uploadedMedia.mimeType);
            if (type === 'image') setActiveTab('images');
            else if (type === 'video') setActiveTab('videos');
            else if (type === 'audio') setActiveTab('audio');
        });
    }, [uploadFile, allowUpload, options.mimeTypes]);

    const handleEditSave = useCallback(async () => {
        if (dialogState.type !== 'edit') return;
        await updateMedia(dialogState.media._id, dialogState.filename);
        if (selectedMedia?._id === dialogState.media._id) {
            // After reload, find the updated item and re-select it
            const updatedItem = mediaItems.find(m => m._id === dialogState.media._id);
            if (updatedItem) setSelectedMedia({...updatedItem, filename: dialogState.filename});
        }
        setDialogState({type: 'none'});
    }, [dialogState, updateMedia, selectedMedia, mediaItems]);

    const handleDeleteConfirm = useCallback(async () => {
        if (dialogState.type !== 'delete') return;
        await deleteMedia(dialogState.media._id);
        if (selectedMedia?._id === dialogState.media._id) {
            setSelectedMedia(null);
        }
        setDialogState({type: 'none'});
    }, [dialogState, deleteMedia, selectedMedia]);

    const getEmptyMessage = useCallback(() => {

        const typeText = activeTab === 'images' ? 'images' :
            activeTab === 'videos' ? 'videos' :
                activeTab === 'audio' ? 'audio files' : 'media files';
        return search
            ? `No ${typeText} found matching your search.`
            : `No ${typeText} found. Upload a file to get started.`;
    }, [search, activeTab]);

    // --- Render Logic ---
    const renderTabContent = () => {
        const currentTabConfig = TABS.find(t => t.id === activeTab);
        if (currentTabConfig?.isMediaGrid) {
            return (
                <MediaGridTab
                    activeTab={activeTab} search={search} setSearch={setSearch}
                    loading={loading} mediaItems={mediaItems} selectedMedia={selectedMedia}
                    setSelectedMedia={setSelectedMedia} pagination={pagination}
                    page={page} setPage={setPage}
                    openEditDialog={(media: Media) => setDialogState({type: 'edit', media, filename: media.filename})}
                    openDeleteConfirmation={(media: Media) => setDialogState({type: 'delete', media})}
                    getEmptyMessage={getEmptyMessage}
                />
            );
        }
        switch (activeTab) {
            case 'upload':
                return (
                    <UploadTab
                        allowUpload={allowUpload}
                        mimeTypes={options.mimeTypes || getMimeTypesForTab('images').concat(getMimeTypesForTab('videos'))}
                        handleFileSelect={handleFileSelect}
                        uploading={uploading}
                    />
                );
            case 'imago':
            case 'generative':
                return <ComingSoonTab activeTab={activeTab}/>;
            default:
                return null;
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
                    <button className="btn btn-sm btn-ghost btn-circle" onClick={handleCancel}>✕</button>
                </div>
                {/* Tabs */}
                <div className="tabs tabs-bordered ...">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab tab-bordered ${activeTab === tab.id ? 'tab-active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">{renderTabContent()}</div>
                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                        <button className="btn btn-primary flex-1" onClick={handleSelect}
                                disabled={!selectedMedia || uploading}>Select
                        </button>
                        <button className="btn btn-ghost flex-1" onClick={handleCancel}>Cancel</button>
                    </div>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={handleCancel}>close</button>
            </form>

            {/* Delete Confirmation Dialog */}
            {dialogState.type === 'delete' && (
                <div className="modal modal-open">
                    <div className="modal-box bg-red-50 border border-red-200 rounded-2xl shadow-2xl">
                        <h3 className="font-bold text-lg text-red-800">Delete Media</h3>
                        <p className="py-4 text-red-700">
                            Are you sure you want to delete <strong
                            className="text-red-900">{dialogState.media.filename}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="modal-action">
                            <button className="btn btn-error" onClick={handleDeleteConfirm} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                            <button className="btn btn-ghost" onClick={() => setDialogState({type: 'none'})}
                                    disabled={deleting}>Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Dialog */}
            {dialogState.type === 'edit' && (
                <div className="modal modal-open">
                    <div className="modal-box bg-blue-50 border border-blue-200 rounded-2xl shadow-2xl">
                        <h3 className="font-bold text-lg text-blue-800">Edit Media</h3>
                        <div className="py-4">
                            <label className="label">
                                <span className="label-text text-blue-700 font-medium">Filename</span>
                            </label>
                            <input
                                type="text"
                                value={dialogState.filename}
                                onChange={(e) => setDialogState({
                                    ...dialogState,
                                    filename: (e.target as HTMLInputElement).value
                                })}
                            />
                        </div>
                        <div className="modal-action">
                            <button className="btn btn-primary" onClick={handleEditSave}
                                    disabled={editing || !dialogState.filename.trim()}>
                                {editing ? 'Saving...' : 'Save'}
                            </button>
                            <button className="btn btn-ghost" onClick={() => setDialogState({type: 'none'})}
                                    disabled={editing}>Cancel
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