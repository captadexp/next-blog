/**
 * Get the frontend domain for blog preview links
 * @returns The configured frontend domain or a default one
 */
export function getFrontendDomain(): string {
    // Check if window is defined (we're in the browser)
    if (typeof window !== 'undefined') {
        // Use current hostname if we're in the browser
        return window.location.origin;
    }

    // Default fallback domain - this should be configured per environment
    return process.env.FRONTEND_URL || 'http://localhost:3000';
}

/**
 * Generates a blog preview URL based on the configured base path and blog slug
 *
 * @param blogSlug - The slug of the blog post
 * @param basePath - The configured base path (e.g., /blog or /blog/abc/xyz)
 * @param includeDomain - Whether to include the full domain (default: true)
 * @returns The properly formatted preview URL
 */
export function generateBlogPreviewUrl(
    blogSlug: string,
    basePath: string = '/blog',
    includeDomain: boolean = true
): string {
    // Ensure the base path starts with a slash
    if (!basePath.startsWith('/')) {
        basePath = '/' + basePath;
    }

    // Remove trailing slash from base path if present
    if (basePath.endsWith('/')) {
        basePath = basePath.slice(0, -1);
    }

    // Remove leading slash from slug if present
    const normalizedSlug = blogSlug.startsWith('/') ? blogSlug.slice(1) : blogSlug;

    // Log the values being used (helpful for debugging)
    console.log('[generateBlogPreviewUrl] Using basePath:', basePath, 'slug:', normalizedSlug);

    // Create the path part of the URL - use the configured path, not hardcoded '/blog'
    const path = `${basePath}/${normalizedSlug}`;

    // Return with or without domain prefix
    if (includeDomain) {
        const domain = getFrontendDomain();
        const fullUrl = `${domain}${path}`;
        console.log('[generateBlogPreviewUrl] Generated full URL:', fullUrl);
        return fullUrl;
    }

    return path;
}
