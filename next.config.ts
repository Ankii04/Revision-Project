import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },

  // Experimental features
  experimental: {
    // Server actions are stable in Next.js 15, no need for experimental flag
  },
};

export default nextConfig;
