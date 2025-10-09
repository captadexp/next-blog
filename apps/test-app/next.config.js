/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@supergrowthai/next-blog', '@supergrowthai/types', '@supergrowthai/oneapi', '@supergrowthai/ui', '@supergrowthai/plugin-dev-kit'],

    async rewrites() {
        return [
            {source: '/sitemap.xml', destination: '/api/next-blog/api/seo/sitemap.xml'},
            {source: '/sitemap-index.xml', destination: '/api/next-blog/api/seo/sitemap-index.xml'},
            {source: '/robots.txt', destination: '/api/next-blog/api/seo/robots.txt'},
            {source: '/llms.txt', destination: '/api/next-blog/api/seo/llms.txt'},
            {source: '/rss.xml', destination: '/api/next-blog/api/seo/rss.xml'},
        ]
    }
};

module.exports = nextConfig;