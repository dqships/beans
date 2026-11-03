# Goal lists (idea)

Status: idea only. Nothing is built. Branch `claude/goal-lists-concept`, started 2026-11-03.

Demo of how it could look: see "Demo" at the end.

## The idea, in DQ's words

> Creating a list and marking it as a goal, then it creates labels specific to that list/goal and it auto-generates a first set of tasks for each label that can be completed to work toward the overall goal. At any point you can generate more tasks, either focusing on one label/area in a goal or more overall.

DQ isn't sure about the shape yet. This note writes down the current thinking so it can be picked up later.

## How it would work in Beans

1. Make a list, or open one, and choose **Make this a goal**.
2. Write the goal in a sentence ("Run a half marathon in March"), and optionally why it matters and a target date.
3. Beans suggests 3 to 5 **areas** for the goal (for running: Training, Gear, Health, Race prep). Each area is a label that belongs to this goal, with its own color.
4. Beans suggests a first set of small tasks for each area, with estimates. You see them as a proposal and keep, edit or drop each one before anything is added.
5. Kept tasks land in the goal's list, labelled with their area. You plan them onto days and the Timebox like any other task.
6. At any time:
   - **More for this area** suggests the next few tasks for one area.
   - **More for the goal** suggests the next steps across all areas.
   Both read what's done and what's still open, so they build on progress and don't repeat tasks.
7. The goal header shows progress per area (done out of total), so you can see which area is behind.

## How Solo Quest's Notes works

Branch `codex/notes-experience` in `solo-quest-app`. Notes is an opt-in second experience on iOS, separate from the quest game.

| Part | What it does |
|---|---|
| Note | Title, free-writing body, attachments (photos, video, audio), tasks, a research report, a chat thread, milestones and completion history |
| Automatic research | After a signed-in person stops typing for 2 seconds (note at least 12 characters and 3 words), it sends the note to `/api/notes-assistant`. The server calls OpenAI's Responses API with web search required and a strict JSON schema. It returns a report and 5 to 15 small tasks |
| Safety rules | Applies only if the note hasn't changed since the request (revision check). Never replaces the body, an existing report, existing tasks, completed state or a title the person edited. Stop, typing, leaving or backgrounding cancels it |
| Report | Summary, key resources, budget and timeline, with source links. Read-only by default, with an Edit button and a version history you can restore from |
| Ask AI | A chat per note. Can send up to 6 resized photos and an optional city. Every proposed change needs **Apply** |
| Milestones | Before applying a new round of research, it snapshots the note, so the next round builds on real progress |
| Tasks | Title, done, optional notes, Apple Reminders scheduling. Tasks are the default view; Research swaps in place |
| Focus | Timer presets from 15 minutes to 2 hours, Pomodoro from 30 minutes, Screen Time app blocking, Home and Lock Screen widget |
| Streak | Its own device-only streak with a 4 AM day, calendar and milestones |
| Storage | Local JSON on the device with atomic writes, backups, export and import. No sync. Sign-in only unlocks the AI |

The prompt asks for small specific tasks, building on completed work, never deleting tasks, never inventing progress, and never repeating completed tasks. Those rules carry over well.

## Keep, change, drop

### Keep

1. **Proposals, then Apply.** AI never writes straight into the planner. You review each suggested task first.
2. **Never touch your work.** No deleting tasks, renaming them, or changing done state. Only additions.
3. **Stale check.** If the goal changed while the request was out, show the proposal against the new state or discard it, as Solo Quest does with its revision check.
4. **Build on progress.** Every "more tasks" request sends done tasks and open tasks, so it suggests the next steps and skips repeats. This is Solo Quest's milestone idea without the snapshots.
5. **Server-side key, strict JSON schema, bounded request, no provider storage.** Same safety setup as `/api/notes-assistant`.
6. **"Small, specific tasks" rule** from the prompt, plus an estimate on each one, because Beans plans by time.

### Change

1. **Tie it to lists, not a separate notes app.** A goal is a list with a goal sentence. Everything else in Beans (days, Timebox, filters, Pomodoro) keeps working.
2. **Areas instead of one flat task list.** Solo Quest gives one pile of 5 to 15 tasks. Beans splits them by area so you can ask for more in one area.
3. **The report becomes an optional short goal brief.** One paragraph plus a rough timeline, shown in the goal header. Budget and resources only if the goal needs them.

### Drop

1. **Generating on a typing pause.** It's surprising and costs money every time someone pauses. Beans generates when you press a button.
2. **Required web search with citations on every run.** Slow (Solo Quest allows up to 110 seconds) and costly. Plain task suggestions don't need it. Offer "Look things up" as an opt-in later.
3. **The chat thread.** Start with buttons plus an optional "steer it" line ("more beginner friendly", "I have 30 minutes a day"). Add chat only if people ask.
4. **Report version history, milestones UI, attachments sent to AI, city.** Too much for a first version.
5. **Focus timer with app blocking and its own streak.** Beans already has Focus mode and Pomodoro, and a browser can't block apps. A goal's progress bars do the streak's job.
6. **Local-only JSON storage, export and import.** Beans stores everything in Convex already.

## How it compares to Ellie's AI

The Ellie teardown (`dqships/ellie-teardown-report`) left Ellie's AI out of scope; it only notes MCP/API access (beta). This section comes from Ellie's public guide, read 2026-11-03: [AI Assistant](https://guide.ellieplanner.com/features/ai-assistant) and [MCP and API access](https://guide.ellieplanner.com/features/integrations/mcp-and-api-access).

What Ellie has:

- **AI Assistant (beta, Pro only).** A chat bubble at bottom right, turned on in Power Features. It works on the tasks you already have: create tasks with subtasks from what you type, label unlabelled tasks, add time estimates, "Timebox my day" around calendar events, find free time, suggest what to focus on, add repeats, and move many tasks at once. A "Require confirmation before modifying data" setting is opt-in, so by default it seems to change things directly. Settings also hold a free-text description of your work routine for timeboxing. No provider or limits are named.
- **MCP / API access (beta).** Outside AI tools such as Claude can read and write Ellie tasks, limited to read, write or both, and to chosen tools. The same key works for Zapier.

| | Ellie | Beans goal lists |
|---|---|---|
| Job | Arrange and edit the tasks you already know about | Work out what the tasks are, from a goal |
| Goals or projects | None | A list becomes a goal with areas |
| New tasks | Only the items you type ("buy milk, bread and cheese") | Suggests the steps itself, per area or for the whole goal, building on what's done |
| Labels | Labels existing tasks from your labels | Makes new area labels for the goal |
| Estimates | Adds estimates to existing tasks | Every suggested task comes with one |
| Scheduling | "Timebox my day", free-time search | Not in the idea. Tasks land in the list and you plan them |
| Review | Opt-in confirmation | Always a proposal you approve |
| Interface | General chat | Buttons, plus an optional "steer it" line |
| Outside AI tools | MCP and API (beta) | None (MCP is "Out for now" in `RESEARCH.md`) |

What this means for Beans:

1. **Goal lists don't overlap Ellie.** Ellie helps you arrange the work you already listed. Goal lists help you work out what the work is. It's the stronger story for Beans' first AI feature.
2. **Two Ellie features fit Beans well later:** "Add estimates to tasks without them" and "Timebox my day", because Beans already plans by estimates and the Timebox. They could reuse the same server action and review-first drawer.
3. **Skip general chat for now.** It's the most open-ended to build, test and price, and Ellie still has it in beta.
4. **Review first by default** is a point in Beans' favor. Ellie makes it a setting you have to find.

## Fit with the current Beans model

Beans already has most of the pieces (`packages/core/src/model.ts`):

- `List` has `name`, `icon` and `autoLabelId` (tasks made in a list get its label).
- `Label` has `name` and `color` (8 label colors in `DESIGN.md`).
- `Task` has one `labelId`, `notes`, subtasks and an `estimate`.

Smallest change that works:

```ts
interface List {
  // existing fields…
  /** Set when the list is a goal. */
  goal: {
    outcome: string;          // "Run a half marathon in March"
    why: string;              // optional, "" when empty
    targetDate: DateKey | null;
    brief: string;            // optional short plan from the AI
  } | null;
}

interface Label {
  // existing fields…
  /** The goal this label is an area of. `null` for everyday labels. */
  goalId: string | null;
}
```

New pieces:

- `packages/core/src/goals.ts`: build the request context (goal, areas, done and open tasks), check a proposal, drop duplicate titles.
- `convex/goals.ts`: an action that calls the model and returns a proposal (writes nothing), and a mutation that applies the tasks you kept through the existing task ops.
- UI: "Make this a goal" in the list menu, the goal header with area progress, and a proposal drawer.

### The trade-off with area labels

A task has one label. If areas are labels, a "Training" task can't also be labelled "Health". Two ways:

| Option | Good | Cost |
|---|---|---|
| **A. Areas are labels with `goalId`** (recommended) | Colors on the Timebox, filters and Quick Capture work with no new code. Matches "creates labels" | A goal task can't also carry an everyday label. Goal labels need hiding from the label picker outside their goal |
| B. New `areaId` field on tasks | Keeps everyday labels free | New field everywhere: filters, Timebox colors, Quick Capture, the Convex schema |

Start with A. Inside a goal list the area is the only grouping that matters.

## Open decisions for DQ

1. **This reverses "No AI integration for now" (2026-10-31).** Is goal lists a post-launch feature, or part of v1?
2. **Areas as labels (option A) or a separate area field (option B)?**
3. **Which model and provider.** Solo Quest uses OpenAI through its own server. Beans could call a model from a Convex action with the key stored in Convex env.
4. **Paywall and limits.** Is it in the normal subscription with a daily cap (for example 20 generations a day), or a higher plan?
5. **Where kept tasks land.** Recommended: the goal's list, unscheduled. Option: "spread over the next N days".
6. **Name.** "Goal" is plain and matches `DESIGN.md` ("Names stay plain"). Garden copy can live in small lines, such as "Plant a few more" on the more-tasks button.

## Before building

- Privacy policy and terms: say task and goal text goes to the AI provider when you press generate, and that the provider doesn't store it.
- Rate limit per user, and a timeout with a clear "nothing changed" error, as Solo Quest does.
- Tests: applying a proposal never edits existing tasks; duplicate titles are dropped; a stale proposal is caught.
- Screens in light and dark, desktop and phone, using `DESIGN.md` tokens only.

Rough size, for one person: data model and apply mutation half a day, AI action with prompt, schema and tests one day, UI two days, legal and limits half a day. About 4 days.

## Demo

Interactive mock of the goal header, areas and the proposal flow, drawn with the `DESIGN.md` tokens. It uses fixed sample suggestions, no real AI: https://claude.ai/artifact/6NmwHW3a1Vsv3NwyYEZp1j (private until shared).

- **Desktop, interactive:** Make this a goal, then Suggest areas and tasks, untick anything, then Add. Tick tasks to grow the area bars. Plant a few more on an area, or More for the goal. Tweaks has a Dark switch.
- **Phone, dark:** the goal view at 390 wide.

Things the mock shows that aren't in the text above:

- Tasks already in the list get sorted into the new areas as part of the first plan.
- Goal areas show in the sidebar under their own heading, apart from everyday labels.
- A goal task planned on a day keeps its area color.
