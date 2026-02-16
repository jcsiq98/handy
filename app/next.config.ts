import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API proxy to avoid CORS in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
