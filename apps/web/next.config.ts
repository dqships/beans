import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@beans/core", "@beans/tokens"],
  reactStrictMode: true,
};

export default nextConfig;
