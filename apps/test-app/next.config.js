/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['@supergrowthai/next-blog', '@supergrowthai/types', '@supergrowthai/oneapi', '@supergrowthai/ui', '@supergrowthai/plugin-dev-kit']
};

module.exports = nextConfig;