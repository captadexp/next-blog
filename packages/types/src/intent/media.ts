import {Media} from '../database/entities.js';

export interface MediaSelectOptions {
    mimeTypes?: string[];
    maxSize?: number;
    allowUpload?: boolean;
    mediaType?: 'image' | 'video' | 'audio' | 'all';
    selectedMediaId?: string;
}

export interface MediaSelectRequest {
    options?: MediaSelectOptions;
}

export interface MediaSelectResponse {
    media: Media | null;
}