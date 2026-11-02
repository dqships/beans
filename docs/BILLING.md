# Billing

Beans sells one subscription through Stripe, on the FollowUs AI account (the same account as Vidzilla).

- **Plans:** $6 a month or $48 a year, USD.
- **Trial:** 7 days, card up front, once per account. Stripe charges when the trial ends unless the subscription was cancelled.
- **Lock:** without a trialing, active or past-due subscription, the planner shows the paywall instead. Nothing is deleted, and subscribing again opens it with everything in place. Writes are refused on the server too (`planner.apply`).
- **Manage:** Settings, Subscription, Manage subscription opens the Stripe customer portal: cancel at the end of the period, switch monthly and yearly, update the card, billing email, invoices.
- **Refunds:** by hand. Email support@followusai.com within 14 days of a charge for a full refund (the terms promise this). Refund in the Stripe dashboard; the webhook follows whatever the subscription becomes.
- **Launch offers:** promotion codes on the monthly plan, for a first subscription only. See below.

## How it fits together

| Piece | Where |
|---|---|
| Plans, Stripe IDs per mode, launch code list, offer and status wording | `packages/core/src/billing.ts` (tests: `billing.test.ts`) |
| Stripe client and webhook signature check (no SDK) | `convex/stripe.ts` |
| Status query, checkout, portal, confirm, offer, the write lock | `convex/billing.ts` (tests: `convex/billing.test.ts`) |
| Webhook endpoint `POST /stripe/webhook` | `convex/http.ts` |
| One `billing` row per user | `convex/schema.ts` |
| Paywall gate (Convex) and the `useBilling` hook | `apps/web/src/data/billing-gate.tsx`, `apps/web/src/data/billing.tsx` |
| Paywall screen | `apps/web/src/planner/Paywall.tsx` |
| Settings, Subscription | `apps/web/src/planner/SettingsDialog.tsx` |
| Public pricing page (rebuilt at most once a minute) | `apps/web/src/pages/pricing.tsx`, data from `apps/web/src/data/offer-server.ts` |

Flow: the paywall calls `billing.checkout`, which makes the Stripe customer (tagged with the Clerk user) and a Checkout Session, and the browser goes to Stripe. Stripe sends the buyer back to `/app?checkout=<session>`; `billing.confirm` reads that session so the planner opens at once. The webhook keeps the row current after that. It reads each subscription fresh from Stripe, so event order doesn't matter, and it ignores subscriptions that aren't Beans' (Vidzilla shares the account).

Stripe Checkout and the portal are full-page redirects, so the Content-Security-Policy needs no Stripe entries.

Billing is only enforced on a Convex deployment that has `STRIPE_SECRET_KEY`. Without it the planner stays open and the pricing page shows full prices with no offer. That keeps local backends and CI working with no Stripe at all.

## Stripe objects

The mode follows the secret key: `sk_test_`/`rk_test_` uses the test IDs, `sk_live_`/`rk_live_` the live ones, from `STRIPE_IDS` in `packages/core/src/billing.ts`.

| Object | Test mode | Live mode |
|---|---|---|
| Product "Beans monthly" | `prod_VYVv3deCpZmo1k` | `prod_VYXGevO6K7Zl0T` |
| Price $6/month | `price_1UXOuBDyfH6JDnExdLFn4NRD` (lookup key `beans_monthly`) | `price_1UXQBoDyfH6JDnExCMcFrOqj` |
| Product "Beans yearly" | `prod_VYW4SHnFpac8kb` | `prod_VYXTt1M6CU6hHQ` |
| Price $48/year | `price_1UXP2qDyfH6JDnExV04uvxl0` (lookup key `beans_yearly`) | `price_1UXQOLDyfH6JDnExGPJCdM8E` |
| Portal configuration "Beans" | `bpc_1UXOx4DyfH6JDnExOjVGxgv8` | not yet: run `scripts/stripe-portal-config.mjs` (below). Until then live uses the account default |
| Coupons, monthly product only, no promotion codes yet | `beans-launch-100`, `beans-round-2-50`, `beans-round-3-25` | same IDs, created |
| Webhook endpoint | `we_1UXOyBDyfH6JDnExIerJxiQb`, to the dev deployment, **disabled** until the code is deployed there | not yet: needs the production Convex deployment URL |

Monthly and yearly are separate products on purpose: the coupons apply only to the monthly product, so a launch code can't discount a yearly plan, even if someone switches plans in the portal while it's running.

The portal configuration is not the account's default (Vidzilla uses that one). Beans passes its own configuration ID when it opens the portal. Settings in it: cancel at period end with a reason, switch between the two prices with proration, yearly to monthly at the end of the year, trials continue across a switch, card updates, invoices, billing email.

Why its own: a portal configuration offers every product in its plan-switch list to every customer who opens it. Adding the Beans plans to the default would show them to Vidzilla subscribers, and Vidzilla's plans to Beans subscribers. The default stays Vidzilla's.

**Make or update it** with the script, which copies the settings above (and the test-mode configuration) using that mode's Beans prices:

```bash
STRIPE_SECRET_KEY='rk_live_…' node scripts/stripe-portal-config.mjs --site https://<your domain>
```

It prints the `bpc_…` ID: put it in `STRIPE_IDS.live.portalConfiguration` in `packages/core/src/billing.ts` and deploy. `--site` adds the privacy and terms links and the return URL; leave it out until the domain is set and run the script again later (it updates the same configuration, found by `metadata.app = beans`). `--dry-run` prints the parameters without calling Stripe. The Beans restricted key works (Customer portal: Write); so does the account's secret key.

Webhook events: `checkout.session.completed` and `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`, at API version `2024-06-20` (the version the code pins).

A new price or coupon in Stripe can't be edited; it's a new object with a new ID. Change `STRIPE_IDS` (and `PLANS` for the amount) and redeploy.

## Secrets and settings

Stripe secrets live only on the Convex deployments. Vercel and `.env.local` need nothing for Stripe.

| Variable | Where | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | Convex dev deployment | test-mode restricted key (`rk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Convex dev deployment | signing secret of the test webhook endpoint (`whsec_…`) |
| `STRIPE_SECRET_KEY` | Convex production deployment | live-mode restricted key (`rk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Convex production deployment | signing secret of the live webhook endpoint |

```bash
npx convex env set STRIPE_SECRET_KEY 'rk_…'
npx convex env set STRIPE_WEBHOOK_SECRET 'whsec_…'
```

Add `--prod` for the production deployment.

Restricted key permissions (Developers, API keys, Create restricted key, name it "Beans"):

| Resource | Permission |
|---|---|
| Customers | Write |
| Checkout Sessions | Write |
| Customer portal | Write |
| Subscriptions | Read |
| Promotion codes | Read |
| Coupons | Read |

Without the last two, the launch offer stays hidden and checkout still works at full price.

## Launch offers

`PROMO_CODES` in `packages/core/src/billing.ts` lists the rounds oldest first: `BEANS100`, `BEANS50`, `BEANS25`. The last code that's running (active, under its cap, before its end) is applied to monthly checkouts for the buyer, and the pricing page and paywall show it with its live count and end date. Finished rounds that were used stay listed ("Launch offer: 100 people got 3 months of Beans free."). Codes that don't exist in Stripe yet are skipped, so a round starts the moment its promotion code exists. No deploy needed.

The names aren't `LAUNCH100`: promotion codes are unique across the Stripe account, and Vidzilla uses the `LAUNCH` names.

| Round | Code | Coupon | Cap | Length |
|---|---|---|---|---|
| Launch | `BEANS100` | `beans-launch-100`: 100% off, 3 months, named "Launch offer" | 100 | 4 weeks |
| 2 | `BEANS50` | `beans-round-2-50`: 50% off, 3 months, "Round 2" | 250 | 2 weeks |
| 3 | `BEANS25` | `beans-round-3-25`: 25% off, 3 months, "Round 3" | 500 | 2 weeks |

**Start a round** in the Stripe dashboard: Product catalog, Coupons, open the round's coupon, Add promotion code. Code as above, **Limit the number of times this code can be redeemed** to the cap, and **Add an expiration date** at the round's end. Promotion codes can't get an end date later, so set it when you make it.

The 3 months count from the start of the trial, and Stripe discounts every invoice that starts inside them, so a buyer gets their first 3 paid months at the discount (trial, then 3 months, then $6 a month). Returning customers get no trial, no code and no code box.

Test-mode `BEANS100` exists (100 uses, ends 30 November 2026). Live codes are made on launch day.

## Testing

- `pnpm test` runs the core and Convex tests with a fake Stripe: signatures, the lock, trials once, codes on monthly only, the fallback when a code runs out, other products ignored, out-of-order events.
- `apps/web/e2e/billing.spec.ts` checks the pricing page everywhere. With `E2E_STRIPE=1` and a Stripe test key on the local backend it also buys a trial with the 4242 card on Stripe's real Checkout.
- A real sandbox purchase locally: run the local backend (`pnpm backend:setup`, then `pnpm convex:dev`), set a test key on it with `npx convex env set STRIPE_SECRET_KEY sk_test_…`, forward webhooks with `stripe listen --api-key <that key> --forward-to http://127.0.0.1:3211/stripe/webhook` and set its printed secret as `STRIPE_WEBHOOK_SECRET`, then sign in with the test sign-in and use Stripe's test cards (`4242 4242 4242 4242` pays, `4000 0000 0000 0002` is declined).
