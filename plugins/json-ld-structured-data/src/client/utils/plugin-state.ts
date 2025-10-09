// This file only handles blog overrides storage
import type {BlogJsonLdOverrides} from '../../types/plugin-types.js';

// Simple storage for blog-specific overrides
const blogOverrides: Record<string, BlogJsonLdOverrides> = {};

export function getBlogOverrides(blogId: string): BlogJsonLdOverrides {
    if (!blogId) {
        throw new Error('Blog ID is required');
    }
    return blogOverrides[blogId] || {
        '@type': 'Article',
        overrides: {},
        custom: {}
    };
}

export function setBlogOverrides(blogId: string, overrides: BlogJsonLdOverrides): void {
    if (!blogId) {
        throw new Error('Blog ID is required');
    }
    blogOverrides[blogId] = overrides;
}