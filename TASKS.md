# Beans tasks

## Now

Phase 1, planning, is finished. Phase 2 (web UI) is done and verified. Phase 3 (accounts and data) is done. Phase 4 (planner behavior) is done. Phase 5 launch prep is done on the repo side; creating services and deploying is for DQ, listed under Needs DQ. Everything is on `main`: PR #5 merged `claude/beans-v1` on 2026-11-02.

The Launch phase went to `main` with PR #5. What's left is listed under Launch. See `docs/launch/PLAN.md`.

Billing and legal phase: integration branch `claude/billing-and-legal` takes the feature PRs, and only it goes to `main`. PR #13 (Stripe billing) and PR #12 (legal pages) are merged into it on 2026-11-02, and its PR into `main` waits for DQ's review.

### Billing and legal

- [x] Terms, privacy, contact and about written for the 7-day trial, Stripe subscriptions, 14-day refunds, discount codes and Vercel Analytics
- [x] Stripe products, checkout, customer portal, pricing page and launch codes (PR #13)
- [ ] DQ reviews the `claude/billing-and-legal` PR into `main`
- [x] Match the terms to the final Stripe setup: card required for the one 7-day trial, Settings > Subscription > Manage subscription, plan switching, failed payments, and the planner locking (data kept) when a subscription ends
- [ ] Add PostHog to the privacy policy the day it goes live (the paragraph is ready in `apps/web/src/marketing/legal.ts`)
- [x] Link `/pricing` from the terms and About (the page itself arrives with the Stripe PR)
- [ ] In-app account deletion and data export. Today both are by email to support

- [x] Review `DESIGN.md` and the mascot
- [x] Answer the open decisions below
- [x] Set up pnpm workspaces, Next.js in `apps/web`, and `packages/tokens`

## Plan

### Phase 2: Web UI with sample data

- [x] Token files generated from `DESIGN.md`, plus Figtree through `next/font` and Phosphor icons
- [x] App shell: top bar, sidebar, board, Timebox, panel toggles
- [x] Task card, composer and task details with every picker
- [x] Drag between lists, days and the Timebox
- [x] Calendar view: day, week, month
- [x] Focus mode, search, filter, Quick Capture, shortcut reference
- [x] Timer and Pomodoro UI
- [x] Settings, optional features, daily planning and shutdown, analytics, Trash
- [x] Bean checkbox, leaf now marker, leaf timer ring, empty states
- [x] Phone layout
- [x] Check all screens in light and dark, at desktop and phone widths

### Phase 3: Accounts and data

- [x] Clerk sign-in with `@clerk/nextjs`
- [x] Convex schema and functions, connected to Clerk
- [x] Data hooks between the screens and Convex
- [x] Optimistic updates for dragging, checking off and reordering
- [x] Test: changes appear live in a second browser window

### Phase 4: Planner behavior

- [x] Scheduled rollover at each user's local midnight
- [x] Repeats, templates, actual-time fill, workload limit
- [x] Trash with undo and 30-day expiry
- [x] Unit tests for dates, rollover and repeats

### Phase 5: Launch

- [x] Prepare the Vercel config for Root Directory `apps/web` (`apps/web/vercel.json`, steps in `docs/DEPLOY.md`)
- [x] Add the build-skip script and confirm a non-web change skips the build (tested locally against a throwaway repo and this repo's history)
- [ ] Deploy to Vercel with Root Directory `apps/web` (DQ, see Needs DQ)
- [ ] Deploy Convex production through the Vercel build (DQ; the build command is ready but needs a deploy key)
- [ ] Set up the production Clerk instance (DQ)
- [ ] Legal review before public release (DQ)

### Launch

Tracked in `docs/launch/PLAN.md`.

- [x] Move the planner to `/app`, with providers out of the root layout
- [x] Add the Clerk end-to-end test (`pnpm --filter @beans/web e2e:clerk`)
- [x] Brand asset files
- [x] Mascot poses and illustrations
- [x] Landing page
- [x] Demo video
- [x] Launch audit, apart from the items below that need DQ or a live deployment

Left to do on the launch:

- [ ] Run `pnpm --filter @beans/web e2e:clerk:prod`: real sign-up, saving and sync under the production CSP (DQ, it creates a test account). The signed-out path already passes on a production build
- [x] Watch and listen to `assets/video/beans-demo-voice-music.mp4` at full speed: DQ approved the track and the voice and music balance
- [x] Landing page plays the version with voice and music, on click only (DQ)
- [ ] Check the ElevenLabs, MiniMax and Stability terms before paid or public use of the audio (DQ)
- [x] Walk `docs/launch/checklist.md` on the merged branch: 47 items met, pricing and HTTPS still open
- [x] Fresh screenshots of every landing and app screen at 1440 and 390, light and dark, with no overflow and no broken images
- [ ] Test on Vercel, Safari, Firefox and with a screen reader

### Onboarding

- [x] First-run onboarding: labels, Brain Dump, choose a day, Timebox, done
- [x] Saved per account, resumes after a reload and on a second device, and can be skipped
- [ ] Run the real Clerk sign-up through onboarding (DQ, see Needs DQ)
- [x] Paywall after first-run setup, with 3 free days and no card as the alternative to the card trial

### Later


- [ ] Desktop app: see "Desktop app, saved for later" in `RESEARCH.md`
- [ ] Calendar accounts, attachments, import and export, notifications

## Done

- 2026-11-02: The paywall now shows the account's saved tasks, "$0 due today" with the trial end date, yearly as $4 a month, where the card goes, and a founder note with DQ's photo. Yearly is selected unless a launch code is running. The paywall page also scrolls now: the app shell's `overflow: hidden` had been cutting it off on short screens. Checked at 1440 and 390 in light and dark.
- 2026-11-02: The paywall moved after first-run setup: a new account plans its first day, then sees "Try Beans free for 7 days" with "Everything you just planned is saved." The paywall also offers 3 free days with no card, once per account; when they end the planner locks to the paywall and the card trial is still available. Server writes are allowed during a never-subscribed account's setup only. 37 Convex, 82 core and 20 web unit tests pass, plus the onboarding and billing browser tests; screens checked at 1440 and 390 in light and dark.
- 2026-11-02: Clerk production moved from `followusai.com` to `beans.followusai.com` (secondary application): Frontend API `clerk.beans.followusai.com`, account portal `accounts.beans.followusai.com`, email from `@beans.followusai.com`. Five new DNS records in Cloudflare, verified; the five old `followusai.com` Clerk records were removed. Convex production's `CLERK_JWT_ISSUER_DOMAIN` and the Google redirect URI follow the new domain.
- 2026-11-02: Google Cloud project "Beans" (`beans-513522`) with its OAuth app (External, app name Beans) for Clerk production's Google sign-in. The Web client "Clerk production" redirects to `https://clerk.beans.followusai.com/v1/oauth_callback`.
- 2026-11-02: Live webhook endpoint `we_1UXTZRDyfH6JDnExkg7amGZv` ("Beans production") sends the six Beans events to the production Convex deployment `avid-mole-890`. DQ deleted the old, unused followusai.com endpoint.
- 2026-11-02: Live Beans portal configuration `bpc_1UXSNWDyfH6JDnExI20FeQYC` made with `scripts/stripe-portal-config.mjs` (DQ ran it) and set in `STRIPE_IDS.live`. Live plan switches now offer only the two Beans plans.
- 2026-11-02: Merged PR #13 (Stripe) and PR #12 (legal) into `claude/billing-and-legal` (DQ). Together they pass typecheck, lint, 135 unit tests, the production build and 42 public-page tests.
- 2026-11-02: Stripe subscriptions on `claude/stripe-billing-27f5b5` (PR into `claude/billing-and-legal`). Paywall before first-run setup, `/pricing`, Settings, Subscription with the Stripe portal, a verified webhook into Convex, launch codes, `docs/BILLING.md`. Test mode is set up in the FollowUs AI account; three sandbox purchases passed (monthly with BEANS100 and a trial, then portal cancel and end, then yearly with a declined card first). 34 Convex, 81 core and 105 browser tests pass.
- 2026-11-02: Matched the terms, privacy and contact pages to the final billing setup from the Stripe session.
- 2026-11-02: Wrote the terms of service, privacy policy and contact page, and added who makes Beans to About. Removed the draft banners. 38 of 38 public-page tests pass on a production build, axe included, and the pages were checked at 1440 and 390 in light and dark with no overflow.

- 2026-11-02: PR #5 merged `claude/beans-v1` into `main` once CI and GitGuardian passed (DQ). The `claude/beans-v1` branch is deleted on GitHub and locally.
- 2026-11-02: Demo audio rebalanced (DQ): voice −23 LUFS and music −22 before ducking, and the music skips its quiet opening notes to start on its first full beat at 2.45 s. Settings live at the top of `scripts/mix-video-audio.mjs`.
- 2026-11-02: Re-rendered the demo video, its three cuts and posters, then re-mixed the approved voice and music (`pnpm video:render`, `pnpm video:mix`). They show the bean now marker and the 60px top bar. The film had been showing first-run onboarding since onboarding landed, so its sample account is now marked onboarded, and its pointer geometry follows the taller top bar. Web cuts stay under 6 MB.
- 2026-11-02: At the foot of the landing page the bean lands on the vine's root (the closing art's soil line on desktop, the vine's tip on phones). The landing page loads `landing.js` on the dev server too, after hydration, so localhost matches production. Fixed a class clash: the bean's wrapper and the analytics chart's bars both used `.stalk`. Landing copy now says a bean marks the current time.
- 2026-11-02: The landing bean rides the vine without `landing.js`, which only ships in production builds, so it works on the dev server too. On desktop CSS places it on the now line; on phones and for the outlines the script is still needed. Fixed CI: the video's caption bar imported the removed leaf marker and now uses the bean. Recaptured the board, Timebox and phone screenshots so they show the new marker and the 60px top bar.
- 2026-11-02: The app's top bar is 60px tall, up from 52 (`--layout-topbar`, DQ). The day and sidebar header rows grow with it, so they still line up. The top-bar profile photo now fills its circle; the button's default padding had shrunk it to a square. The demo video was recorded at 52 and isn't re-rendered.
- 2026-11-02: The landing page's Timebox now bean is the one that rides the vine: a checked-off bean with its sprout, holding at 10:40 until it reaches mid-screen. It passes behind the demo video, the board and the Timebox screenshot, and an outline draws round each from where it goes in to where it comes out. The hero Timebox vine now lines up with the page vine to the pixel (it was 1px right). Checked at 1440 and 375, light and dark; 38 landing tests pass on a production build.
- 2026-11-02: The app's Timebox now marker is the same checked-off bean, centered on the vine.
- 2026-11-02: Settings, Account shows the profile photo and name, and Manage account opens Clerk's profile, where people change their name, photo, email and password. The top bar avatar shows the photo too. Not yet tried with a real Clerk sign-in (see Needs DQ).
- 2026-11-02: Switching to the calendar view closes the right panel; going back to Tasks restores it as it was. Also fixed the right-panel toggle, which had `display: contents` on the button itself and so had no box.
- 2026-11-01: First-run onboarding merged into `claude/beans-v1` (PR #10, DQ). New accounts pick labels, spill tasks into the Brain Dump, choose what goes on today or tomorrow, give tasks a time and land on a populated planner. 15 browser tests, 11 core tests and 4 Convex tests cover finishing, skipping, reloading, a second device, existing accounts, the keyboard, axe in both themes and the phone layout.
- 2026-11-01: Fixed the sign-in and sign-up pages on short screens. The page couldn't scroll, so Clerk's Continue button could end up cut off and out of reach. Removed the duplicate mascot from Clerk's card, and added a test.
- 2026-11-01: Fixed the sign-in reload loop on the local dev server. Next's dev hot reload kept restarting `(app)` pages from a stale `.next/dev` cache. A clean checkout never looped, and neither did builds run alongside dev, so the exact trigger is unknown. Added `pnpm dev:clean`.
- 2026-10-31: The landing page plays the film with voice and music, on click only, with each file under 6 MB. Sound checked in Chromium on the desktop layout and Chrome on the phone layout, and no video loads before pressing play.
- 2026-10-31: Added an AI voiceover (ElevenLabs v3 on Replicate) and music (MiniMax Music 2.6, vocal removed with Demucs), with raw files in `assets/audio` and two cuts in `assets/video`. `pnpm video:mix` rebuilds them. The picture is byte-identical to the silent film. DQ chose take 2 with its vocal removed, and asked for the music to sit closer to the voice.
- 2026-10-31: Launch audit on `claude/beans-v1`. Checklist probed against a production build, all landing and app screens reviewed in both themes at both widths, and the signed-out Clerk path passes under the production CSP. Fixed "1 of 1 tasks" in daily planning. The full sign-up under that CSP still needs DQ's run.
- 2026-10-31: Launch work merged into `claude/beans-v1`. Demo video merged, with the square cut on phones. On the merged result: `pnpm check` passes, 82 browser tests pass in development plus 38 of 38 public-page tests on a production build, and Lighthouse on `next start` (mobile, median of 3) is 100 in all four categories with LCP 1.51 s, CLS 0 and 1.9 KB of JavaScript at last measure. Clerk's test passed before the CSP landed, so it needs one more run.
- 2026-10-31: Landing page merged. Zero framework JavaScript on public pages, plain copy, launch checklist, CSP and markdown negotiation. 15 mascot poses merged and wired into sign-in, Trash and the error page. Fixed the rollover test, which failed on the first of each month.
- 2026-10-31: Clerk sign-in verified end to end against the development instances: sign-up, saving a task across a reload, live sync to a second window, and sign-out (`e2e:clerk`, 3 of 3 passed, run by DQ).
- 2026-10-31: Clerk setup checked. Convex functions pushed to the hosted dev deployment, `CLERK_JWT_ISSUER_DOMAIN` confirmed on it and matching the keys, the `convex` JWT template created in the Clerk development instance, and a test confirms signed-out visitors reach the Clerk form.
- 2026-10-31: Planner moved to `/app`. 50 browser tests and `pnpm check` pass on the local backend.

- 2026-10-31: Phase 5 prep done. `apps/web/vercel.json`, the build-skip script with 7 tests, security headers, and `docs/DEPLOY.md` with every remaining step.

- 2026-10-31: Phase 4 done. A Convex cron runs every 15 minutes and rolls each user's unfinished tasks onto today after their local midnight, then clears Trash older than 30 days. The app also runs it when it opens. Covered by 58 core tests, 12 Convex tests (time zones, idempotence, paging, Trash expiry) and 6 more browser tests (rollover through the backend, actual-time fill, workload limit, undo, template drag, past-midnight warning).

- 2026-10-31: Phase 3 data layer done. Convex schema, `load`, `apply`, `init` and `ensureInstances` functions with 8 `convex-test` unit tests. The app talks to a local Convex backend through the same data hooks, with optimistic updates. 6 browser tests against the real backend cover sign-in redirects, saving, reordering, timeboxing, repeats, Trash, sign-out and live sync between two windows.

- 2026-10-31: Phase 2 done. 37 Playwright tests cover the board, dragging between lists, days and the Timebox, task details, calendar views, Quick Capture, search, filter, focus, timers, settings, Trash, analytics, rituals and the phone layout. Screens checked at 1440 and 390 px in light and dark.
- 2026-10-31: Set up the pnpm workspace with `apps/web`, `packages/tokens` (generated from `DESIGN.md`) and `packages/core` (data model, dates, ordering, repeats, Quick Capture parsing, rollover)
- 2026-10-31: Confirmed Phase 1 planning is complete

- 2026-10-31: Finished product research and planning
- 2026-10-31: Wrote `DESIGN.md` and `RESEARCH.md`
- 2026-10-31: Created the mascot and app icon SVGs
- 2026-10-31: Added the README and published to a private GitHub repo

## Decisions

- 2026-11-02: The paywall selects monthly while a launch code is running and yearly otherwise. No student, teacher or nonprofit discount for now. The founder note uses DQ's own words about why Beans costs what it does. (DQ)
- 2026-11-02: The paywall comes after first-run setup, so people see their plan before paying, as in the Ellie teardown. A no-card 3-day pass is offered from the paywall; when it ends Beans locks to the paywall (not view-only) and the 7-day card trial stays available. (DQ)
- 2026-11-02: Beans lives on `beans.followusai.com`; `followusai.com` hosts other products. Clerk uses the subdomain so its sign-in hosts, account portal and cookies stay under Beans. (DQ)
- 2026-11-02: Beans' Google sign-in uses its own Google Cloud project, not Guppy's, so the consent screen says Beans. Support email `dclouwork@gmail.com`, because this Google account has no organization or group for support@followusai.com; developer contacts dq@followusai.com and dclouwork@gmail.com, as for Guppy (DQ).
- 2026-11-02: Beans costs $6 a month or $48 a year, with a 7-day free trial that needs a card, once per account. After the trial or subscription ends the planner locks to the plans screen and keeps every task. (DQ)
- 2026-11-02: Launch codes BEANS100, BEANS50, BEANS25 (100%, 50%, 25% off the first 3 months; 100, 250, 500 codes; 4, 2, 2 weeks) apply to the monthly plan only, and only to a first subscription. Not LAUNCH100: Vidzilla uses those names on the same Stripe account. (DQ)
- 2026-11-02: The paywall comes right after sign-up, before first-run setup, because the trial needs a card. It isn't an onboarding step.
- 2026-11-02: Monthly and yearly are separate Stripe products so the coupons can't touch yearly, even through a plan switch in the portal.
- 2026-11-02: Refunds are by hand: a full refund within 14 days of a charge, by email to support@followusai.com (DQ, in the terms).
- 2026-11-02: Beans gets its own Stripe portal configuration in live mode instead of sharing Vidzilla's default, so neither app's subscribers see the other's plans when switching. (DQ)
- 2026-11-02: Stripe secrets live only on the Convex deployments. Billing is enforced only where `STRIPE_SECRET_KEY` is set.
- 2026-11-02: Legal pages name FollowUs AI LLC as the operator, with support@followusai.com for all contact (DQ).
- 2026-11-02: Michigan law, courts in Genesee County, small claims allowed, no arbitration clause (DQ).
- 2026-11-02: Refunds: cancel any time and keep access to the end of the period; a full refund on request within 14 days of a charge (DQ).
- 2026-11-02: The privacy policy names only services that are running. PostHog goes in the day it ships; Vercel Analytics is named now (DQ).
- 2026-11-02: Minimum age 13. Account deletion and data copies are by email until the app has buttons for them.
- 2026-11-02: Contact, Privacy and Terms copy lives once in `apps/web/src/marketing/legal.ts`, and both the HTML pages and their markdown versions read it.

- 2026-11-02: The landing bean timeline follows the approved preview (https://claude.ai/artifact/SXrHyqLcwHN1Juh5eQXsT5), and the app's now marker uses the same bean (DQ).
- 2026-10-31: The app is called Beans and lives in the `beans` folder, not `daily-planner`.
- 2026-10-31: Build the web app first, in Next.js. The desktop app is saved for later.
- 2026-10-31: Convex for the database, Clerk for authentication.
- 2026-10-31: No AI integration for now.
- 2026-10-31: Development starts with UI.
- 2026-10-31: The site lives in its own subfolder, and Vercel builds only for changes that affect it.
- 2026-10-31: `DESIGN.md`, `TASKS.md` and `RESEARCH.md` stay in `beans`. Other research material stays outside this repo.

- 2026-10-31: All v1 extras stay in scope. (The earlier call that the site opens on sign-in is replaced by the routes decision below.)
- 2026-10-31: The desktop app, offline mode, AI and integrations stay out of scope for v1.
- 2026-10-31: Every change is a list of small patch ops (`packages/core/src/ops.ts`). The same ops update the screen instantly, give Undo for free, and will feed the desktop outbox later.
- 2026-10-31: Records use a client-made UUIDv7 `id` as their identity, so new items work before the server answers.
- 2026-10-31: Screens use the hooks in `apps/web/src/data`. A lint rule blocks importing Convex anywhere else.
- 2026-10-31: `scripts/check-tokens.mjs` runs with lint and fails on hardcoded colors, sizes, shadows, radii, z-index and easing.
- 2026-10-31: Next.js 16 with `cacheComponents` off. The planner is a client app behind sign-in, so partial prerendering adds nothing yet.
- 2026-10-31: Labels use the 8 palette colors only, no custom color, so text on every label block keeps 4.5:1 contrast.
- 2026-10-31: The label palette fails colorblind separation in charts, so analytics always names each label in text next to its bar, and has a table view.
- 2026-10-31: Daily planning and wrap-up apply moves as you go instead of on Finish. Leaving early asks first and says that changes are kept.
- 2026-10-31: Keyboard shortcuts can't be rebound in v1. The reference lists them, and single keys only fire when no field has focus.
- 2026-10-31: Tab only switches Calendar and Tasks when nothing has focus, so it still moves focus for keyboard users.
- 2026-10-31: A timebox with no estimate shows as 30 minutes. Clicking an empty slot makes a 15 minute task.
- 2026-10-31: The All Day row is left out until calendar accounts arrive, since tasks have no all-day state.
- 2026-10-31: The phone layout shows one day with tabs for Brain Dump, the day and its Timebox, plus a Quick Capture button.
- 2026-10-31: Convex stores every record with `userId` (the token identifier) and the client-made `clientId`. One `apply` mutation takes the same patch ops the client used, validated per table, so the optimistic copy and the database can't drift.
- 2026-10-31: The planner loads settings, lists, labels, templates, repeats, undated tasks, Trash and the last 120 days of dated tasks. Scrolling further back widens the window.
- 2026-10-31: Local development and tests use a test-only sign-in: the Next dev server signs short-lived JWTs that the local Convex backend trusts. Production can't use it: its routes return 404 in production builds (checked), the client only offers it in development builds, and Convex only reads its issuer when `CLERK_JWT_ISSUER_DOMAIN` is `none` and only accepts a localhost issuer.
- 2026-10-31: `/app?sample` opens the planner on sample data in development builds, so the UI tests don't need a backend.
- 2026-10-31: Pages check sign-in themselves, as Clerk now recommends, and `proxy.ts` only runs `clerkMiddleware()` when Clerk keys are set.
- 2026-10-31: Card hover controls float over the card's corner instead of adding a row, so hovering never shifts the cards below. Found while testing: the shift made clicks land on the wrong element.
- 2026-10-31: Dropping on the Timebox puts the board's scroll back where it was, since passing the board's edge can scroll the days.
- 2026-10-31: Rollover runs from a 15-minute cron so zones with half-hour offsets roll soon after midnight. It records `lastRollover` per user, so repeats are harmless, and the app runs it on open in case the cron hasn't reached that user yet.
- 2026-10-31: Rolled tasks lose their timebox time and keep their order, and carry `rolledFrom` for the "Rolled over" tag.
- 2026-10-31: Trash cleanup runs with each user's daily rollover and also removes trashed lists, templates and repeats after 30 days.
- 2026-10-31: "Start the next task" moves a running timer to the next unfinished task of the same day when one is checked off.
- 2026-10-31: The build-skip script lives in `apps/web/scripts/` so its watched paths read relative to the Root Directory. When it can't compare commits, it builds.
- 2026-10-31: The Vercel build runs `npx convex deploy --cmd` from the repo root, so Convex functions and the web app ship together with a matching `NEXT_PUBLIC_CONVEX_URL`.

- 2026-10-31: The landing page lives at `/` and the planner moves to `/app`. Sign-in and sign-up keep their paths. Clerk and Convex providers sit in the `(app)` route group's layout, so marketing pages ship neither.
- 2026-10-31: Marketing pages get two sizes above the five planner sizes (`--text-title`, `--text-display`) and their own layout steps. The planner keeps the five.
- 2026-10-31: `pnpm backend:setup` refuses to run against a hosted Convex deployment, because it sets `CLERK_JWT_ISSUER_DOMAIN` to `none`. Use a separate worktree for the local backend.

- 2026-10-31: Marketing pages use the Pages Router with no runtime JavaScript, not `app/(marketing)`, because the App Router ships 179 KB gzipped on an empty page and the budget is 70 KB. This overrides the original brief's folder layout to keep its budget. DQ can reverse it.
- 2026-10-31: One full-color favicon in every browser theme, no monochrome variant. It read well on all tab colors checked, and a silhouette lost the character.
- 2026-10-31: The landing page video has sound, and starts only when someone presses play. (DQ)
- 2026-10-31: The demo video uses MiniMax take 2 with its vocal removed. The version with the vocal is never to ship, because its words are unknown. (DQ)
- 2026-10-31: The launch work merges into `claude/beans-v1`, not a separate PR into `main`. PR #5 carries it all. (DQ)
- 2026-10-31: Marketing copy leads with plain words that say what Beans does. Garden wordplay stays where the words or screen around it make the meaning clear, such as the empty Brain Dump, and never stands alone. The social image says "Turn your to-do list into a plan for today." and "Beans is a daily planner." (DQ)
- 2026-10-31: DQ approved the hero pose (`assets/illustrations/hero.png`) for the landing page.
- 2026-10-31: Clerk test accounts can't be created by the agent, so the real sign-up test is DQ's to run.
- 2026-11-01: Onboarding has five steps: labels, Brain Dump, choose a day, Timebox, done. Every question has to change the planner, so there's no role or feelings question, no spotlight tour, no settings questions and no paywall in this phase. (DQ)
- 2026-11-01: Onboarding state lives in settings as `onboarding`. Only `init` writes it, so accounts made earlier have no value and read as finished, with no migration.
- 2026-11-01: Onboarding saves each tap as it happens, like daily planning, so there's no draft to lose. Skipping keeps what was added and doesn't come back.
- 2026-11-01: Adding an onboarding step means adding its id to `ONBOARDING_STEPS` and its screen in `Onboarding.tsx`.
- 2026-11-01: Removing a task during onboarding deletes it for good instead of sending it to Trash, because it only undoes the add a moment earlier.

### Saved for the desktop app

- 2026-10-31: Electron for Windows and Mac, released unsigned at first.
- 2026-10-31: Desktop stores data locally and works offline. Convex doesn't sync while offline; all changes are sent once the computer is back online.
- 2026-10-31: All data stays in sync between desktop and web through Convex.

## Things DQ might want to fix

Found during the launch reviews. None of these block the merge. Delete a line once it's fixed or you decide to leave it.

**Demo video**

- The intro is the least lively part: only a small hop, and the mascot is smaller than the code-drawn version.
- The timer and check-off zooms crop content at the left edge.
- The dark soil line in the midnight scene has low contrast.
- The vertical cut's Quick Capture scene has a large dimmed empty area.
- At 67.8 seconds it runs past Product Hunt's 60-second preview and the 30 to 45 seconds short feeds favor. There's no shorter cut.
- MiniMax ignored the instrumental setting on take 2, so its vocal was removed afterward. Listen for faint ghost singing from 0:21 on.
- The vertical cut and the 1920 social cut are still silent.
- Line 3 starts about 0.9 s after its caption, because the two lines before it run long.

**Landing page**

- The hero demo shows estimates such as 0:15, while the real screenshot further down shows 0:00 for the same tasks.
- The approved hero pose sits at the bottom of the page, not in the top hero, which is the live demo.
- The workflow and "How a day goes" are one timeline, not two sections.
- There's empty space under the hero's task columns, next to the taller Timebox.
- The video poster on phones is a busy mid-film frame, and the player controls cover its caption.
- The video starts on click only, with no autoplay when it comes into view.

**Mascot art**

- Hero pose: the bean going into the ground reads small, and the 2x copy is slightly soft.
- `welcome`: the watering can floats, because the mascot has no arms.
- `analytics`: the basket is more detailed than the other poses.
- `phone`: on model, but plain.

**App**

- Sign-in shows two greetings: ours above Clerk's card, which has its own heading. Clerk's heading stays because it labels the email code step.
- Clerk's input fields have almost no visible edge in dark mode.
- After Empty Trash, the earlier "Moved to Trash" toast with Undo stays next to "Trash emptied".
- `app/(app)/error.tsx` can't catch a Clerk or Convex provider failure in the layout. That would need `global-error`.
- App routes use `'unsafe-inline'` for scripts in the CSP. Nonces would force dynamic rendering. Public pages have no inline scripts.
- `viewport.themeColor` isn't set, and the manifest's theme color is light only.

## Open decisions

None right now.

## Needs DQ

Steps only DQ can do. Filled in as phases finish.

- **Live webhook secret**: reveal the signing secret of "Beans production" in Stripe (Workbench, Webhooks) and set it with `npx convex env set --prod STRIPE_WEBHOOK_SECRET 'whsec_…'`. The live key is already set on production.
- **Dev Stripe (test mode)**: set a `rk_test_…` key on the dev deployment, enable the test webhook endpoint `we_1UXOyBDyfH6JDnExIerJxiQb` and set its secret, as `docs/BILLING.md` lists.
- **Live launch code**: on launch day, add promotion code `BEANS100` to the live "Launch offer" coupon with 100 uses and a 4-week end date (`docs/BILLING.md`, Start a round).
- **Comp your own account**: setting the Stripe key turns the paywall on for existing accounts too.
1. **Clerk sign-up asks for a password as well as an email code.** That differs from `docs/DEPLOY.md`, which says email codes and Google. Keep it, or turn off the password in the Clerk dashboard.
2. **Create the Convex project** and its production deployment, set `CLERK_JWT_ISSUER_DOMAIN` there, and make a production deploy key (and a preview key if you want previews). Steps in `docs/DEPLOY.md`.
3. **Create the Vercel project** from the GitHub repo with Root Directory `apps/web`, keep "Include files outside the root directory" on, and add the environment variables listed in `docs/DEPLOY.md`. Then deploy.
4. **Set up the production Clerk instance**: domain, DNS records and Google OAuth credentials.
5. **Optional:** real Organization details for JSON-LD. The contact address is support@followusai.com.
6. **Decide pricing.** The pricing page stays out until then.
7. **Set `NEXT_PUBLIC_SITE_URL`** to the production domain on Vercel, then check HTTPS on the live domain.
8. **Upload the brand logos**: `assets/brand/clerk-logo.png` to the Clerk application, `assets/brand/google-oauth-logo.png` to the Google consent screen, and `assets/brand/github-social-preview.png` to GitHub (repo settings, Social preview).
9. **Read the terms and privacy policy** (`/terms`, `/privacy`) before public release. They're written but not reviewed by a lawyer. Choices made for you: Beans refunds the unused time if it ever shuts down, gives 30 days' notice of price changes and 14 days' notice of term changes, caps liability at the greater of 12 months' fees and $50, and aims to answer email within one business day.
10. **Try onboarding with a real sign-up.** Agents can't create Clerk accounts, so `e2e:clerk` hasn't been run since onboarding landed. Its sign-up test now skips onboarding. Run `pnpm --filter @beans/web e2e:clerk`, then sign up once by hand and walk the five steps.
11. **Delete merged phase branches.** This session's git access can't delete remote branches (tried three times; the push is refused). Please delete `claude/phase-2-web-ui` on GitHub, and the later phase branches once their PRs merge.
12. **Try Manage account with a real sign-in.** Agents can't sign in to Clerk. Open Settings, Account, press Manage account, change the name and photo, and check the top bar avatar updates.
