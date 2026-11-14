/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel-optimized output
  output: "standalone",

  // Suppress noisy build warnings
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Required for Prisma edge compatibility
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
