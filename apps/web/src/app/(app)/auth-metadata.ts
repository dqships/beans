import type { Metadata } from "next";

/**
 * Head tags for the sign-in and sign-up pages. A page's `openGraph` and
 * `twitter` replace the layout's rather than merging, so the images repeat.
 */
export function authMetadata(path: "/sign-in" | "/sign-up", title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Beans",
      url: path,
      title,
      description,
      images: [{ url: "/social/og-image.png", width: 1200, height: 630, alt: "The Beans mascot and name" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/social/twitter-image.png"] },
  };
}
