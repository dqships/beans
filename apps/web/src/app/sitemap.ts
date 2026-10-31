import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { publicPageList } from "@/marketing/pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPageList.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: page.lastModified,
  }));
}
