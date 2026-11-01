# Beans launch plan

The coordinator owns this file. Every sub-agent reads it first, then `DESIGN.md`, `docs/launch/voice.md` and `docs/launch/assets.md`.

Integration branch: `claude/beans-launch`, cut from `claude/beans-v1`. Merge `main` into it once PR #5 lands. It reaches `main` through one PR, which DQ reviews and merges.

## Status

| # | Workstream | Branch | Owner | Status | PR |
|---|---|---|---|---|---|
| 0 | Handoff and Clerk check | `claude/beans-launch` | Coordinator | Done. `e2e:clerk` 3 of 3 | none |
| 1 | Brand asset files | `claude/launch-brand-assets` | Sub-agent | Merged | [#6](https://github.com/dqships/beans/pull/6) |
| 2 | Mascot poses | `claude/launch-mascot` | Sub-agent | Merged | [#7](https://github.com/dqships/beans/pull/7) |
| 3 | Landing page | `claude/launch-landing` | Sub-agent | Merged | [#8](https://github.com/dqships/beans/pull/8) |
| 4 | Demo video | `claude/launch-video` | Sub-agent | Running | |
| 5 | Launch audit | `claude/beans-launch` | Coordinator | Not started | |

## Rules for every workstream

- Stay inside your branch, your worktree and your file list below. Never merge anything. Open a PR into `claude/beans-launch`.
- Use `DESIGN.md` tokens only. Only the coordinator edits `DESIGN.md`. Need a token or a contract change? Stop and ask the coordinator in your report.
- Small commits, pushed often. Branch names start with `claude/`. Never commit keys, screenshots or contact sheets.
- Run `pnpm install` before anything else in a new worktree. Use `pnpm exec convex ...`, never `npx convex`.
- Don't run `pnpm convex:dev` or `pnpm backend:setup`. The coordinator runs the 12 backend e2e tests on the merged result.
- Run the sample-data e2e tests on your own port, with the backend specs left out: `E2E_PORT=<your port> pnpm --filter @beans/web exec playwright test e2e/board.spec.ts e2e/views.spec.ts e2e/details.spec.ts e2e/phone.spec.ts`.
- Screenshots go in your scratchpad. Look at every screenshot you take.
- If the same blocker survives three different attempts, record what you tried and move on.
- Your report says what you verified (commands, screenshots) and what you didn't.

| Workstream | Worktree | Dev port |
|---|---|---|
| 1 | `/Users/starship/GitHub/beans-worktrees/brand` | 3101 |
| 2 | `/Users/starship/GitHub/beans-worktrees/mascot` | 3102 |
| 3 | `/Users/starship/GitHub/beans-worktrees/landing` | 3103 |
| 4 | `/Users/starship/GitHub/beans-worktrees/video` | 3104 |

## Shared contracts

### Routes

| Path | What | Router |
|---|---|---|
| `/` | Landing page | Pages (`apps/web/src/pages/`) |
| `/about`, `/contact`, `/privacy`, `/terms` | Plain marketing pages | Pages |
| `/app` | Planner behind sign-in | App, `(app)` route group |
| `/sign-in`, `/sign-up` | Clerk | App, `(app)` route group |
| 404 | Mascot page, real 404 status | App `not-found.tsx` (App Router overrides `pages/404`) |

Clerk and Convex providers live in `apps/web/src/app/(app)/layout.tsx`. This move is done on the integration branch.

**Why the Pages router.** The App Router ships 179 KB of gzipped JavaScript on an almost empty page (measured 2026-10-31), so the 70 KB budget can't be met from an `app/(marketing)` group. Pages with `export const config = { unstable_runtimeJS: false }` ship no framework JavaScript. If that doesn't work with this Next.js version, keep the pages in `app/(marketing)/`, and report the measured numbers to the coordinator.

Pages Router pages get no App Router metadata, so they carry their own tags through `next/head`. Keep those tags in one shared component.

### Site URL

`apps/web/src/lib/site.ts` exports `siteUrl`: `NEXT_PUBLIC_SITE_URL`, then `https://` plus `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`. Canonicals, the sitemap, Open Graph URLs and JSON-LD all use it. Workstream 3 creates this file.

### Files owned by each workstream

| Workstream | Owns |
|---|---|
| 1 | `scripts/build-brand-assets.mjs`, `assets/brand/`, `apps/web/src/app/favicon.ico`, `icon.svg`, `icon.png`, `apple-icon.png`, `manifest.ts`, `apps/web/public/brand/`, `apps/web/public/social/`, the `icons` line in `apps/web/src/app/layout.tsx`, section 1 of `assets.md` |
| 2 | `assets/illustrations/`, `apps/web/public/illustrations/`, `scripts/build-illustrations.mjs`, `apps/web/src/ui/garden.tsx` and its CSS, the app's empty, error and sign-in art, section 2 of `assets.md` |
| 3 | `apps/web/src/pages/`, `apps/web/src/marketing/`, `apps/web/src/lib/site.ts`, `apps/web/public/product/`, `proxy.ts`, `next.config.ts`, the rest of `app/layout.tsx`, `sitemap.ts`, `robots.ts`, `docs/launch/checklist.md`, the capture script for screenshots, section 3 of `assets.md` |
| 4 | `apps/video/`, `apps/web/public/video/`, `docs/launch/video.md`, section 4 of `assets.md` |

Each workstream may add its own script to the root `package.json`. On a lockfile conflict, take the base version and rerun `pnpm install`.

### Asset manifest

`docs/launch/assets.md`. Write only in your own section. Final paths and dimensions are fixed there, so the landing page can build on placeholders and swap in real files without changing code.

### Voice

`docs/launch/voice.md`. Landing copy and video captions both follow it.

## Anti-slop rules

Beans has a world of its own: seed-packet paper, soil lines, a beanstalk Timebox, a bean mascot. Use it. Never:

- Purple-to-blue or mesh gradients, glowing blobs, glassmorphism, or noise on gradients.
- A centered hero with a gradient headline, two pill buttons and a tilted floating device mockup.
- Three-column feature grids, stacks of identical rounded cards, icons in tinted circles, or eyebrow labels above headings.
- Sparkles icons, emoji as bullets, "AI-powered", "supercharge", "unlock", "seamless", "effortless", "game-changer", or rhetorical-question headlines.
- Fake testimonials, logos, user counts or ratings. With no real social proof, leave it out.
- Stock photos, generic 3D renders, or a mascot that drifts off model.
- Animation on scroll everywhere, parallax for its own sake, or text fading in word by word.

Instead: an editorial layout with real hierarchy, real product UI taken from the actual app on sample data, specific copy, and the mascot used sparingly where it adds warmth.

## Landing budgets

Enforced. Workstream 3 records real numbers here.

| Budget | Limit | Measured |
|---|---|---|
| Landing JavaScript, gzipped | Under 70 KB | 1.9 KB (`landing.js` only, no framework) |
| LCP, mobile throttling | Under 2.0 s | 1.48 s |
| CLS, mobile throttling | Under 0.05 | 0 |
| Lighthouse performance | 95 or above | 100 |
| Lighthouse accessibility | 95 or above | 100 |
| Lighthouse best practices | 95 or above | 100 |
| Lighthouse SEO | 95 or above | 100 |

Also: every image sized, in AVIF or WebP, and lazy below the fold. Fonts through `next/font` only. No third-party scripts.

## Open items for DQ

Kept in `TASKS.md` under Needs DQ, and listed in the final PR.
