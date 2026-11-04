# Deploying Beans

Beans runs on Vercel (the Next.js app), Convex (data, the rollover job and the Stripe webhook), Clerk (sign-in) and Stripe (subscriptions, see `docs/BILLING.md`). Everything below that creates a service, changes billing or touches a domain is for DQ to do. The repo already holds the config.

## What's in the repo

| File | Purpose |
|---|---|
| `apps/web/vercel.json` | Install and build commands, and the Ignored Build Step |
| `apps/web/scripts/vercel-ignore-build.mjs` | Skips builds when nothing the web app uses changed, and always for `claude/` and `codex/` branches |
| `convex/auth.config.ts` | Trusts Clerk tokens once `CLERK_JWT_ISSUER_DOMAIN` is set |
| `convex/crons.ts` | Rollover and Trash cleanup every 15 minutes |
| `convex/http.ts` | The Stripe webhook, at `https://<deployment>.convex.site/stripe/webhook` |
| `apps/web/.env.example`, `.env.example` | Variable names, no values |

The Vercel build command runs from the repo root:

```bash
npx convex deploy --cmd 'pnpm --filter @beans/web build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

It pushes the Convex functions, then builds the web app with the matching `NEXT_PUBLIC_CONVEX_URL`. A production deploy key deploys to production; a preview deploy key makes a preview deployment per branch.

## Steps

### 1. Clerk

1. Create the Clerk application. Turn on email codes and Google, to match the sign-in page.
2. Turn on the Convex integration at https://dashboard.clerk.com/apps/setup/convex and copy the Frontend API URL.
3. For production, create the production instance, add the domain and its DNS records as Clerk lists them, and set up Google OAuth credentials for production.

### 2. Convex

1. Create a Convex project and its production deployment.
2. On each deployment (dev and production), set the Clerk issuer:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<frontend-api-url>
   ```

   Never set `CLERK_JWT_ISSUER_DOMAIN` to `none` or set `BEANS_TEST_AUTH_ISSUER` on a hosted deployment. They're for the local test sign-in only, and the test issuer is only accepted on localhost anyway.
3. Generate a production deploy key, and a preview deploy key if previews are wanted.

### 3. Vercel

1. Import the GitHub repo as a new project.
2. Set **Root Directory** to `apps/web` and keep **Include files outside the root directory** on (the app imports `packages/` and `convex/`).
3. Framework: Next.js. Install and build commands come from `apps/web/vercel.json`.
4. Environment variables:

   | Name | Production | Preview |
   |---|---|---|
   | `CONVEX_DEPLOY_KEY` | production deploy key | preview deploy key |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | `pk_test_…` |
   | `CLERK_SECRET_KEY` | `sk_live_…` | `sk_test_…` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | `/sign-in` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | `/sign-up` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your domain>` | leave unset |
   | `MCP_SERVER_SECRET` | the production Convex deployment's value | the dev or preview deployment's value |

   Don't set any `BEANS_TEST_AUTH` variable on Vercel. Production builds ignore them, but they don't belong there.
5. Deploy. Then sign in on the deployed site, add a task, open a second window, and check it syncs.

### Headers

`apps/web/src/lib/csp.ts` builds the Content-Security-Policy once, at build time. It reads the Clerk host from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and the Convex host from `NEXT_PUBLIC_CONVEX_URL`, so a production Clerk domain needs no edit, but both must be set at build, and a Clerk key change needs a rebuild. The policy doesn't allow Vercel's preview toolbar. `Strict-Transport-Security` uses `includeSubDomains`, so every subdomain must serve HTTPS.

### 4. Stripe

Full detail in `docs/BILLING.md`. Stripe secrets go on the Convex deployments only; Vercel needs no Stripe variables.

1. In the FollowUs AI Stripe account, make a restricted key per mode with the permissions listed in `docs/BILLING.md`.
2. Dev deployment (test mode): enable the test webhook endpoint `we_1UXOyBDyfH6JDnExIerJxiQb` (Workbench, Webhooks) once the billing code is deployed there, reveal its signing secret, then:

   ```bash
   npx convex env set STRIPE_SECRET_KEY 'rk_test_…'
   npx convex env set STRIPE_WEBHOOK_SECRET 'whsec_…'
   ```

3. Production deployment (live mode): the live endpoint `we_1UXTZRDyfH6JDnExkg7amGZv` ("Beans production") already sends the events listed in `docs/BILLING.md` to `https://avid-mole-890.convex.site/stripe/webhook`. Reveal its signing secret (Workbench, Webhooks, Beans production), then:

   ```bash
   npx convex env set --prod STRIPE_SECRET_KEY 'rk_live_…'
   npx convex env set --prod STRIPE_WEBHOOK_SECRET 'whsec_…'
   ```

4. The live Beans portal configuration exists. If the domain changes, run `scripts/stripe-portal-config.mjs --site https://<new domain>` again to update its legal links (`docs/BILLING.md`, Stripe objects).
5. Setting `STRIPE_SECRET_KEY` turns the paywall on for that deployment. Accounts made before then (DQ's own) see it too: give yourself a 100% forever coupon in the Stripe dashboard if you want free access.

### 5. MCP server

The Beans MCP server is the `/mcp` route of the same app, at `https://mcp.beans.followusai.com/mcp`. Plan and decisions: `docs/ideas/mcp.md`.

1. Add `mcp.beans.followusai.com` to the Vercel project's domains (`vercel domains add mcp.beans.followusai.com beans --scope followusai`), and the record Vercel asks for in Cloudflare (an `A` record for `mcp.beans` to `76.76.21.21`), DNS only (not proxied).
2. Make one random secret per deployment (`openssl rand -hex 32`) and set it in both places, without printing it:

   ```bash
   openssl rand -hex 32 > /tmp/mcp-secret
   npx convex env set MCP_SERVER_SECRET --deployment prod < /tmp/mcp-secret
   pbcopy < /tmp/mcp-secret   # paste into Vercel: Settings, Environment Variables, Production
   rm /tmp/mcp-secret
   ```

   Run the Convex command from a checkout linked to the hosted project. In a worktree set up with `pnpm backend:setup` it lands on the local backend instead. Preview deployments need it on their Convex preview deployment too (Convex project settings, default environment variables for previews).
3. In the Clerk Dashboard, OAuth applications, Settings: turn on **Publish CIMD support**, first on development, then production. Leave client admission at "Any compatible CIMD client". Turn on DCR only for an AI app that can't use CIMD.
4. Check: `curl -i -X POST https://mcp.beans.followusai.com/mcp` answers 401 with `WWW-Authenticate`, and `https://mcp.beans.followusai.com/.well-known/oauth-protected-resource/mcp` lists `"resource":"https://mcp.beans.followusai.com/mcp"`.

### 6. PostHog

Product analytics go to the Beans PostHog project (id 708990, US cloud). The project key is public.

| Event | Sent from | When |
|---|---|---|
| `signed_up` | `planner.init` (Convex) | The account's settings are created on first sign-in. Sets the person's `email`, and the `first_touch_*` properties below when the browser knows them. |
| `activated` | `notePlanning` in `convex/analytics.ts`, called by `planner.apply` and the MCP tools | The first time a task lands on a day: added there, or moved from the Brain Dump or a list. `source` is `app` or `mcp`. Once per account (`userSettings.activatedAt`). |
| `day_planned` | `notePlanning`, same writes as `activated` | A task put on a day, at most once per user per calendar day in their time zone (`userSettings.lastDayPlannedOn`), the activation day included. `planned_for` (the task's day), `source`, `days_ahead` (that day minus today). Rollover and repeat instances are made on the server and don't count. |
| `checkout_started` | `billing.checkout` (Convex action) | Stripe has made the Checkout Session. `plan`, `promo_code` (the launch code applied, or null), `price` in dollars, `currency`, `trial`. |
| `paid` | `billing.recordPayment`, from `invoice.paid` on the Stripe webhook | The first invoice with a charge, once per account (`billing.paidAt`). `plan`, `amount` in dollars (6, not 600), `currency`. |
| `subscription_cancelled` | `billing.recordCancellation`, from `customer.subscription.deleted` on the Stripe webhook | A Beans subscription has ended (Stripe reports it `canceled`), once per subscription (`billing.cancelledSubscriptions`). `plan`, `cancellation_reason` (the portal feedback, else Stripe's reason), `stripe_cancellation_reason`, `days_subscribed` (start to end, trial included), `ended_in_trial`. |
| `$pageview` (anonymous) | `proxy.ts`, with `@/lib/pageview` | A GET of a marketing page (`/`, `/pricing`, `/about`, `/connect-ai`, `/contact`, `/privacy`, `/terms`) on the production host, sent after the response with `waitUntil`. Not for bots, prefetches, RSC or data requests, HEAD, assets, or the app, sign-in, API and MCP routes. |

Every event has `product: "beans"` and the Clerk user id as `distinct_id`; the planner calls `posthog.identify` with the same id and the email. Server events go out from hosted Convex deployments only, so local backends and tests send nothing. `POSTHOG_KEY` on a deployment overrides the built-in key.

**Marketing page views.** The marketing pages ship no React and set no cookies, so their page views are sent by the server. Each has `$process_person_profile: false` (no person profile), `$lib: "server-pageview"`, `$current_url` with only its `utm_*` tags kept, `$pathname`, `$referrer`/`$referring_domain` (`$direct` without one), the `utm_*` tags, `$raw_user_agent` (PostHog reads browser, OS and device from it) and `$geoip_country_code` from Vercel's `x-vercel-ip-country` header, with `$geoip_disable` because PostHog would only see Vercel's address. The `distinct_id` is a SHA-256 of a fixed salt, the UTC date, the IP address and the user agent, so it changes daily; the IP address is never a property. They're sent only when `NEXT_PUBLIC_POSTHOG_KEY` is set and the request's host is the production site (`NEXT_PUBLIC_SITE_URL`), so previews and local builds send nothing. Vercel Web Analytics keeps running alongside.

**Where sign-ups come from.** A marketing page reached from another site, or with `utm_*` tags, is served with its links to the other marketing pages, `/sign-up` and `/sign-in` carrying `ft_ref` (the referrer), `ft_lp` (the landing path) and the `utm_*` tags (`@/lib/source`). `proxy.ts` reads the page as normally served and rewrites the links, uncached, and falls back to the plain page on any error, so the pages still run no JavaScript and set no cookies. The sign-in and sign-up pages keep that source in session storage for the tab (`apps/web/src/data/first-touch.ts`), pass it to `posthog.identify` as `$set_once` `first_touch_referrer`, `first_touch_referring_domain`, `first_touch_landing_path` and `first_touch_utm_*`, and to `planner.init`, which adds the same to `signed_up`. A direct visit with no tags carries nothing, so the person has no `first_touch_*` properties.

1. Vercel: `NEXT_PUBLIC_POSTHOG_KEY` (the `phc_…` key) for Production and Preview. Without it the planner loads no PostHog and the marketing pages send no page views.
2. Stripe: the "Beans production" webhook endpoint sends `invoice.paid` (added by DQ) and `customer.subscription.deleted` (in its list from the start). Without them `paid` and `subscription_cancelled` never fire.

### 7. Before a public launch

- Legal review: privacy policy, terms, and what sign-in data Clerk and Convex store.

## Checking the build-skip script locally

```bash
pnpm --filter @beans/web test
```

The test builds a throwaway git repo and confirms that docs-only changes skip, that web, package, Convex and lockfile changes build, and that agent branches always skip.
