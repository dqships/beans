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

3. Production deployment (live mode): add a webhook endpoint to `https://<production deployment>.convex.site/stripe/webhook`, API version `2024-06-20`, with the events listed in `docs/BILLING.md`. Then:

   ```bash
   npx convex env set --prod STRIPE_SECRET_KEY 'rk_live_…'
   npx convex env set --prod STRIPE_WEBHOOK_SECRET 'whsec_…'
   ```

4. Setting `STRIPE_SECRET_KEY` turns the paywall on for that deployment. Accounts made before then (DQ's own) see it too: give yourself a 100% forever coupon in the Stripe dashboard if you want free access.

### 5. Before a public launch

- Legal review: privacy policy, terms, and what sign-in data Clerk and Convex store.

## Checking the build-skip script locally

```bash
pnpm --filter @beans/web test
```

The test builds a throwaway git repo and confirms that docs-only changes skip, that web, package, Convex and lockfile changes build, and that agent branches always skip.
