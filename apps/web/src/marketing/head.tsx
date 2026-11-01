import Head from "next/head";
import { absoluteUrl, themeColors } from "@/lib/site";
import type { PublicPage } from "./pages";

const OG_IMAGE = "/social/og-image.png";
const TWITTER_IMAGE = "/social/twitter-image.png";
const IMAGE_ALT = "The Beans mascot and name";

const jsonLd = (page: PublicPage) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Beans",
    url: absoluteUrl("/"),
    description: page.description,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web browser",
    image: absoluteUrl(OG_IMAGE),
  }).replace(/</g, "\\u003c");

/** Every head tag a public page needs. Pages Router pages get none of the App Router's metadata. */
export function PageHead({ page, children }: { page: PublicPage; children?: React.ReactNode }) {
  const url = absoluteUrl(page.path);
  return (
    <Head>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="is-agentic-site-type" content="app" />
      <meta name="theme-color" media="(prefers-color-scheme: light)" content={themeColors.light} />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content={themeColors.dark} />
      <link rel="canonical" href={url} />
      <link rel="icon" href="/favicon.ico" sizes="48x48" />
      <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/apple-icon.png" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Beans" />
      <meta property="og:title" content={page.title} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteUrl(OG_IMAGE)} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={IMAGE_ALT} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={page.title} />
      <meta name="twitter:description" content={page.description} />
      <meta name="twitter:image" content={absoluteUrl(TWITTER_IMAGE)} />
      <meta name="twitter:image:alt" content={IMAGE_ALT} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(page) }} />
      {children}
    </Head>
  );
}
