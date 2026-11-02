# Beans launch checklist

Copied from DQ's new site launch checklist. An item is either met, with where it's met or how it was checked, or marked not applicable with a reason. Workstream 3 owns this file. Measured numbers are in `PLAN.md` under Landing budgets.

"e2e" below means `apps/web/e2e/marketing.spec.ts`, run against `next start`.

## 1. Every page's head

Shared tags live in `apps/web/src/marketing/head.tsx`. Titles and descriptions live in `apps/web/src/marketing/pages.ts`.

- [x] Title, 30 to 60 characters. Unit test and e2e, on all six public pages.
- [x] Meta description, 120 to 160 characters. Unit test and e2e.
- [x] `<meta name="viewport" content="width=device-width, initial-scale=1">`, with no `user-scalable=no`. e2e.
- [x] Canonical URL, from `siteUrl`. e2e. Production needs `NEXT_PUBLIC_SITE_URL` or Vercel's production URL.
- [x] `<html lang="en">`. `_document.tsx` and the root layout. e2e.
- [x] `<meta charset="utf-8">` and an HTML doctype. Next adds both.
- [x] Favicon. `/favicon.ico`, `/icon.svg` and `/apple-icon.png` from workstream 1.
- [x] Open Graph: title, description, image, url, type. e2e checks image and type; the rest come from the same tag block.
- [x] Twitter card: `summary_large_image`, title, description, image. e2e.
- [x] JSON-LD. `SoftwareApplication` on every public page, with no address or contact point. e2e. Organization and `sameAs` are left out until DQ supplies real details.
- [x] No `noindex` in meta tags or an `X-Robots-Tag` header. e2e checks the meta tag; nothing sets the header. The 404 has Next's `noindex`, which is correct.
- [x] `<meta name="is-agentic-site-type" content="app">`. e2e.

## 2. Page content and structure

- [x] Server-rendered HTML, with over 500 characters of real content and one H1 in the raw HTML. Pages are static and ship no runtime. e2e with JavaScript off.
- [x] One H1, heading levels in order with none skipped. e2e for the H1, axe `heading-order` for the order.
- [x] A `<main>` landmark and semantic landmarks. e2e and axe.
- [x] Alt text on all images. axe. Decorative mascots beside the "Beans" name use empty alt.
- [x] Descriptive link text, and links distinguishable without color. Prose and footer links are underlined; nav links are labels in a nav. axe `link-in-text-block`.
- [x] Native `<button>`, `<a>`, `<input>`, all with accessible names. axe.
- [x] Every form field has a label. The demo's bean checkboxes are labeled; there are no other fields.
- [x] Enough color contrast. axe in light and dark, Lighthouse.
- [x] Tap targets large enough and spaced apart. Lighthouse `target-size`.
- [x] Valid ARIA, no `tabindex` above 0, lists contain only `<li>`. axe.
- [x] Pages small enough for an agent's context window. Landing HTML is about 33 KB, and its markdown version about 2 KB.
- [x] No hidden text that tries to instruct an AI agent. Hidden text is only control labels and the demo's status line.

## 3. Files at the site root

- [x] `robots.txt` with `User-agent`, `Allow` and a `Sitemap:` line. e2e.
- [x] Doesn't block ChatGPT-User, OAI-SearchBot, Claude-User or PerplexityBot in robots.txt. e2e. Cloudflare isn't in front of the site.
- [x] `sitemap.xml` with `lastmod`. e2e.
- [x] `llms.txt` with markdown links that all resolve. e2e follows each link.
- [x] About, Contact and Privacy pages. The contact page has no address until DQ supplies one.
- [x] Public pricing page at `/pricing`: plans, the trial, how to cancel and refunds, and the live launch offer. Static, rebuilt at most once a minute. In the header and footer, sitemap, `llms.txt` and the markdown versions. e2e.

## 4. Server and HTTP behavior

- [ ] HTTPS: not testable locally. Vercel serves HTTPS. Check on the production domain.
- [x] `Strict-Transport-Security: max-age=31536000; includeSubDomains`. Production builds, in `next.config.ts`. e2e.
- [x] `Content-Security-Policy`. Strict on public pages, and allowing Clerk and Convex on the app routes, in `apps/web/src/lib/csp.ts`. Unit test and e2e.
- [x] `X-Frame-Options: SAMEORIGIN`. e2e.
- [x] `X-Content-Type-Options: nosniff`. e2e.
- [x] Markdown content negotiation, with `Vary: Accept`, in `proxy.ts`. e2e.
- [x] Agent-friendly 404s: a real 404 status, with a helpful markdown body for markdown clients. e2e.
- [x] Clean redirects: the public pages have none.
- [x] Public pages readable without signing in. Clerk only runs on `/app`, `/sign-in`, `/sign-up`, `/api` and `/__clerk`.
- [x] No console errors. e2e, once the video files land.
- [x] No deprecated APIs, no third-party cookies. Lighthouse best practices. Public pages make no third-party requests.
- [x] No location or notification prompts on load. Nothing asks.
- [x] Pasting into inputs allowed. There are no text inputs on public pages, and nothing blocks paste.
- [x] Images shown at correct aspect ratio and resolution. Every image has width and height, with 1x and 2x files.

## 5. Speed (Lighthouse, mobile)

Recorded in `PLAN.md`. All five metrics pass, with the median of three runs on a production build.

- [x] Total Blocking Time, 200 ms or under
- [x] Largest Contentful Paint, 2.5 s or under, and under the tighter 2.0 s budget
- [x] Cumulative Layout Shift, 0.1 or under, and under the tighter 0.05 budget
- [x] First Contentful Paint, 1.8 s or under
- [x] Speed Index, 3.4 s or under

## 6. API, OAuth or MCP server

Not applicable. Beans ships no public API, OAuth provider or MCP server. `/api/test-auth` only exists for local tests.

## 7. Bonus only

Not applicable. The playbook says to skip these unless the product needs them, and it doesn't.

## 8. Things you can't set up before launch

Not applicable before launch: Ahrefs Domain Rating, domain age and ranking for the brand name need a live site and time. Lighthouse scores vary from run to run.
