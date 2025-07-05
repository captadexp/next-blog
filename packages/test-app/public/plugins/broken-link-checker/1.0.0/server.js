(() => {
    const findLinksInHtml = (html) => {
        const regex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g;
        const links = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            links.push(match[1]);
        }
        return links;
    };

    const checkLink = async (url) => {
        try {
            // Use a HEAD request for efficiency
            const response = await fetch(url, {method: 'HEAD', redirect: 'follow'});
            return {url, status: response.status, ok: response.ok};
        } catch (error) {
            // This catches network errors, DNS issues, etc.
            return {url, status: 'error', ok: false, error: error.message};
        }
    };

    const scanForBrokenLinks = async (sdk) => {
        try {
            const blogsResponse = await sdk.db.blogs.find({status: 'published'});
            if (!blogsResponse.length) {
                throw new Error("Failed to fetch published blogs.");
            }

            const allLinks = new Map();
            for (const blog of blogsResponse) {
                const links = findLinksInHtml(blog.content);
                for (const link of links) {
                    if (!allLinks.has(link)) {
                        allLinks.set(link, new Set());
                    }
                    allLinks.get(link).add({postId: blog._id, postTitle: blog.title});
                }
            }

            const linkCheckPromises = Array.from(allLinks.keys()).map(checkLink);
            const results = await Promise.all(linkCheckPromises);

            const brokenLinks = results
                .filter(result => !result.ok)
                .map(result => ({
                    url: result.url,
                    status: result.status,
                    posts: Array.from(allLinks.get(result.url))
                }));

            return {code: 0, message: "Scan complete.", payload: brokenLinks};
        } catch (error) {
            sdk.log.error(`Broken link scan failed: ${error.message}`);
            return {code: 1, message: error.message, payload: null};
        }
    };

    return {
        hooks: {
            "scan-broken-links": scanForBrokenLinks,
        },
        rpcs: {
            "scan-broken-links": async (sdk) => {
                const report = await scanForBrokenLinks(sdk);
                return {code: 0, payload: report};
            }
        }
    };
})();
