import secure from '../utils/secureInternal.js';
import {NotFound, Success, ValidationError} from '../utils/errors.js';
import path from 'path';
import {InternalServerError, OneApiFunction} from "@supergrowthai/oneapi";
import {ApiExtra} from "../types/api.ts";
import {PaginatedResponse, PaginationParams} from '@supergrowthai/next-blog-types';

export const getMedia = secure(async (session, request, extra) => {
    const db = extra.sdk.db;
    const params = request.query as PaginationParams & {
        search?: string
        mimeType?: string;
        userId?: string;
    } | undefined;

    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;
    const search = params?.search;
    const userId = params?.userId;

    let filter: any = {};

    if (params?.mimeType) {
        const mimeTypes = params.mimeType.split(',').map(type => type.trim());
        if (mimeTypes.length > 1) {
            filter.mimeType = {$in: mimeTypes};
        } else {
            filter.mimeType = {$regex: mimeTypes[0]};
        }
    }

    if (userId) {
        filter.userId = params.userId;
    }

    if (!!search) {
        console.log("search", typeof search, search)
        filter = {
            ...filter,
            $or: [
                {filename: {$regex: search, $options: 'i'}},
                {mimeType: {$regex: search, $options: 'i'}}
            ]
        };
    }

    const skip = (page - 1) * limit;

    let media = await db.media.find(filter, {skip, limit, sort: {_id: -1}});

    const hookResult = await extra.sdk.callHook('media:onList', {
        entity: 'media',
        operation: 'list',
        filters: filter,
        data: media
    });
    if (hookResult?.data) {
        media = hookResult.data;
    }

    const paginatedResponse: PaginatedResponse<any> = {
        data: media,
        page,
        limit
    };

    throw new Success('Media retrieved successfully', paginatedResponse);
}, {requirePermission: 'media:list'});

export const getMediaById = secure(async (session, request, extra) => {
    const db = extra.sdk.db;
    const id = request._params?.id;

    if (!id) {
        throw new ValidationError('Media ID is required');
    }

    const media = await db.media.findById(id);

    if (!media) {
        throw new NotFound('Media not found');
    }

    await extra.sdk.callHook('media:onRead', {media});

    throw new Success('Media retrieved successfully', media);
}, {requirePermission: 'media:read'});

export const createMedia = secure(async (session, request, extra) => {
    const db = extra.sdk.db;
    const data = request.body as any;

    if (!data.filename || !data.mimeType) {
        throw new ValidationError('filename and mimeType are required');
    }

    const mediaData = {
        ...data,
        userId: session.user.id
    };

    await extra.sdk.callHook('media:onCreate:before', {data: mediaData});

    const media = await db.media.create(mediaData);

    await extra.sdk.callHook('media:onCreate:after', {media});

    throw new Success('Media created successfully', media);
}, {requirePermission: 'media:create'});

export const updateMedia = secure(async (session, request, extra) => {
    const db = extra.sdk.db;
    const id = request._params?.id;

    if (!id) {
        throw new ValidationError('Media ID is required');
    }

    const data = request.body as any;

    const existingMedia = await db.media.findById(id);
    if (!existingMedia) {
        throw new NotFound('Media not found');
    }

    await extra.sdk.callHook('media:onUpdate:before', {media: existingMedia, updates: data});

    const updatedMedia = await db.media.updateOne({_id: id}, data);

    await extra.sdk.callHook('media:onUpdate:after', {media: updatedMedia});

    throw new Success('Media updated successfully', updatedMedia);
}, {requirePermission: 'media:update'});

export const deleteMedia = secure(async (session, request, extra) => {
    const db = extra.sdk.db;
    const id = request._params?.id;

    if (!id) {
        throw new ValidationError('Media ID is required');
    }

    const media = await db.media.findById(id);
    if (!media) {
        throw new NotFound('Media not found');
    }

    await extra.sdk.callHook('media:onDelete:before', {media});

    // Delete from storage if it's a managed file
    try {
        // Extract the storage path from the media URL
        // Expected URL format: /storage/media/{mediaId}/{filename} or full URL
        const storageAdapter = extra.sdk.storage;

        //this definitely needs to be written better
        let storagePath: string;
        if (media.url.startsWith('/storage/')) {
            storagePath = media.url.substring('/storage/'.length);
        } else if (media.url.includes('/media/')) {
            // Extract path after 'media/' for S3 or other storage
            const mediaIndex = media.url.lastIndexOf('/media/');
            if (mediaIndex !== -1) {
                storagePath = media.url.substring(mediaIndex + 1);
            } else {
                const ext = path.extname(media.url);
                storagePath = `media/${media._id}${ext}`;
            }
        } else {
            // Fallback: construct path from ID and filename
            storagePath = `media/${media._id}/${path.basename(media.url)}`;
        }

        if (await storageAdapter?.exists(storagePath)) {
            await storageAdapter?.delete(storagePath);
        }
    } catch (error) {
        console.error('Failed to delete media file from storage:', error);
        // Continue with database deletion even if storage deletion fails
    }

    await db.media.deleteOne({_id: id})

    await extra.sdk.callHook('media:onDelete:after', {mediaId: id});

    throw new Success('Media deleted successfully', null);
}, {requirePermission: 'media:delete'});

const uploadMediaHandler: OneApiFunction<ApiExtra> = async (session, request, extra) => {
    const db = extra.sdk.db;
    const storageAdapter = extra.sdk.storage;

    if (!storageAdapter)
        throw new InternalServerError("storageAdapter not found")

    // Get the raw Next.js request for streaming
    const rawRequest = request._request;
    if (!rawRequest) {
        throw new ValidationError('Invalid request: raw request not available');
    }

    const contentType = request.headers['content-type'] || '';

    // Handle streaming multipart upload
    if (contentType.includes('multipart/form-data')) {
        // Get mediaId from path params
        const mediaId = request._params?.mediaId;

        if (!mediaId) {
            throw new ValidationError('Media ID is required in URL');
        }

        // Since parseBody is false, we handle the raw stream
        if ('formData' in rawRequest && typeof rawRequest.formData === 'function') {
            const formData = await rawRequest.formData();
            const file = formData.get('file') as File;
            const storagePath = formData.get('storagePath') as string; // optional

            if (!file) {
                throw new ValidationError('No file provided');
            }

            // Convert File to Buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Save to storage
            const ext = path.extname(file.name);
            const finalPath = storagePath || `media/${mediaId}${ext}`;
            await storageAdapter.save(finalPath, buffer);

            // Get the URL for the uploaded file
            const fileUrl = await storageAdapter.getUrl(finalPath);

            if (!fileUrl) {
                throw new ValidationError('Failed to get URL for uploaded file');
            }

            // Update the existing media record with the URL
            const media = await db.media.updateOne({_id: mediaId}, {
                url: fileUrl,
                size: buffer.length
            });

            await extra.sdk.callHook('media:onUpload:after', {media});

            throw new Success('File uploaded successfully', media);
        } else {
            throw new ValidationError('Multipart form data parsing not supported for this request type');
        }
    }

    // Handle raw binary upload (for direct PUT requests)
    else if (request.method === 'PUT') {
        const mediaId = request._params?.mediaId;
        const url = new URL(request.url);

        // Get filename from query params
        const filename = url.searchParams.get('filename');

        if (!filename) {
            throw new ValidationError('Filename is required in query parameters');
        }

        const mimeType = contentType || 'application/octet-stream';

        const ext = path.extname(filename);
        const storagePath = `media/${mediaId}${ext}`;

        // Get raw request for streaming
        const rawRequest = request._request;
        if (!rawRequest) {
            throw new ValidationError('Invalid request: raw request not available');
        }

        // Check if body is available (Next.js specific)
        if ('body' in rawRequest && rawRequest.body) {
            // Stream directly to storage (when saveStream is implemented)
            // For now, collect the stream into a buffer
            const chunks: Uint8Array[] = [];
            const reader = (rawRequest.body as any).getReader();

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            const buffer = Buffer.concat(chunks);
            await storageAdapter.save(storagePath, buffer);

            // Get the URL for the uploaded file
            const fileUrl = await storageAdapter.getUrl(storagePath);

            if (!fileUrl) {
                throw new ValidationError('Failed to get URL for uploaded file');
            }

            // Create media record
            const media = await db.media.create({
                filename,
                url: fileUrl,
                mimeType,
                size: buffer.length,
                userId: session.user.id
            });

            await extra.sdk.callHook('media:onUpload:after', {media});

            throw new Success('File uploaded successfully', media);
        } else {
            throw new ValidationError('Binary upload not supported for this request type');
        }
    }

    throw new ValidationError('Unsupported upload method');
};
uploadMediaHandler.config = {parseBody: false};

export const uploadMedia = secure(uploadMediaHandler, {requirePermission: 'media:create'});
