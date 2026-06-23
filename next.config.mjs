/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We keep TypeScript checking on (correctness matters) but let builds proceed
  // past lint style rules during early scaffolding.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Product images and social thumbnails can come from arbitrary external hosts.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
