import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*", "braintrust", "@vercel/otel"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
