import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
