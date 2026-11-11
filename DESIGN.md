# Beans design system

Read this before building, revising or reviewing any screen. Every screen uses these tokens only. Need something new? Add it here first, then to the token files, then use it.

## The world: a bean garden

Beans is a small garden you tend each day. Its materials come from one place: seed-packet paper, soil, and a beanstalk that grows through your day.

| Surface | How it shows up |
|---|---|
| App background | Warm seed-packet paper |
| Day columns | Garden rows, each sitting on a thin soil line |
| Timebox | A beanstalk: the hour line is a vine, and the now marker is a checked-off bean with its sprout |
| Task checkbox | A small bean outline that fills in when done |
| Completing a task | The bean gets a tiny sprout |
| Timer ring | A leaf that grows as time passes |
| Empty states | The bean mascot doing something in the garden |
| Landing page | The hero Timebox's now bean rides the page's vine as you scroll, passing behind anything on the vine while an outline draws round it |
| Analytics bars | Rounded stalks |
| First-run setup | Seed packets become labels, real tasks land on soil lines, and a vine grows a leaf per step |
| Free tools (`/tools`) | Each tool grows in a seed tray: paper sides, a soil line along the foot, a checked-off bean perched on the rim. Its steps climb a vine, one leaf each. Timers use the leaf ring, lists use bean checkboxes, schedules put the hours on a vine, and answers stand on a soil line. The index is four garden rows |

Names stay plain: Brain Dump, Timebox, Lists, Labels. The world shows in visuals and in small lines of copy, such as "Spill the beans" as the empty Brain Dump prompt.

## Color

Pairs below were checked for contrast. All body text pairs pass WCAG AA (4.5:1).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#FBF7EF` | `#1A1511` | App background |
| `--color-surface` | `#FFFDF8` | `#26201A` | Cards, modals, menus |
| `--color-surface-2` | `#F3ECDF` | `#322A22` | Chips, hovers, wells |
| `--color-border` | `#E6DCCB` | `#3D342B` | Dividers, soil lines |
| `--color-text` | `#2B2118` | `#F4EDE1` | Primary text |
| `--color-text-muted` | `#6F6253` | `#B3A594` | Secondary text |
| `--color-primary` | `#2F7D4F` | `#6CC48E` | Main actions, focus, today |
| `--color-on-primary` | `#FFFFFF` | `#12201A` | Text on primary |
| `--color-accent` | `#B4532A` | `#E8926A` | Bean highlights, now marker |
| `--color-danger` | `#B3261E` | `#F2857A` | Delete, over limit |
| `--color-warning` | `#8A5A00` | `#E9B949` | Due soon, cautions |
| `--color-scrim` | `rgb(43 33 24 / 0.45)` | `rgb(0 0 0 / 0.6)` | Behind modals |

Label colors, used for dots and timeboxed blocks:

| Token | Value |
|---|---|
| `--label-soil` | `#A8977F` |
| `--label-tomato` | `#E8705F` |
| `--label-pumpkin` | `#E08A3C` |
| `--label-corn` | `#E2B93B` |
| `--label-sprout` | `#58B368` |
| `--label-rain` | `#4F93D1` |
| `--label-plum` | `#AE8AD9` |
| `--label-beet` | `#DC6FA3` |

Text on a label-colored block uses `--color-text` from the light theme in both themes. All eight pass 4.5:1 with that text.

Mascot colors are brand constants, not UI tokens: bean `#C4552F`, shade `#A14322`, highlight `#F0B08C`, leaf `#6CC48E` and `#4FA874`, stem `#2F7D4F`, cheek `#E8926A`, eyes `#2B2118`, glint `#FFFDF8`.

## Type

One family: **Figtree**, self-hosted through `next/font`. Numbers use tabular figures.

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `--text-xs` | 12 / 16 | 500 | Chips, metadata, calendar hours |
| `--text-sm` | 14 / 20 | 500 | Task titles, menus, body |
| `--text-md` | 16 / 24 | 600 | Section titles, button labels in dialogs |
| `--text-lg` | 20 / 28 | 700 | Day headers, panel titles |
| `--text-xl` | 28 / 36 | 700 | Modal task title, ritual headings |
| `--text-title` | 40 / 44 | 700 | Marketing pages only: section headings, the phone hero |
| `--text-display` | 64 / 68 | 700 | Marketing pages only: the desktop hero |

The planner uses the five sizes from `--text-xs` to `--text-xl`. The two larger sizes exist only on marketing pages.

## Spacing

Scale: `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-5` 24, `--space-6` 32.

Layout steps:

| Token | Value | Use |
|---|---|---|
| `--layout-topbar` | 60 | Top bar height |
| `--layout-sidebar` | 272 | Left sidebar |
| `--layout-column` | 272 | Day column |
| `--layout-timebox` | 280 | Timebox panel |
| `--layout-modal` | 560 | Task modal |
| `--layout-hour` | 80 | Calendar hour at 100% zoom |
| `--layout-page` | 1200 | Marketing page content width |
| `--layout-prose` | 640 | Marketing and legal reading width |
| `--layout-section` | 96 | Gap between marketing sections on desktop |
| `--layout-section-sm` | 64 | Gap between marketing sections on phones |

## Shape and depth

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 8 | Chips, inputs, buttons |
| `--radius-md` | 12 | Task cards, menus |
| `--radius-lg` | 20 | Modals, drawers |
| `--radius-full` | 999 | Timer pill, toggles |
| `--shadow-sm` | `0 1px 2px rgb(43 33 24 / 0.08)` | Cards |
| `--shadow-md` | `0 6px 16px rgb(43 33 24 / 0.12)` | Menus, dragged task |
| `--shadow-lg` | `0 16px 40px rgb(43 33 24 / 0.18)` | Modals |

Dark mode uses the same shadows with `rgb(0 0 0)` at double opacity.

## Controls

- **Primary button:** `--color-primary` fill, `--color-on-primary` text, `--radius-sm`, height 36.
- **Secondary button:** `--color-surface` fill, 1px `--color-border`, `--color-text`.
- **Quiet button:** no fill or border; `--color-surface-2` on hover.
- **Danger button:** `--color-danger` fill, used only to confirm something destructive.
- **Input:** `--color-surface` fill, 1px `--color-border`, height 36, `--radius-sm`, 2px `--color-primary` focus ring.
- **Switcher:** a `--color-surface-2` well with the active segment on `--color-surface`.
- **Toggle:** `--radius-full`, `--color-primary` when on.
- **Task card:** `--color-surface`, `--radius-md`, `--shadow-sm`, `--space-3` padding. Rows on a soil line, not a heavy stack of boxes.
- **Focus:** every control has a visible 2px `--color-primary` ring.
- **Priority flag:** High uses `--color-danger`, Medium `--color-warning`, Low `--color-primary`, none `--color-text-muted`. Flags never reorder tasks.
- **Toast and timer pill:** inverted, with `--color-text` fill and `--color-bg` text, `--shadow-md`.

## Icons

Beans runs in the browser, so SF Symbols can't be used. Use **Phosphor Icons, Regular weight**, at 16 and 20, for everything. It's drawn close to SF Symbols' weight and metrics. Don't mix in another set, and never use a sparkles icon.

Custom drawn exceptions, made from the mascot: the bean checkbox, the bean now marker (the checkbox bean, checked off), and leaf timer ring.

## Motion

One spring everywhere: **stiffness 380, damping 32, mass 1**.

| Token | Value |
|---|---|
| `--spring-stiffness` | 380 |
| `--spring-damping` | 32 |
| `--spring-mass` | 1 |

CSS-only transitions use the matching `linear()` easing, generated once from this spring and stored as `--ease-spring` in the token file, with its settle time as `--duration-spring`. Honor reduced-motion by switching to a plain opacity fade that lasts `--duration-fade`.

| Token | Value | Use |
|---|---|---|
| `--duration-fade` | 120ms | Reduced-motion fades, hover color changes |

## Supporting tokens

Added while building screens. Same rule: use these, never a raw value.

| Token | Value | Use |
|---|---|---|
| `--font-sans` | Figtree, then the system UI stack | Every piece of text |
| `--border-width` | 1 | Dividers, soil lines, input and card borders |
| `--focus-ring` | 2 | Focus rings, today outline, over-limit outline |
| `--control-height` | 36 | Buttons and inputs |
| `--control-height-sm` | 28 | Chips, icon buttons, compact pickers |
| `--icon-sm` | 16 | Icons inside chips and cards |
| `--icon-md` | 20 | Top bar and toolbar icons |
| `--bean-size` | 18 | Bean checkbox on cards |
| `--opacity-done` | 0.6 | Completed tasks |
| `--opacity-ghost` | 0.4 | Drag source placeholder |
| `--layout-tabbar` | 56 | Phone tab bar height |
| `--layout-drawer` | 400 | Trash and other right drawers |
| `--layout-rail` | 320 | Daily planning and shutdown rail |
| `--layout-capture` | 600 | Quick Capture bar |
| `--layout-phone` | 720 | Below this width the phone layout takes over |
| `--z-sticky` | 10 | Sticky day headers, all-day row |
| `--z-panel` | 20 | Phone panels and drawers |
| `--z-overlay` | 40 | Scrims |
| `--z-modal` | 50 | Modals, Quick Capture |
| `--z-popover` | 60 | Menus and pickers, also inside modals |
| `--z-toast` | 70 | Toasts and the timer pill |
| `--z-drag` | 80 | The task being dragged |
| `--color-on-label` | `#2B2118` | Text on label-colored blocks, both themes |
| `--video-caption` | 44px | Captions in the demo video, at 1920 wide |
| `--video-title` | 88px | Intro and outro lines in the demo video |

Media queries can't read custom properties, so the phone breakpoint is written as `720px` in `@media` rules only, with a comment pointing back here.

Mascot colors are exported as `--mascot-bean`, `--mascot-shade`, `--mascot-highlight`, `--mascot-leaf`, `--mascot-leaf-2`, `--mascot-stem`, `--mascot-cheek`, `--mascot-eyes` and `--mascot-glint` for code-drawn mascot art. They stay the same in both themes.

## Assets

The mascot is the product's original character. Don't replace it with a redrawn or generic version.

- `assets/logo/beans-mascot.svg`: the master mascot, drawn in code.
- `assets/logo/beans-app-icon.svg`: the rounded app icon.
- `assets/logo/exploration/`: the Recraft draft that informed the silhouette. Reference only.

**Style prompt.** Use this exact text for every generated image, with `assets/logo/beans-mascot.svg` rendered to PNG as the reference, changing only `[SCENE]`:

> Flat vector illustration of the same friendly tilted kidney bean mascot from the reference image, terracotta body with a darker shaded edge, a two-leaf green sprout on top, round dark eyes with one white highlight, small smile, soft peach cheeks. Simple geometric shapes, thick clean curves, no outlines, no gradients, warm cream seed-packet paper background, gentle garden setting, plenty of empty space, no text. Scene: [SCENE]

Build simple assets in code first. Generate only what code can't match, with the cheaper model that keeps the character consistent.

## Before calling any screen done

- Screens use tokens only, with no hardcoded color, size, spacing, radius, shadow or easing.
- Screenshots at desktop and phone widths, in light and dark mode, with nothing clipped or overflowing.
- Avoid: stacks of identical rounded cards, icons in tinted circles, three-column feature grids, purple-to-blue gradients, default glassmorphism, phone-mockup heroes, eyebrow labels above headings.
