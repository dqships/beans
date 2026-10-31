<p align="center">
  <img src="assets/logo/beans-mascot.svg" alt="Beans mascot" width="140">
</p>

# Beans

A daily planner that keeps your tasks, your week and your hours in one place. Capture everything in a Brain Dump, plan it across your days, then drag tasks onto the Timebox to give them a time.

**Status:** planning is done, and no app code exists yet. Next is Phase 2 in [TASKS.md](TASKS.md).

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
apps/web/         Next.js app (from Phase 2)
packages/tokens/  Design tokens (from Phase 2)
convex/           Schema and server functions (from Phase 3)
```

## Getting started

Setup steps will be added here in Phase 2, once the app exists.
