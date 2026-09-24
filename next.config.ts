import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Next.js 15: serverExternalPackages is top-level (no longer experimental)
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@modelcontextprotocol/sdk",
    "@resvg/resvg-js",
  ],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
