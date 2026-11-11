import Head from "next/head";
import { PLANS, type Plan } from "@beans/core/billing";
import { absoluteUrl, themeColors } from "@/lib/site";
import { operator, supportEmail } from "./legal";
import { publicPages, type PublicPage } from "./pages";

const OG_IMAGE = "/social/og-image.png";
const TWITTER_IMAGE = "/social/twitter-image.png";
const IMAGE_ALT = "The Beans mascot and name";

const ORGANIZATION_ID = "https://followusai.com/#organization";

/** Price as schema.org wants it: "6", "48". */
const price = (plan: Plan) => String(plan.amount / 100);

/**
 * What Beans is, for search and AI engines that read JSON-LD `keywords`. Each
 * term appears in the home page's own copy; the main one goes first.
 */
export const PRODUCT_KEYWORDS = ["daily planner", "to-do list", "timebox", "Brain Dump"];

/**
 * The app and the company that runs it. The Organization has the operator's
 * name, support email and region (Michigan, as the contact page says) from the
 * legal pages; its street address and `sameAs` profiles stay out until DQ
 * supplies them. A free tool's page adds its own nodes after these two, and
 * Beans keeps the home page's description there.
 */
export const jsonLd = (page: PublicPage, graph?: Record<string, unknown>[]) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Beans",
        url: absoluteUrl("/"),
        description: graph ? publicPages.home.description : page.description,
        keywords: PRODUCT_KEYWORDS.join(", "),
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web browser",
        image: absoluteUrl(OG_IMAGE),
        offers: (Object.values(PLANS) as Plan[]).map((plan) => ({
          "@type": "Offer",
          name: plan.interval === "month" ? "Monthly" : "Yearly",
          price: price(plan),
          priceCurrency: plan.currency.toUpperCase(),
          url: absoluteUrl("/pricing"),
        })),
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: operator,
        url: "https://followusai.com",
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: supportEmail, url: absoluteUrl("/contact") },
        address: { "@type": "PostalAddress", addressRegion: "MI", addressCountry: "US" },
      },
      ...(graph ?? []),
    ],
  }).replace(/</g, "\\u003c");

/** Every head tag a public page needs. Pages Router pages get none of the App Router's metadata. */
export function PageHead({ page, graph, children }: { page: PublicPage; graph?: Record<string, unknown>[]; children?: React.ReactNode }) {
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(page, graph) }} />
      {children}
    </Head>
  );
}
