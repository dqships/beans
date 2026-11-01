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
| `apps/web/public/social/og-image.png` | 1200×630 | Open Graph | Done. Lines: "Turn your to-do list into a plan for today." and "Beans is a daily planner." |
| `apps/web/public/social/twitter-image.png` | 1200×630 | Twitter card | Done. Same image as Open Graph |
| `apps/web/public/brand/mascot-1x.png`, `mascot-2x.png` | 256, 512 wide | Email, docs | Done. Square, transparent |
| `apps/web/public/brand/mascot.webp`, `mascot.avif` | 512 wide, transparent | Web | Done. 11.2 KB and 7.6 KB |
| `assets/brand/clerk-logo.png` | 512×512 | Clerk application logo, upload by DQ | Built, not uploaded. Transparent, so it works on light and dark cards |
| `assets/brand/google-oauth-logo.png` | 120×120 | Google consent screen, upload by DQ | Built, not uploaded. Square on paper, art inside a circle crop |
| `assets/brand/github-social-preview.png` | 1280×640 | GitHub social preview, upload by DQ | Built, not uploaded. Same layout as Open Graph |
| `apps/web/src/app/manifest.ts` | Generated | Web app manifest, served at `/manifest.webmanifest` | Done. Colors come from `--color-bg`, so rerun `pnpm assets` after changing it |

The OG and Twitter images use stable `public/` paths, because both App Router and Pages Router pages point at them.

## 2. Mascot poses (workstream 2)

Web copies: `apps/web/public/illustrations/<name>@1x.avif`, `<name>@1x.webp`, `<name>@2x.avif`, `<name>@2x.webp`, each under 60 KB. Sources: `assets/illustrations/<name>.png`, transparent, at the 2x size. The sizes below are the 1x sizes in CSS pixels; the 2x files are double.

`pnpm illustrations` rebuilds everything. `pnpm illustrations hero planning` rebuilds only those poses. `scripts/build-illustrations.mjs` holds the code-drawn scenes and checks the 60 KB limit.

In the app, use `<Illustration name="..." />` from `apps/web/src/ui/Illustration.tsx`. It holds these sizes and alt texts, and it adds no client JavaScript.

| Name | 1x size | Pose | Used by | Alt text | Status |
|---|---|---|---|---|---|
| `hero` | 800×600 | Planting a bean in a neat row | Landing hero | The Beans mascot beside a row of soil with one bean going into the ground and three seedlings growing. | Generated. Awaiting DQ's sign-off |
| `brain-dump` | 640×480 | Spilling beans out of a seed packet | Landing | The Beans mascot watching a pile of beans spill out of a tipped seed packet. | Generated |
| `planning` | 640×480 | Arranging beans along garden rows | Landing | The Beans mascot beside three garden rows of beans, with one bean hopping into a gap. | Generated |
| `timebox` | 640×480 | Climbing a beanstalk with leaf markers | Landing | The Beans mascot clinging to a beanstalk, with leaves marking even steps along it. | Code-drawn |
| `focus` | 640×480 | Sitting still under a leaf, timer ring nearby | Landing | The Beans mascot sitting still under a large leaf, next to a green timer ring. | Generated |
| `rollover` | 640×480 | Asleep under a crescent moon while tasks roll to the next row | Landing, video | The Beans mascot asleep under a crescent moon while two beans roll toward the next row. | Generated |
| `analytics` | 640×480 | A small harvest basket | Landing | The Beans mascot beside a full harvest basket and three green stalks of different heights. | Generated |
| `phone` | 480×480 | Peeking over a phone-sized seed packet | Landing | The Beans mascot peeking over the top of a phone-sized seed packet. | Generated |
| `404` | 640×480 | Digging and finding nothing | 404 page | The Beans mascot beside an empty hole in the soil, with a trowel stuck in a small mound. | Code-drawn |
| `welcome` | 480×480 | Sign-in welcome: watering a seedling | Sign-in, sign-up | The Beans mascot beside a watering can that is watering a seedling. | Code-drawn. In use, with `alt=""` |
| `error` | 480×480 | Error: a knocked-over flower pot | App error page | The Beans mascot beside a tipped-over flower pot with spilled soil and a seedling. | Code-drawn. In use, with `alt=""` |
| `empty-trash` | 480×480 | Empty Trash: an empty bucket | Trash drawer | The Beans mascot beside an empty bucket. | Code-drawn. In use, with `alt=""` |
| `email-header` | 600×200 | Email header: a row growing from bean to seedling | Emails | The Beans mascot at the end of a row that grows from a bean to a tall seedling. | Code-drawn. Also ships as `email-header.png`, 1200×400 |
| `video-intro` | 960×540 | Video intro: sunrise behind the row | Video | The Beans mascot in a row of seedlings with the sun coming up behind them. | Code-drawn |
| `video-outro` | 960×540 | Video outro: beans spilled, left half empty for the line | Video | The Beans mascot beside a tipped seed packet with beans spilled on the soil. | Code-drawn |

Poses built in code from `apps/web/src/ui/garden.tsx` count, as long as the files above exist. Note in Status which poses are code-drawn and which are generated.

The code-drawn poses use the master mascot from `assets/logo/beans-mascot.svg` unchanged. The art is on a transparent background, so it works on both themes. `apps/web/public/illustrations/email-header.png` exists because email clients don't reliably show AVIF or WebP.

### How to redo a generated pose

- **Model:** `google/nano-banana` on Replicate, chosen after a test on the hero against `bytedance/seedream-5-lite` and `black-forest-labs/flux-kontext-pro`. It stayed closest to the mascot's silhouette, leaves and face. Seedream softened the art and shifted the greens. Flux Kontext lost the kidney notch.
- **Reference image:** `assets/logo/beans-mascot.svg` rendered to a 192×192 PNG on `#FBF7EF`, sent as `image_input`. It's small because the Replicate tool takes it inline as a data URL.
- **Prompt:** the style prompt in `DESIGN.md`, word for word, with the `[SCENE]` text below. Output format is PNG. Aspect ratio is 4:3, or 1:1 for `phone`.
- **Then:** save the result as `assets/illustrations/raw/<name>.png` and run `pnpm illustrations <name>`. The script cuts out the paper and writes every size. The model has no seed, so a redo gives a new picture. Check the pose against the master before keeping it.
- **Upscaling:** don't use Real-ESRGAN. It drew pale halos along the edges, which read as outlines. The 2x files are resized with Lanczos.

| Name | `[SCENE]` |
|---|---|
| `hero` | The mascot stands at the left of a single neat straight row of soil running across the bottom of the image, leaning forward over a small hole. One tiny terracotta bean sits in the hole, and three small seedlings stand evenly spaced along the row behind it. The mascot has no arms and no legs. |
| `brain-dump` | A small open seed packet in soft sage green with no writing on it is tipped over on its side next to the mascot, and a dozen small terracotta beans spill out of its open top in a loose arc onto a thin brown soil line. The mascot stands on the soil line and watches the beans with a happy look. The mascot has no arms and no legs. The paper background is completely plain, with no specks or texture, and there is no shadow on the ground. |
| `planning` | On the left two thirds of the image, three short thin straight horizontal soil lines in dark warm brown #6F4327 are stacked one above the other like garden rows, each ending well before the mascot, each with four small plain terracotta beans resting on it, evenly spaced, and one more small bean hopping down into a gap in the middle row. On the right third, the mascot, upright at the same tilt as the reference image and taking up about half the image height, rests directly on its own short soil line in the same brown and looks left toward the rows. Nothing overlaps the mascot. The mascot has no arms and no legs. The paper background is completely plain, with no specks or texture, and there is no shadow on the ground. |
| `focus` | The mascot sits very still on a thin soil line in dark warm brown #6F4327, upright at the same tilt as the reference image, under one large green leaf that arches over it like a small umbrella from a stem planted in the soil behind it. Beside the mascot floats a thin green progress ring, like a timer: the ring is only three quarters drawn, with a clear gap at its upper left where the line stops, and a tiny leaf grows from the end of the line. The mascot has no arms and no legs. The paper background is completely plain, with no specks or texture, and there is no shadow on the ground. |
| `rollover` | The mascot is asleep on a thin brown soil line on the left, upright at the same tilt as the reference image, with its eyes gently closed as two small downward curves and the same small smile. A soft golden crescent moon floats in the upper right. Two small plain terracotta beans roll along the soil line to the right and drop onto a second short soil line just below it. The mascot has no arms and no legs. The paper background is completely plain, with no specks or texture, and there is no shadow on the ground. No night sky, the background stays cream paper. |
| `analytics` | The mascot stands on a thin warm brown soil line, upright at the same tilt as the reference image, next to a large round woven harvest basket in warm tan that comes up to its middle and is heaped with small plain terracotta beans. Beyond the basket three rounded stalks of different heights grow from the soil, in the same green as the mascot's leaves, each with one small leaf at its tip. The mascot has no arms and no legs. The paper background is completely plain, with no specks or texture, and there is no shadow on the ground. |
| `phone` | The mascot peeks over the top edge of a tall upright rectangular seed packet with rounded corners, the proportions of a phone, in soft sage green with one small plain terracotta bean shape in its center and no writing. Only the upper half of the mascot, its eyes, smile and sprout, shows above the packet. The packet stands on a thin brown soil line. The mascot has no arms and no legs. The paper background is completely plain, with no specks or texture, and there is no shadow on the ground. |

The `hero` scene predates the "plain paper" sentence, so its raw image has paper flecks. The build removes them.

`timebox` and `404` started as generated poses and are now code-drawn. The model kept adding thin arms on the beanstalk, and it couldn't cut a hole into a thin soil line.

The build retints each generated pose's soil to `#6F4327`, the same soil the code-drawn poses use. A redo needs its measured soil color in the `generated` table in the script. The `hero` is left as generated while DQ reviews it, so its soil is `#7F4324`.

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
