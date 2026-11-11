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

## Routes

| Path | What | Router |
|---|---|---|
| `/` | Landing page | Pages (`apps/web/src/pages/`) |
| `/about`, `/contact`, `/privacy`, `/terms` | Plain marketing pages | Pages |
| `/tools`, `/tools/<name>` | Free tools: timers, planners and time calculators (`apps/web/src/tools/`) | Pages |
| `/app` | Planner behind sign-in | App, `(app)` route group |
| `/sign-in`, `/sign-up` | Clerk | App, `(app)` route group |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt` | Crawler files | App |
| Anything else | 404 | App, `not-found.tsx` |

Marketing pages use the Pages Router with `unstable_runtimeJS: false`, so they ship no framework JavaScript. Their only script is `apps/web/public/landing.js`, which loads in production builds. The free tools are the exception: each tool's page hydrates so the tool can run, under a policy that still allows scripts from this site only (`toolsPolicy` in `apps/web/src/lib/csp.ts`). They load no Clerk or Convex, and what you type stays in the browser. Clerk runs only on `/app`, `/sign-in`, `/sign-up`, `/api` and `/__clerk`. `proxy.ts` also answers `Accept: text/markdown` on public pages, and sends their anonymous page views to PostHog from the server (`docs/DEPLOY.md`, "PostHog").

## Repo layout

```text
assets/logo/      Mascot and app icon
apps/web/         Next.js app
apps/video/       Remotion demo film, drawn from the real planner components
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

### If a page keeps reloading in development

A stale Turbopack cache can make `next dev` restart a page in a loop. The terminal shows the same `GET` and `Compiled` lines over and over. Stop the server and clear the cache:

```bash
pnpm dev:clean
```

### Checks

```bash
pnpm check
```

That regenerates tokens, then runs typecheck, lint (with the token check), unit tests and a production build.

The marketing tests check production behavior, such as loading no framework JavaScript, so run them against a production build:

```bash
pnpm --filter @beans/web build
pnpm --filter @beans/web exec next start --port 3103
E2E_URL=http://localhost:3103 pnpm --filter @beans/web exec playwright test e2e/marketing.spec.ts
```

To remake the product screenshots in `apps/web/public/product/`, run a dev server on sample data on port 3103, then `pnpm --filter @beans/web capture`.

End-to-end tests drive the app in Chromium. With the local backend running (see above):

```bash
pnpm --filter @beans/web e2e
```

To test real Clerk sign-in, with development keys in `apps/web/.env.local` and the Convex functions pushed to that deployment:

```bash
pnpm --filter @beans/web e2e:clerk
```

It signs up a `+clerk_test` user and deletes it afterwards. It only accepts development keys, and skips when there are none.

To rebuild the demo video's voice and music cuts from the raw files in `assets/audio`, including the landing page's files (needs ffmpeg). Run this after `pnpm video:render`, which writes those files without sound:

```bash
pnpm video:mix
```

After editing `DESIGN.md`, run `pnpm tokens` to regenerate the token files.

### Demo video

```bash
pnpm video:render
```

That renders the film in all three shapes from code, then writes the web copies, poster and captions to `apps/web/public/video/`. Masters land in `apps/video/out/`, which is git-ignored. It needs `ffmpeg` with `libx264`, `libvpx-vp9` and `libsvtav1`, and takes a few minutes. `pnpm --filter @beans/video studio` opens the film in Remotion Studio on port 3104.

How the film is built, and its script, are in [docs/launch/video.md](docs/launch/video.md).

## License

The code is under the [MIT License](LICENSE). The Beans name, logo, mascot, illustrations, demo film and audio are not: they stay all rights reserved, so a fork needs its own name and artwork. [TRADEMARKS.md](TRADEMARKS.md) lists what that covers.

Third-party code and fonts keep their own licences. Note that `apps/video` uses Remotion, which has its own license for companies. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
