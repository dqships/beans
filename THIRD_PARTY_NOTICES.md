# Third-party notices

Beans uses the following third-party software and fonts. Each keeps its own
licence, which applies to that component instead of Beans's MIT License. None
of their source is copied into this repository; package managers fetch them,
at the versions pinned in `pnpm-lock.yaml`.

## Figtree

- Used for: all text in the app and on the website, self-hosted through
  `next/font` at build time.
- Licence: SIL Open Font License 1.1.
- Source: https://github.com/erikdkennedy/figtree
- Copyright 2022 The Figtree Project Authors.

## Remotion (`apps/video` only)

- Used for: rendering the demo film from code.
- Licence: the Remotion License, not an open-source licence. It is free for
  individuals and small companies; larger companies need a company licence.
  See https://www.remotion.dev/license before you use `apps/video`.
- Source: https://github.com/remotion-dev/remotion

The planner and website do not depend on Remotion. Nothing from `apps/video`
is shipped in the web app apart from the rendered film, which is covered by
[TRADEMARKS.md](TRADEMARKS.md).

Remotion pulls in Mediabunny (Mozilla Public License 2.0), and `apps/video`
loads Figtree from `@fontsource-variable/figtree` (SIL OFL 1.1).

## Everything else

Almost every other dependency (Next.js, React, Convex, Clerk, Phosphor Icons,
Tiptap, dnd-kit, Motion and the rest) is under MIT, ISC, Apache 2.0 or a BSD
licence. The exceptions, all used unmodified as installed packages:

- `sharp`, used by Next.js image optimization and the asset scripts, installs
  prebuilt libvips binaries under LGPL-3.0-or-later.
- `posthog-js` includes DOMPurify, under MPL-2.0 or Apache 2.0.
- `caniuse-lite`, browser data used by the build tools, is under CC BY 4.0.

`pnpm licenses list` prints the licence of every installed package. Their
licence files ship inside each package in `node_modules`.
