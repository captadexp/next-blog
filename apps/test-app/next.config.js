/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@supergrowthai/next-blog', '@supergrowthai/next-blog-types', '@supergrowthai/oneapi', '@supergrowthai/next-blog-ui', '@supergrowthai/plugin-dev-kit']
};

module.exports = nextConfig;