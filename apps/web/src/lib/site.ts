/**
 * The site's public origin, with no trailing slash. Canonicals, the sitemap,
 * Open Graph URLs and JSON-LD all use it.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();

/** An absolute URL on this site. */
export function absoluteUrl(path: string): string {
  return path === "/" ? siteUrl : `${siteUrl}${path}`;
}

/** `--color-bg` in each theme, for the `theme-color` meta tag, which can't read CSS variables. */
export const themeColors = {
  light: "#FBF7EF", // token-ok
  dark: "#1A1511", // token-ok
};
