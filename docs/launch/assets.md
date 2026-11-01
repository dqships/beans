# Beans asset manifest

Every image, pose and video file. Paths and dimensions below are fixed contracts, so pages can be built before the files exist. Each workstream edits only its own section: fill in the Status column, and add a row for anything extra.

## 1. Brand files (workstream 1)

Built from `assets/logo/beans-mascot.svg` and `assets/logo/beans-app-icon.svg` by `pnpm assets`.

| File | Size | Used by | Status |
|---|---|---|---|
| `apps/web/src/app/favicon.ico` | 16, 32, 48 | Browsers | Done. PNG frames of the mascot in a tight crop, no tile |
| `apps/web/src/app/icon.svg` | Vector | Browsers | Done. Same crop, full color in both themes |
| `apps/web/src/app/icon.png` | 512×512 | Browsers | Done. Same crop, transparent |
| `apps/web/src/app/apple-icon.png` | 180×180, opaque paper background | iOS home screen | Done. Square corners, no alpha channel |
| `apps/web/public/brand/pwa-192.png` | 192×192 | `manifest.ts` | Done. Rounded app icon |
| `apps/web/public/brand/pwa-512.png` | 512×512 | `manifest.ts` | Done. Rounded app icon |
| `apps/web/public/brand/pwa-maskable-512.png` | 512×512 with safe zone | `manifest.ts` | Done. `pnpm assets` fails if art leaves the 80% circle |
| `apps/web/public/social/og-image.png` | 1200×630 | Open Graph | Done. Line: "Spill the beans." |
| `apps/web/public/social/twitter-image.png` | 1200×630 | Twitter card | Done. Same image as Open Graph |
| `apps/web/public/brand/mascot-1x.png`, `mascot-2x.png` | 256, 512 wide | Email, docs | Done. Square, transparent |
| `apps/web/public/brand/mascot.webp`, `mascot.avif` | 512 wide, transparent | Web | Done. 11.2 KB and 7.6 KB |
| `assets/brand/clerk-logo.png` | 512×512 | Clerk application logo, upload by DQ | Built, not uploaded. Transparent, so it works on light and dark cards |
| `assets/brand/google-oauth-logo.png` | 120×120 | Google consent screen, upload by DQ | Built, not uploaded. Square on paper, art inside a circle crop |
| `assets/brand/github-social-preview.png` | 1280×640 | GitHub social preview, upload by DQ | Built, not uploaded. Same layout as Open Graph |
| `apps/web/src/app/manifest.ts` | Generated | Web app manifest, served at `/manifest.webmanifest` | Done. Colors come from `--color-bg`, so rerun `pnpm assets` after changing it |

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

Real app on sample data, remade by `apps/web/scripts/capture-product.mjs` (`pnpm --filter @beans/web capture`, with a dev server on port 3103). The clock is frozen at 10:40am on a Tuesday, and the Timebox shot is the planner's own layout under the phone breakpoint with its tab bar cropped off.

| File | Size | Used by | Status |
|---|---|---|---|
| `apps/web/public/product/board-light@1x.avif` and `.webp`, `@2x` | 1200×750 | Landing | Done |
| `apps/web/public/product/board-dark@1x.avif` and `.webp`, `@2x` | 1200×750 | Landing | Done |
| `apps/web/public/product/timebox-light@1x.avif` and `.webp`, `@2x` | 560×700 | Landing | Done |
| `apps/web/public/product/timebox-dark@1x.avif` and `.webp`, `@2x` | 560×700 | Landing | Done |
| `apps/web/public/product/phone-light@1x.avif` and `.webp`, `@2x` | 390×844 | Landing | Done |
| `apps/web/public/product/phone-dark@1x.avif` and `.webp`, `@2x` | 390×844 | Landing | Done |

## 4. Video (workstream 4)

Files under 10 MB go in `apps/web/public/video/`. Anything larger stays out of git: list its local path here and in Needs DQ for a CDN upload.

| File | Spec | Used by | Status |
|---|---|---|---|
| `apps/web/public/video/beans-demo-web.mp4` | H.264, under 6 MB | Landing | |
| `apps/web/public/video/beans-demo-web.webm` | Under 6 MB | Landing | |
| `apps/web/public/video/beans-demo-poster.avif` | 1280×720 | Landing | |
| `apps/web/public/video/beans-demo-poster.png` | 1920×1080 | Social, fallback | |
| `apps/web/public/video/beans-demo.vtt` | Captions | Landing | |
| `beans-demo-1920.mp4`, `.webm` | 1920×1080 | Social, full cut | |
| `beans-demo-square.mp4` | 1080×1080 | Social | |
| `beans-demo-vertical.mp4` | 1080×1920 | Social | |
