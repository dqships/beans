import { MARKETING_PATHS, utmTags } from "./source";

/**
 * Server-side PostHog page views for the marketing pages, sent from
 * `proxy.ts` after the response, so the pages keep shipping no analytics
 * code and setting no cookies. Each view is anonymous: it makes no PostHog
 * person (`$process_person_profile: false`), and its `distinct_id` is a hash
 * of the IP address, user agent and UTC date, so it changes every day and
 * the IP address itself is never sent as a property.
 */

export const POSTHOG_CAPTURE_URL = "https://us.i.posthog.com/i/v0/e/";
/** Not a secret: it only keeps these hashes from matching other sites' hashes of the same inputs. */
const SALT = "beans-pageview-v1";

/** Crawlers, link previews, monitors, headless browsers and scripts. A real browser's user agent matches none of these. */
const BOT =
  /bot\b|bot\/|crawl|spider|slurp|mediapartners|facebookexternalhit|facebookcatalog|embedly|quora link preview|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|slack|skype|lighthouse|pagespeed|gtmetrix|headless|phantom|puppeteer|playwright|selenium|curl\/|wget|python|httpx|aiohttp|go-http-client|java\/|okhttp|axios|node-fetch|undici|libwww|scrapy|preview|monitor|uptime|pingdom|statuscake|datadog|vercel-|ahrefs|semrush|mj12|dotbot|petalsearch|yandex|baidu|bytespider|gptbot|chatgpt-user|oai-searchbot|claude-(?:user|searchbot|web)|anthropic-ai|perplexity|cohere-ai|ccbot|amazonbot|applebot|duckduckgo|google-inspectiontool|googleother|feedfetcher/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

/** Prefetches and prerenders by the browser or Next.js, and Next.js data and RSC requests. None is a person viewing a page. */
export function isPrefetch(headers: Headers): boolean {
  if (headers.has("next-router-prefetch") || headers.has("x-middleware-prefetch") || headers.has("rsc") || headers.has("x-nextjs-data")) return true;
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""} ${headers.get("x-purpose") ?? ""}`.toLowerCase();
  if (/prefetch|prerender|preview/.test(purpose)) return true;
  // A fetch() or a subresource, not a page load.
  const dest = headers.get("sec-fetch-dest");
  return dest !== null && dest !== "document";
}

/** The day's anonymous id for a visitor: SHA-256 of the salt, UTC date, IP address and user agent. */
export async function visitorId(ip: string, userAgent: string, now: number): Promise<string> {
  const day = new Date(now).toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${SALT}|${day}|${ip}|${userAgent}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type PageviewRequest = { method: string; url: URL; headers: Headers; host: string };

export type PageviewEvent = {
  event: "$pageview";
  distinct_id: string;
  timestamp: string;
  properties: Record<string, string | boolean>;
};

function referringDomain(referer: string): string {
  try {
    return new URL(referer).hostname;
  } catch {
    return "$direct";
  }
}

/**
 * The `$pageview` for a request, or null when it shouldn't count: anything
 * but a GET of a marketing page, a bot, or a prefetch. The URL keeps only its
 * `utm_*` tags.
 */
export async function pageviewFor({ method, url, headers, host }: PageviewRequest, now: number): Promise<PageviewEvent | null> {
  if (method !== "GET" || !MARKETING_PATHS.has(url.pathname)) return null;
  const userAgent = headers.get("user-agent");
  if (isBot(userAgent) || isPrefetch(headers)) return null;

  const utm = utmTags(url.searchParams);
  const query = new URLSearchParams(utm).toString();
  const referer = headers.get("referer");
  const ip = (headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "").split(",")[0]!.trim();
  const country = headers.get("x-vercel-ip-country");
  return {
    event: "$pageview",
    distinct_id: await visitorId(ip, userAgent!, now),
    timestamp: new Date(now).toISOString(),
    properties: {
      product: "beans",
      $lib: "server-pageview",
      $process_person_profile: false,
      $current_url: `https://${host}${url.pathname}${query ? `?${query}` : ""}`,
      $host: host,
      $pathname: url.pathname,
      $referrer: referer ?? "$direct",
      $referring_domain: referer ? referringDomain(referer) : "$direct",
      $raw_user_agent: userAgent!,
      // PostHog would place the server, not the visitor, so the country comes from our host's header instead of an IP lookup.
      $geoip_disable: true,
      ...(country ? { $geoip_country_code: country } : {}),
      ...Object.fromEntries(utm),
    },
  };
}

/** Posts a page view to PostHog. Failures are logged, never thrown: a page view must not break a page. */
export async function sendPageview(key: string, view: PageviewEvent, fetchImpl: typeof fetch = fetch): Promise<void> {
  try {
    const res = await fetchImpl(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, ...view }),
    });
    if (!res.ok) console.error(`PostHog $pageview failed: ${res.status}`);
  } catch (err) {
    console.error("PostHog $pageview failed", err);
  }
}
