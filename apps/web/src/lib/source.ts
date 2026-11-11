import { publicPages } from "@/marketing/pages";
import { TOOL_PATHS } from "@/tools/slugs";

/**
 * Where a visitor came from, carried from the marketing page they landed on
 * to sign-up without cookies or JavaScript on the marketing pages. When a
 * page is reached from another site or with `utm_*` tags, `proxy.ts` serves
 * it with its internal links (the other marketing pages, sign-up and
 * sign-in) carrying the source in the query string. The sign-in and sign-up
 * pages read it and set it on the PostHog person as `first_touch_*`
 * (`apps/web/src/data/first-touch.ts`), and `planner.init` adds it to
 * `signed_up`.
 */

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
/** The site that sent the visitor, as the browser gave it (usually just its origin). */
export const REF_PARAM = "ft_ref";
/** The path of the page they landed on. */
export const LANDING_PARAM = "ft_lp";

const MAX_REF = 300;
const MAX_VALUE = 200;

/** Paths of the marketing pages, each free tool's page included. */
export const MARKETING_PATHS: ReadonlySet<string> = new Set([...Object.values(publicPages).map((p) => p.path), ...TOOL_PATHS]);

/** True for a URL on this site or one of its subdomains (sign-in, the MCP host). */
function isOwnHost(hostname: string, ownHost: string): boolean {
  const own = ownHost.replace(/:\d+$/, "").toLowerCase();
  const host = hostname.toLowerCase();
  return host === own || host.endsWith(`.${own}`);
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** The `utm_*` tags on a URL, each cut to a sane length. */
export function utmTags(params: URLSearchParams): [string, string][] {
  return UTM_KEYS.flatMap((key) => {
    const value = params.get(key);
    return value ? [[key, value.slice(0, MAX_VALUE)] as [string, string]] : [];
  });
}

/**
 * The query string a marketing page's links should carry, or null when there's
 * nothing to carry. A visit from another site starts a new source (its
 * referrer, this page as the landing page, and this URL's `utm_*` tags). A
 * link that already carries one keeps it. A direct visit with `utm_*` tags
 * carries the tags and the landing page. Anything else, including a direct
 * visit with no tags, carries nothing.
 */
export function carriedSource(url: URL, referer: string | null, ownHost: string): URLSearchParams | null {
  const out = new URLSearchParams();
  const refHost = referer ? hostOf(referer) : null;
  const utm = utmTags(url.searchParams);
  if (referer && refHost && !isOwnHost(refHost, ownHost)) {
    out.set(REF_PARAM, referer.slice(0, MAX_REF));
    out.set(LANDING_PARAM, url.pathname);
  } else if (url.searchParams.has(REF_PARAM) || url.searchParams.has(LANDING_PARAM)) {
    const ref = url.searchParams.get(REF_PARAM);
    const landing = url.searchParams.get(LANDING_PARAM);
    if (ref) out.set(REF_PARAM, ref.slice(0, MAX_REF));
    if (landing?.startsWith("/")) out.set(LANDING_PARAM, landing.slice(0, MAX_VALUE));
  } else if (utm.length) {
    out.set(LANDING_PARAM, url.pathname);
  } else {
    return null;
  }
  for (const [key, value] of utm) out.set(key, value);
  return [...out.keys()].length ? out : null;
}

const linkedPaths = [...MARKETING_PATHS, "/sign-up", "/sign-in"]
  .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .sort((a, b) => b.length - a.length);
const INTERNAL_LINK = new RegExp(`href="(${linkedPaths.join("|")})(#[^"]*)?"`, "g");

/** Adds the carried query string to every link to a marketing page, sign-up or sign-in. Assets and other links stay as they are. */
export function carryLinks(html: string, carried: URLSearchParams): string {
  const query = carried.toString().replace(/&/g, "&amp;");
  return html.replace(INTERNAL_LINK, (_, path: string, hash = "") => `href="${path}?${query}${hash}"`);
}

export type FirstTouch = Partial<
  Record<
    | "first_touch_referrer"
    | "first_touch_referring_domain"
    | "first_touch_landing_path"
    | "first_touch_utm_source"
    | "first_touch_utm_medium"
    | "first_touch_utm_campaign"
    | "first_touch_utm_content"
    | "first_touch_utm_term",
    string
  >
>;

/**
 * The `first_touch_*` person properties from a sign-in or sign-up page's URL:
 * the source the marketing pages carried, or failing that, another site that
 * linked straight to this page. Empty when nothing is known, which reads as
 * a direct visit.
 */
export function firstTouchFrom(url: URL, documentReferrer: string): FirstTouch {
  const params = url.searchParams;
  const out: FirstTouch = {};
  let ref = params.get(REF_PARAM);
  let landing = params.get(LANDING_PARAM);
  const utm = utmTags(params);
  if (!ref && !landing && !utm.length) {
    const host = documentReferrer ? hostOf(documentReferrer) : null;
    if (!host || isOwnHost(host, url.host)) return out;
    ref = documentReferrer;
    landing = url.pathname;
  }
  out.first_touch_referrer = ref ? ref.slice(0, MAX_REF) : "$direct";
  out.first_touch_referring_domain = (ref && hostOf(ref)) || "$direct";
  if (landing?.startsWith("/")) out.first_touch_landing_path = landing.slice(0, MAX_VALUE);
  for (const [key, value] of utm) out[`first_touch_${key}` as keyof FirstTouch] = value;
  return out;
}
