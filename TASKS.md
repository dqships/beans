# Beans tasks

## Now

Phase 1, planning, is finished. Phase 2 (web UI) is done and verified. Phase 3 (accounts and data) is done. Phase 4 (planner behavior) is done. Phase 5 launch prep is done on the repo side; creating services and deploying is for DQ, listed under Needs DQ. The PR from `claude/beans-v1` into `main` is ready for review.

The Launch phase is running on `claude/beans-launch`. See `docs/launch/PLAN.md`.

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
- [ ] Brand asset files
- [ ] Mascot poses and illustrations
- [ ] Landing page
- [ ] Demo video
- [ ] Launch audit and PR into `main`

### Later

- [ ] Desktop app: see "Desktop app, saved for later" in `RESEARCH.md`
- [ ] Calendar accounts, attachments, import and export, notifications

## Done

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
- 2026-10-31: Clerk test accounts can't be created by the agent, so the real sign-up test is DQ's to run.

### Saved for the desktop app

- 2026-10-31: Electron for Windows and Mac, released unsigned at first.
- 2026-10-31: Desktop stores data locally and works offline. Convex doesn't sync while offline; all changes are sent once the computer is back online.
- 2026-10-31: All data stays in sync between desktop and web through Convex.

## Open decisions

None right now.

## Needs DQ

Steps only DQ can do. Filled in as phases finish.

1. **Clerk sign-up asks for a password as well as an email code.** That differs from `docs/DEPLOY.md`, which says email codes and Google. Keep it, or turn off the password in the Clerk dashboard.
2. **Create the Convex project** and its production deployment, set `CLERK_JWT_ISSUER_DOMAIN` there, and make a production deploy key (and a preview key if you want previews). Steps in `docs/DEPLOY.md`.
3. **Create the Vercel project** from the GitHub repo with Root Directory `apps/web`, keep "Include files outside the root directory" on, and add the environment variables listed in `docs/DEPLOY.md`. Then deploy.
4. **Set up the production Clerk instance**: domain, DNS records and Google OAuth credentials.
5. **Legal review** before public release: privacy policy, terms, and what Clerk and Convex store.
6. **Review and merge the PR** from `claude/beans-v1` into `main`.
7. **Delete merged phase branches.** This session's git access can't delete remote branches (tried three times; the push is refused). Please delete `claude/phase-2-web-ui` on GitHub, and the later phase branches once their PRs merge.
