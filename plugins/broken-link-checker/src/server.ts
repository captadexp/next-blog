import type {ServerSDK} from '@supergrowthai/plugin-dev-kit/server';
import {defineServer} from '@supergrowthai/plugin-dev-kit';
import {ExtractedLink, extractLinksFromContent} from "@supergrowthai/plugin-dev-kit/content"
import {BrokenLink, LinkCheckResult, PostReference, ScanResponse} from './types';

const checkLink = async (url: string): Promise<LinkCheckResult> => {
    try {
        // Skip checking local/relative URLs
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return {
                url,
                status: 'skipped',
                ok: true
            };
        }

        // Use a HEAD request for efficiency
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        return {
            url,
            status: response.status,
            ok: response.ok
        };
    } catch (error: any) {
        // This catches network errors, DNS issues, etc.
        return {
            url,
            status: 'error',
            ok: false,
            error: error.message
        };
    }
};

const scanForBrokenLinks = async (sdk: ServerSDK): Promise<ScanResponse> => {
    try {
        const blogsResponse = await sdk.db.blogs.find({status: 'published'});

        if (!blogsResponse.length) {
            throw new Error('No published articles found. Please publish some articles before running a scan.');
        }

        const allLinks = new Map<string, Set<PostReference>>();

        for (const blog of blogsResponse) {
            // Parse content as ContentObject and extract links
            let links: ExtractedLink[] = [];

            try {
                // The content might be stored as a JSON string or an object
                const blogContent = typeof blog.content === 'string'
                    ? blog.content
                    : JSON.stringify(blog.content);

                links = extractLinksFromContent(blogContent);
            } catch (error) {
                sdk.log.warn(`Failed to parse content for blog ${blog._id}: ${error}`);
                continue;
            }

            // Process extracted links
            for (const link of links) {
                // Only check external URLs and images
                if (link.url && (link.type === 'link' || link.type === 'image')) {
                    if (!allLinks.has(link.url)) {
                        allLinks.set(link.url, new Set<PostReference>());
                    }

                    allLinks.get(link.url)!.add({
                        postId: blog._id,
                        postTitle: blog.title
                    });
                }
            }
        }

        if (allLinks.size === 0) {
            return {
                code: 0,
                message: 'No links found in published articles.',
                payload: []
            };
        }

        sdk.log.info(`Checking ${allLinks.size} unique links...`);

        const linkCheckPromises = Array.from(allLinks.keys()).map(checkLink);
        const results = await Promise.all(linkCheckPromises);

        const brokenLinks: BrokenLink[] = results
            .filter(result => !result.ok)
            .map(result => ({
                url: result.url,
                status: result.status,
                posts: Array.from(allLinks.get(result.url)!)
            }));

        return {
            code: 0,
            message: `Scan complete. Found ${brokenLinks.length} broken links out of ${allLinks.size} total links.`,
            payload: brokenLinks
        };
    } catch (error: any) {
        sdk.log.error(`Broken link scan failed: ${error.message}`);

        return {
            code: 1,
            message: error.message,
            payload: null
        };
    }
};

export default defineServer({
    hooks: {
        'broken-link-checker:scan-broken-links': scanForBrokenLinks,
    },
    rpcs: {
        'broken-link-checker:scan-broken-links': async (sdk: ServerSDK) => {
            return await scanForBrokenLinks(sdk);
        }
    }
});