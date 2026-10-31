<p align="center">
  <img src="assets/logo/beans-mascot.svg" alt="Beans mascot" width="140">
</p>

# Beans

A daily planner that keeps your tasks, your week and your hours in one place. Capture everything in a Brain Dump, plan it across your days, then drag tasks onto the Timebox to give them a time.

**Status:** the web UI runs on sample data. Accounts and saved data come next, in Phase 3 of [TASKS.md](TASKS.md).

## What it will do

- Capture tasks in a Brain Dump and in lists
- Plan on an endless board with one column per day
- Timebox tasks on a calendar with drag and drop
- Track estimates and actual time, with a timer and Pomodoro
- Roll unfinished tasks forward each day

The full feature list is in [RESEARCH.md](RESEARCH.md).

## Stack

| Part | Choice |
|---|---|
| App | Next.js, React, TypeScript |
| Data | Convex |
| Sign-in | Clerk |
| Hosting | Vercel, with `apps/web` as the Root Directory |

A desktop app is planned for later.

## Project docs

| File | Contents |
|---|---|
| [DESIGN.md](DESIGN.md) | Design system. Read it before building or changing any screen. |
| [RESEARCH.md](RESEARCH.md) | Architecture, feature scope and the saved desktop plan |
| [TASKS.md](TASKS.md) | Phases, progress, decisions and open questions |

## Repo layout

```text
assets/logo/      Mascot and app icon
apps/web/         Next.js app
packages/tokens/  Design tokens, generated from DESIGN.md
packages/core/    Data model and planner logic shared by every screen
convex/           Schema and server functions (from Phase 3)
scripts/          Repo checks, such as the token check
```

## Getting started

You need Node 22 and pnpm 10 (`corepack enable` sets up pnpm).

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:3000. The planner starts with sample data that lives only in the browser tab.

### Checks

```bash
pnpm check
```

That regenerates tokens, then runs typecheck, lint (with the token check), unit tests and a production build.

End-to-end tests drive the app in Chromium:

```bash
pnpm --filter @beans/web e2e
```

After editing `DESIGN.md`, run `pnpm tokens` to regenerate the token files.
