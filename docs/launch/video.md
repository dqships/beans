# Demo video

A short film of one workflow, made in code with Remotion from the real planner components. Source: `apps/video`. Render: `pnpm video:render`. Files: section 4 of `assets.md`.

## The reference video

Format notes from the reference video, watched in the browser at several timestamps. It was not downloaded. Nothing from it is used here.

| Trait | What it does |
|---|---|
| Length | 3:56, far longer than this film needs |
| Structure | One workflow, one sitting: fill the day's list, label tasks, reorder them, then drag them onto the calendar from the top of the day down, until the day is full |
| Pacing | One unbroken take in real time, with no cuts. The screen changes slowly and the voice carries it |
| Captions | None, and no caption track. Muted, it can't be followed |
| Showing the UI | The whole app in one window, floating on a wallpaper with rounded corners. No zooms at all, so small text stays small |
| Cursor | The real cursor, driving everything, with the action always under it |
| Presenter | A narrator in a round webcam bubble in the bottom right corner |

What this film takes from the format: one workflow end to end, the whole app in a framed window, and the cursor as the thing to follow.

What it does differently, on purpose: it runs about a minute, cuts every waiting moment, zooms in on decisions, carries everything in captions so it works muted on a phone, and has no presenter.

## The film

One workflow: spill, plan, timebox, focus, finish, roll over. 30 fps. Times are for all three shapes.

| Time | Beat | On screen | Caption |
|---|---|---|---|
| 0:00 | Hook | Mascot, beans spilling along the soil line. The words are there on the first frame | **Spill the beans.** Your tasks, your week and your hours in one place. |
| 0:03 | Quick Capture | The planner rises, empty. `Q` opens Quick Capture, and the real parser highlights `tomorrow`, `#home` and `=30m` as they're typed. Five more tasks follow fast | Spill it all out. Sort it later. / Quick Capture reads labels, dates and times as you type. |
| 0:18 | Plan | Four drags from the Brain Dump onto today and tomorrow, then the board scrolls through the week | Drag tasks onto the days you'll do them. / Your whole week on one board. |
| 0:30 | Timebox | Two drags onto the beanstalk, with the real drop preview. A block is pulled from 1h to 1h 30m | Drag a task onto the Timebox to give it a time. / Pull a block down to give it more time. |
| 0:40 | Timer | The time chip opens, Play starts the timer, and the clock runs fast while the pill counts up and the leaf climbs the vine | Start the timer when you start the task. / The timer keeps count while you work. |
| 0:48 | Check off | Zoom on the bean. One click and the sprout. The timer stops and the chip reads 1:13 / 1:30 | Check it off and watch it sprout. / Actual time fills in from the timer. |
| 0:53 | Midnight | The clock runs to midnight, the mascot sleeps, and three unfinished tasks land on the new today with a "Rolled over" tag | Some tasks won't get done today. / Unfinished tasks move to today at midnight. / No guilt, no copying things over. |
| 1:03 | Outro | Mascot, soil line, the primary button | **Spill the beans.** Start planning |

Every caption was checked against `voice.md`: each claim is on its "Facts you can state" list, none uses a banned word, and there are no questions or exclamation marks.

## How it's made

The film renders the real `PlannerApp` with no change to `apps/web`. `remotion.config.ts` swaps four modules at bundle time, and each stand-in lives in `apps/video/src/shims`:

| Swapped | Why | Stand-in |
|---|---|---|
| `@/data/hooks` | Reads the wall clock | The real hooks, with the clock taken from the frame |
| `planner/ui-state` | React state | The same shape, worked out from the frame |
| `planner/dnd` | Pointer sensors | The same exports, with drag state from the script |
| `@/ui/Modal` | Portals to `document.body`, outside the camera | The same markup, in place |

`src/script.ts` replays real `@beans/core` operations (`parseCapture`, `createTask`, `moveTask`, `startTimerOps`, `setDone`, `moveUnfinished`), so every number on screen is the app's own. `src/timeline.ts` holds every beat as a gap after the one before, so a retime is one edit and the length follows from the last beat. Nothing reads the clock or an unseeded random value; ESLint enforces it in `apps/video/src`.

The sample data is a video-only fixture, `src/fixture.ts`, on a fixed Tuesday in UTC.

The square and vertical cuts are recomposed, not letterboxed: the planner's real layout changes for each chapter (sidebar and day columns, then a day beside the Timebox), with a short dip over each change, and the camera works in those tighter frames. Captions sit on the paper below the planner and never cover it. The vertical cut leaves the bottom of the frame clear for the controls social apps draw there.

### Mascot art

The intro, outro and midnight scenes use the code-drawn mascot from `apps/web/src/ui/garden.tsx`. To use the `video-intro`, `video-outro` and `rollover` poses, set `USE_ILLUSTRATIONS` to `true` in `apps/video/src/brand/art.tsx` and rerender. The poses draw their own ground, so the film's soil line and spilled beans turn off with the same switch.

### Sound

Silent by decision, with clear captions. Synthesized sound would be possible without any licensed material, but it wouldn't be clearly better: the landing page plays this muted, and most social viewers do too. A licensed track or a voiceover can be added later as one `<Audio>` element in `src/film/Film.tsx`.

## Where it plays

| Copy | Where | How |
|---|---|---|
| `beans-demo-web` | Landing page, one section, above the fold or just below it | Muted, inline, poster first, with the `.vtt` as a track. It's silent, so the captions are already in the picture |
| `beans-demo-square` | X, LinkedIn, Product Hunt gallery | Upload natively. Product Hunt's preview stops at 60 seconds, so the outro would be cut there |
| `beans-demo-vertical` | Reels, Shorts, TikTok | Upload natively. It runs longer than the 30 to 45 seconds these feeds favor; a shorter cut would be a separate edit |
| `beans-demo-1920` | YouTube, long posts | Upload natively |

On phones the landing page is better off with the square cut. Its captions are about twice the size at the same width.
