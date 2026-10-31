# Beans tasks

## Now

Planning is done. Next is Phase 2: build the web UI with sample data.

- [ ] Review `DESIGN.md` and the mascot
- [ ] Answer the open decisions below
- [ ] Set up pnpm workspaces, Next.js in `apps/web`, and `packages/tokens`

## Plan

### Phase 2: Web UI with sample data

- [ ] Token files generated from `DESIGN.md`, plus Figtree through `next/font` and Phosphor icons
- [ ] App shell: top bar, sidebar, board, Timebox, panel toggles
- [ ] Task card, composer and task details with every picker
- [ ] Drag between lists, days and the Timebox
- [ ] Calendar view: day, week, month
- [ ] Focus mode, search, filter, Quick Capture, shortcut reference
- [ ] Timer and Pomodoro UI
- [ ] Settings, optional features, daily planning and shutdown, analytics, Trash
- [ ] Bean checkbox, leaf now marker, leaf timer ring, empty states
- [ ] Phone layout
- [ ] Check all screens in light and dark, at desktop and phone widths

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

### Saved for the desktop app

- 2026-10-31: Electron for Windows and Mac, released unsigned at first.
- 2026-10-31: Desktop stores data locally and works offline. Convex doesn't sync while offline; all changes are sent once the computer is back online.
- 2026-10-31: All data stays in sync between desktop and web through Convex.

## Open decisions

1. **Does the site need a public landing page at launch?** Default: open on sign-in, and add a landing page later.
2. **Which v1 extras can wait?** Default: build everything in the v1 extras row of `RESEARCH.md`.
