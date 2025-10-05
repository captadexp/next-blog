import {Media} from '../database/entities.js';

export interface ImageSelectOptions {
    mimeTypes?: string[];
    maxSize?: number;
    allowUpload?: boolean;
}

export interface ImageSelectRequest {
    options?: ImageSelectOptions;
}

export interface ImageSelectResponse {
    media: Media | null;
}