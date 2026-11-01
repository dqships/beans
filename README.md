<p align="center">
  <img src="assets/logo/beans-mascot.svg" alt="Beans mascot" width="140">
</p>

# Beans

A daily planner that keeps your tasks, your week and your hours in one place. Capture everything in a Brain Dump, plan it across your days, then drag tasks onto the Timebox to give them a time.

**Status:** the planner saves to Convex and syncs live across windows. Clerk sign-in is set up on development instances. See [TASKS.md](TASKS.md).

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
| [docs/DEPLOY.md](docs/DEPLOY.md) | Vercel, Convex and Clerk setup for deploying |

## Repo layout

```text
assets/logo/      Mascot and app icon
apps/web/         Next.js app
packages/tokens/  Design tokens, generated from DESIGN.md
packages/core/    Data model and planner logic shared by every screen
convex/           Schema and server functions
scripts/          Repo checks, such as the token check
```

## Getting started

You need Node 22 and pnpm 10 (`corepack enable` sets up pnpm).

```bash
pnpm install
```

### Run it with a local database (no accounts needed)

This starts a local Convex backend and turns on a test sign-in that only exists in development builds. The script stops if the clone's `.env.local` points at a hosted Convex deployment, because it switches off Clerk on the deployment it runs against. Use a separate worktree in that case.

```bash
pnpm backend:setup
```

```bash
pnpm convex:dev
```

In a second terminal:

```bash
pnpm dev
```

Open http://localhost:3000/sign-in, sign in with any name, and your tasks are saved locally. Open a second window to see changes sync live.

### Run it on sample data only

Without a Convex URL in `apps/web/.env.local`, `pnpm dev` opens the planner on sample data that lives only in the browser tab. The planner is at http://localhost:3000/app. With a backend set up, http://localhost:3000/app?sample does the same.

### Use real Clerk sign-in

1. Create a Clerk application and copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Fill in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CONVEX_URL`, and remove the test sign-in lines.
3. Turn on Clerk's Convex integration and set its Frontend API URL on Convex: `npx convex env set CLERK_JWT_ISSUER_DOMAIN <url>`.

### Rebuild the brand files

```bash
pnpm assets
```

That rewrites every icon, social image and upload logo from `assets/logo/` and the design tokens, plus `apps/web/src/app/manifest.ts`. Commit the results. The list of files is in [docs/launch/assets.md](docs/launch/assets.md).

### Checks

```bash
pnpm check
```

That regenerates tokens, then runs typecheck, lint (with the token check), unit tests and a production build.

End-to-end tests drive the app in Chromium. With the local backend running (see above):

```bash
pnpm --filter @beans/web e2e
```

To test real Clerk sign-in, with development keys in `apps/web/.env.local` and the Convex functions pushed to that deployment:

```bash
pnpm --filter @beans/web e2e:clerk
```

It signs up a `+clerk_test` user and deletes it afterwards. It only accepts development keys, and skips when there are none.

After editing `DESIGN.md`, run `pnpm tokens` to regenerate the token files.
