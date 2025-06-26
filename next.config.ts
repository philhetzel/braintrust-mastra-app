import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*"],
};

module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
}
export default nextConfig;
