import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@mastra/*"],
};

module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
}
export default nextConfig;
