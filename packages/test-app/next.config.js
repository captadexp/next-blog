/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React Strict Mode
    reactStrictMode: true,
    // Enable transpiling from our workspace packages
    transpilePackages: ['@supergrowthai/next-blog']
};

module.exports = nextConfig;