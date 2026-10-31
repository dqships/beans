# Beans tasks

## Now

Phase 1, planning, is finished. Phase 2, the web UI with sample data, is done and verified. Next is Phase 3: accounts and data.

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

- [ ] Clerk sign-in with `@clerk/nextjs`
- [ ] Convex schema and functions, connected to Clerk
- [ ] Data hooks between the screens and Convex
- [ ] Optimistic updates for dragging, checking off and reordering
- [ ] Test: changes appear live in a second browser window

### Phase 4: Planner behavior

- [ ] Scheduled rollover at each user's local midnight
- [ ] Repeats, templates, actual-time fill, workload limit
- [ ] Trash with undo and 30-day expiry
- [ ] Unit tests for dates, rollover and repeats

### Phase 5: Launch

- [ ] Deploy to Vercel with Root Directory `apps/web`
- [ ] Add the build-skip script and confirm a non-web change skips the build
- [ ] Deploy Convex production through the Vercel build
- [ ] Set up the production Clerk instance
- [ ] Legal review before public release

### Later

- [ ] Desktop app: see "Desktop app, saved for later" in `RESEARCH.md`
- [ ] Calendar accounts, attachments, import and export, notifications

## Done

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

- 2026-10-31: The site opens on sign-in; a landing page comes later. All v1 extras stay in scope.
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

### Saved for the desktop app

- 2026-10-31: Electron for Windows and Mac, released unsigned at first.
- 2026-10-31: Desktop stores data locally and works offline. Convex doesn't sync while offline; all changes are sent once the computer is back online.
- 2026-10-31: All data stays in sync between desktop and web through Convex.

## Open decisions

None right now. Both earlier questions were answered: the site opens on sign-in, and all v1 extras stay in scope.

## Needs DQ

Steps only DQ can do. Filled in as phases finish.
