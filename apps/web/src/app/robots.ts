import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** One rule for every crawler, AI crawlers included. Only the signed-in app is left out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
