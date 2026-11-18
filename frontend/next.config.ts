import type { NextConfig } from "next";

const apiOrigin = new URL(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).origin;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
  experimental: {
    cpus: 1,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
