# Beans asset manifest

Every image, pose and video file. Paths and dimensions below are fixed contracts, so pages can be built before the files exist. Each workstream edits only its own section: fill in the Status column, and add a row for anything extra.

## 1. Brand files (workstream 1)

Built from `assets/logo/beans-mascot.svg` and `assets/logo/beans-app-icon.svg` by `pnpm assets`.

| File | Size | Used by | Status |
|---|---|---|---|
| `apps/web/src/app/favicon.ico` | 16, 32, 48 | Browsers | |
| `apps/web/src/app/icon.svg` | Vector | Browsers | |
| `apps/web/src/app/icon.png` | 512×512 | Browsers | |
| `apps/web/src/app/apple-icon.png` | 180×180, opaque paper background | iOS home screen | |
| `apps/web/public/brand/pwa-192.png` | 192×192 | `manifest.ts` | |
| `apps/web/public/brand/pwa-512.png` | 512×512 | `manifest.ts` | |
| `apps/web/public/brand/pwa-maskable-512.png` | 512×512 with safe zone | `manifest.ts` | |
| `apps/web/public/social/og-image.png` | 1200×630 | Open Graph | |
| `apps/web/public/social/twitter-image.png` | 1200×630 | Twitter card | |
| `apps/web/public/brand/mascot-1x.png`, `mascot-2x.png` | 256, 512 wide | Email, docs | |
| `apps/web/public/brand/mascot.webp`, `mascot.avif` | 512 wide, transparent | Web | |
| `assets/brand/clerk-logo.png` | 512×512 | Clerk application logo, upload by DQ | |
| `assets/brand/google-oauth-logo.png` | 120×120 | Google consent screen, upload by DQ | |
| `assets/brand/github-social-preview.png` | 1280×640 | GitHub social preview, upload by DQ | |

The OG and Twitter images use stable `public/` paths, because both App Router and Pages Router pages point at them.

## 2. Mascot poses (workstream 2)

Web copies: `apps/web/public/illustrations/<name>@1x.avif`, `<name>@1x.webp`, `<name>@2x.avif`, `<name>@2x.webp`, each under 60 KB. Sources: `assets/illustrations/<name>.png`. The sizes below are the 1x sizes in CSS pixels; the 2x files are double.

| Name | 1x size | Pose | Used by | Alt text | Status |
|---|---|---|---|---|---|
| `hero` | 800×600 | Planting a bean in a neat row | Landing hero | | |
| `brain-dump` | 640×480 | Spilling beans out of a seed packet | Landing | | |
| `planning` | 640×480 | Arranging beans along garden rows | Landing | | |
| `timebox` | 640×480 | Climbing a beanstalk with leaf markers | Landing | | |
| `focus` | 640×480 | Sitting still under a leaf, timer ring nearby | Landing | | |
| `rollover` | 640×480 | Asleep under a crescent moon while tasks roll to the next row | Landing, video | | |
| `analytics` | 640×480 | A small harvest basket | Landing | | |
| `phone` | 480×480 | Peeking over a phone-sized seed packet | Landing | | |
| `welcome` | 480×480 | Sign-in welcome | Sign-in, sign-up | | |
| `404` | 640×480 | Digging and finding nothing | 404 page | | |
| `error` | 480×480 | Error | App error page | | |
| `empty-trash` | 480×480 | Empty Trash | Trash drawer | | |
| `email-header` | 600×200 | Email header | Emails | | |
| `video-intro` | 960×540 | Video intro | Video | | |
| `video-outro` | 960×540 | Video outro | Video | | |

Poses built in code from `apps/web/src/ui/garden.tsx` count, as long as the files above exist. Note in Status which poses are code-drawn and which are generated.

## 3. Product screenshots (workstream 3)

Real app on sample data, remade by a committed capture script.

| File | Size | Used by | Status |
|---|---|---|---|
| `apps/web/public/product/board-light@1x.avif` and `.webp`, `@2x` | 1200×750 | Landing | |
| `apps/web/public/product/board-dark@1x.avif` and `.webp`, `@2x` | 1200×750 | Landing | |
| `apps/web/public/product/timebox-light@1x.avif` and `.webp`, `@2x` | 560×700 | Landing | |
| `apps/web/public/product/timebox-dark@1x.avif` and `.webp`, `@2x` | 560×700 | Landing | |
| `apps/web/public/product/phone-light@1x.avif` and `.webp`, `@2x` | 390×844 | Landing | |
| `apps/web/public/product/phone-dark@1x.avif` and `.webp`, `@2x` | 390×844 | Landing | |

## 4. Video (workstream 4)

Rendered from code by `pnpm video:render`: 67.8 seconds, 30 fps, silent, captions in the picture. Masters land in `apps/video/out/`, which is git-ignored. Files under 10 MB go in `apps/web/public/video/`. Anything larger stays out of git: list its local path here and in Needs DQ for a CDN upload. Every file below is under 10 MB, so nothing is waiting on a CDN.

| File | Spec | Used by | Status |
|---|---|---|---|
| `apps/web/public/video/beans-demo-web.mp4` | H.264, 1920×1080, 5.62 MB | Landing | Done |
| `apps/web/public/video/beans-demo-web.webm` | VP9, 1920×1080, 5.26 MB | Landing | Done |
| `apps/web/public/video/beans-demo-poster.avif` | 1280×720, 20 KB | Landing | Done |
| `apps/web/public/video/beans-demo-poster.png` | 1920×1080, 220 KB | Social, fallback | Done |
| `apps/web/public/video/beans-demo.vtt` | 15 cues, matches the captions in the picture | Landing | Done |
| `apps/web/public/video/beans-demo-1920.mp4` | H.264, 1920×1080, 6.70 MB | Social, full cut | Done |
| `apps/web/public/video/beans-demo-1920.webm` | VP9, 1920×1080, 5.96 MB | Social, full cut | Done |
| `apps/web/public/video/beans-demo-square.mp4` | H.264, 1080×1080, 4.75 MB | Social | Done, recomposed for the frame |
| `apps/web/public/video/beans-demo-vertical.mp4` | H.264, 1080×1920, 5.35 MB | Social | Done, recomposed for the frame |

The intro, outro and midnight scenes use the code-drawn mascot. The generated poses are a one-line swap once workstream 2 merges: see `docs/launch/video.md`.
