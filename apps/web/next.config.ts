import type { NextConfig } from "next";
import { appPolicy, marketingPolicy } from "./src/lib/csp";

const dev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
  {
    key: "Content-Security-Policy",
    value: appPolicy({
      dev,
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
    }),
  },
];

/** Public pages get the strict policy, and `Vary` because `proxy.ts` can answer them in markdown. */
const marketingHeaders = [
  { key: "Content-Security-Policy", value: marketingPolicy({ dev }) },
  { key: "Vary", value: "Accept" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@beans/core", "@beans/tokens"],
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Later entries win. Unknown URLs keep the app policy, because the App Router renders the 404.
      { source: "/:path(about|contact|privacy|terms)?", headers: marketingHeaders },
    ];
  },
};

export default nextConfig;
