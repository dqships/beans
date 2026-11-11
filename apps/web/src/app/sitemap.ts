import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { allPublicPages } from "@/marketing/all-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return allPublicPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: page.lastModified,
  }));
}
