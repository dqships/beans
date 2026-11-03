# Beans research

Technical plan and findings, 2026-10-31.

## Summary

- Beans starts as a web app built in Next.js, with Convex for data and Clerk for sign-in.
- The planner needs a live connection for now. That keeps the first version much simpler.
- The desktop app is saved for later. Its plan is at the end of this file, and the web build keeps that path open.

## Architecture

### Repo layout

```text
beans/
  apps/
    web/          Next.js app, Vercel Root Directory
  packages/
    tokens/       Design tokens from DESIGN.md
  convex/         Schema and server functions
  assets/
```

- **Tools:** pnpm workspaces, TypeScript, Next.js App Router, React.
- **UI libraries:** dnd-kit for dragging, Tiptap for notes, chrono-node for Quick Capture dates, rrule for repeats, Motion for the spring.
- The web app sits in `apps/` so a desktop app can sit beside it later.

### Next.js

- Sign-in and account routes are handled by Clerk. The planner itself is a set of client components behind sign-in, because it's highly interactive.
- Keep planner screens free of Next-specific imports where practical, so they can move to a shared package when the desktop app starts.
- Figtree loads through `next/font`, which self-hosts it.
- Beans needs a phone layout on the web. Plan: one day at a time, with tabs for Brain Dump, Today and Timebox.

### Data

- Screens read Convex queries and write through Convex mutations.
- Dragging, checking off and reordering use optimistic updates, so they feel instant.
- Screens call a thin set of data hooks, never Convex directly. A local database can then slot in behind those hooks for the desktop app.

### Convex tables

All tables are scoped by user ID and carry `clientId`, `updatedAt` and `deletedAt`. These fields aren't all needed yet, but adding them now avoids a migration when offline support arrives.

`tasks`, `subtasks`, `lists`, `labels`, `templates`, `recurringSeries`, `attachments`, `timeEntries`, `userSettings`.

| Case | Rule |
|---|---|
| Deletes | Soft delete with `deletedAt`, which feeds the 30-day Trash |
| Rollover | A scheduled Convex job checks each user's local midnight, and is safe to repeat |
| Repeating tasks | Each instance is keyed by series plus date, so duplicates can't appear |
| Time zone | Store each user's zone in `userSettings` |

### Clerk

- Use `@clerk/nextjs`.
- Wrap the app in `ClerkProvider`, with `ConvexProviderWithClerk` inside a client component.
- Add `convex/auth.config` with the Clerk issuer domain.
- Check the current Clerk and Convex docs during setup, because the examples I found were partly dated.

### Vercel

- Project Root Directory: `apps/web`.
- Add `scripts/vercel-ignore-build.mjs` and `ignoreCommand` there, following the build-skip playbook.
- `watched`: `.`, `../../packages`, `../../convex`, `../../pnpm-lock.yaml`, `../../pnpm-workspace.yaml`, `../../package.json`.
- `claude/` and `codex/` previews always skip, so verify those branches locally.
- The build needs to deploy Convex functions too, using `npx convex deploy --cmd` with `CONVEX_DEPLOY_KEY`. Confirm the exact command for a monorepo during setup.

### Keyboard shortcuts on the web

Browsers reserve some keys, so a few shortcuts must avoid them. Cmd+L, Cmd+T, Cmd+N and Cmd+W aren't safe to use. Prefer single keys such as Q, C and S, which only fire when no text field has focus.

## Feature scope

| Tier | Features |
|---|---|
| **v1 core** | Brain Dump, lists, infinite day board, tasks, task details, notes, subtasks, labels, estimates, actual time, Timebox, week calendar, drag and drop, rollover, repeats, search, filter, Trash and undo, light and dark, keyboard shortcuts, phone layout |
| **v1 extras** | MCP server for people's own AI apps (`docs/ideas/mcp.md`), Focus mode, Quick Capture, count-up timer, Pomodoro, due dates, priority, templates, daily planning and shutdown, analytics, optional feature toggles |
| **Later** | Desktop app, calendar accounts, attachments, data import and export, notifications |
| **Out for now** | AI inside the app, email to task, Slack, Notion, Todoist, Zapier, mobile apps |

## Quality goals

- Quick Capture accepts multi-word labels.
- Warn when a timebox runs past midnight or the visible day.
- Stopping a repeat clears its icon and every sign of it repeating.
- Bulk selection also works in the calendar.

## Desktop app, saved for later

An Electron app for Windows and Mac, stored locally so it works offline.

### Offline and sync

**Rule, decided 2026-10-31:** Convex doesn't sync while offline. The desktop app keeps working from local data, and every change is sent to Convex once the computer is back online.

Convex has no confirmed built-in offline mode: its object sync engine was described as in progress, and I found no release announcement. PowerSync's Convex support is marked experimental and adds another service. Recheck both before starting, then default to a small sync layer of our own:

1. The UI reads only from a local database, using Dexie over IndexedDB.
2. Each edit writes the data and an outbox entry in one local transaction.
3. When online and signed in, a worker sends outbox entries to Convex in order. Each has a unique ID, so a retry can't apply twice.
4. A Convex subscription brings in changes from other devices since the last sync point.
5. A small status control shows Synced, Offline, or how many changes are waiting.

| Case | Rule |
|---|---|
| New items while offline | The client creates the ID (UUIDv7) |
| Same field edited on two devices | Latest edit wins per field |
| Rollover | Runs on the device and is safe to repeat |
| Attachments | Stored locally, uploaded on reconnect after their task syncs |
| Sign out with unsent changes | Warn first |
| Online check | Use Convex's connection state, not just the browser's online flag |

### Desktop-only features

Floating timer window, menu bar timer and agenda, and global shortcuts for showing Beans and Quick Capture.

### Clerk on desktop

- Clerk's Electron SDK and OAuth deep links are beta. Sign-in happens in the system browser and returns by a custom URL scheme.
- Deep links only work in packaged builds on macOS and Linux, and Windows needs Electron's single-instance lock.
- Keep the last signed-in user locally so the app opens offline.

### Unsigned release

- Build with electron-builder and publish to GitHub Releases.
- macOS: Squirrel.Mac requires a signed app, so auto-update is out. Use a new-version prompt with a download link.
- macOS users must approve the first launch manually, and Apple Silicon apps need at least an ad-hoc signature. Confirm the steps on a clean Mac.
- Windows shows a SmartScreen warning on first run.
- Apple Developer ID signing and notarization unlock auto-update later.

Beans isn't shipping through a store. If that changes, follow the store folder playbook.

## Sources

- [Clerk: Next.js and Convex](https://clerk.com/docs/nextjs/convex)
- [Convex: object sync engine](https://stack.convex.dev/object-sync-engine)
- [PowerSync: Convex support announcement](https://releases.powersync.com/announcements/ann_ZLQJV3dnA4HR0)
- [Clerk: Electron SDK overview (beta)](https://clerk.com/docs/reference/electron/overview)
- [Clerk: OAuth deep links for Electron (beta)](https://clerk.com/docs/guides/configure/auth-strategies/oauth-deep-links)
- [Electron: code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [electron-builder issue 2399: Squirrel.Mac needs a signed app](https://github.com/electron-userland/electron-builder/issues/2399)
