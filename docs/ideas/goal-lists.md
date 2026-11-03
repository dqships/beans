# Goal lists

Status: decided for v1 on 2026-11-03, not built yet. Branch `claude/goal-lists-concept`.

Demo of how it looks: see "Demo" at the end.

## The idea, in DQ's words

> Creating a list and marking it as a goal, then it creates labels specific to that list/goal and it auto-generates a first set of tasks for each label that can be completed to work toward the overall goal. At any point you can generate more tasks, either focusing on one label/area in a goal or more overall.

## Decisions (DQ, 2026-11-03)

1. **Part of v1.** This replaces the 2026-10-31 decision "No AI integration for now" for this one feature.
2. **Goal labels are ordinary labels that belong to one goal.** Not a new "area" concept, and not called areas anywhere.
3. **OpenRouter, with a switchable model.** The model list lives in code at `convex/goalModels.ts` (93 models), and `GOAL_MODEL` picks one.
4. **Included in the normal subscription, with a daily cap.**
5. **Kept tasks land in the goal's list, unscheduled.** You plan them onto days like any other task.
6. **Plain names with garden copy.** "Goal" and "labels" in the UI; "Plant a few more" on each label's button.
7. **No chat and no "steer it" field.** People add and remove tasks themselves and can generate more at any time, for one label or the whole goal, so steering isn't needed.
8. **No web research, now or later.**
9. **No location or city data.** That was for Solo Quest's adventures and didn't work out.

Still to settle: the cap number (suggested 20 rounds a day per account), and whether the no-card 3-day pass gets the feature.

## How it works

1. Open a list and choose **Make this a goal**.
2. Write the goal in a sentence ("Run a half marathon in March"), and optionally why it matters and a target date.
3. Press **Suggest labels and tasks**. Beans proposes 3 to 5 labels for the goal (for running: Training, Gear, Recovery, Race day), each with its own color, and a few small tasks for each label with estimates. Tasks already in the list get sorted under the new labels.
4. Every suggestion starts ticked. Untick anything you don't want, then **Add**. Nothing changes until then.
5. Kept tasks land in the goal's list with their label. Plan them onto days and the Timebox as usual.
6. At any time:
   - **Plant a few more** on a label suggests the next few tasks for that label.
   - **More for the goal** suggests next steps across all its labels.
   Both send what's done and what's still open, so suggestions build on progress and skip repeats.
7. The goal header shows each label's progress (done out of total).

## How Solo Quest's Notes works

Branch `codex/notes-experience` in `solo-quest-app`. Notes is an opt-in second experience on iOS, separate from the quest game.

| Part | What it does |
|---|---|
| Note | Title, free-writing body, attachments, tasks, a research report, a chat thread, milestones and completion history |
| Automatic research | After a signed-in person stops typing for 2 seconds, it sends the note to `/api/notes-assistant`. The server calls OpenAI's Responses API with web search required and a strict JSON schema, and returns a report and 5 to 15 small tasks |
| Safety rules | Applies only if the note hasn't changed since the request. Never replaces the body, an existing report, existing tasks, completed state or a title the person edited |
| Report | Summary, key resources, budget and timeline, with source links and a version history |
| Ask AI | A chat per note, with optional photos and city. Every proposed change needs **Apply** |
| Milestones | Snapshots the note before a new round of research, so the next round builds on progress |
| Tasks | Title, done, optional notes, Apple Reminders scheduling |
| Focus | Timer presets, Pomodoro, Screen Time app blocking, widgets |
| Streak | A device-only streak with a 4 AM day |
| Storage | Local JSON on the device, export and import, no sync |

## What carries over, and what doesn't

### Carried over

1. **Proposals, then Add.** AI never writes straight into the planner.
2. **Additions only.** No deleting, renaming or changing the done state of existing tasks.
3. **Stale check.** If the goal's tasks changed while a request was out, drop suggestions that now duplicate a task, and never touch anything else.
4. **Build on progress.** Every request sends done and open tasks.
5. **Key on the server, strict JSON schema, bounded request.**
6. **The prompt's rules:** small specific tasks, never repeat done work, never invent progress. Beans adds an estimate to each task.

### Changed

1. **It lives in lists**, not a separate notes app.
2. **Tasks come grouped by goal label**, so you can ask for more under one label.
3. **The report shrinks to a two-sentence plan** shown in the goal header.

### Left out

Generating on a typing pause, web research and citations, chat, steering, report history, milestone snapshots, attachments and city sent to AI, the focus timer with app blocking, the separate streak, and local-only storage.

## How it compares to Ellie's AI

The Ellie teardown (`dqships/ellie-teardown-report`) left Ellie's AI out of scope; it only notes MCP/API access (beta). This section comes from Ellie's public guide, read 2026-11-03: [AI Assistant](https://guide.ellieplanner.com/features/ai-assistant) and [MCP and API access](https://guide.ellieplanner.com/features/integrations/mcp-and-api-access).

What Ellie has:

- **AI Assistant (beta, Pro only).** A chat bubble at bottom right, turned on in Power Features. It works on the tasks you already have: create tasks with subtasks from what you type, label unlabelled tasks, add time estimates, "Timebox my day" around calendar events, find free time, suggest what to focus on, add repeats, and move many tasks at once. A "Require confirmation before modifying data" setting is opt-in, so by default it seems to change things directly. No provider or limits are named.
- **MCP / API access (beta).** Outside AI tools can read and write Ellie tasks, limited to read, write or both, and to chosen tools. The same key works for Zapier.

| | Ellie | Beans goal lists |
|---|---|---|
| Job | Arrange and edit the tasks you already know about | Work out what the tasks are, from a goal |
| Goals or projects | None | A list becomes a goal with its own labels |
| New tasks | Only the items you type | Suggests the steps itself, per label or for the whole goal, building on what's done |
| Labels | Applies your existing labels | Makes new labels for the goal |
| Estimates | Adds estimates to existing tasks | Every suggested task comes with one |
| Scheduling | "Timebox my day", free-time search | You plan the tasks yourself |
| Review | Opt-in confirmation | Always a proposal you approve |
| Interface | General chat | Buttons only |
| Outside AI tools | MCP and API (beta) | None |

Goal lists don't overlap Ellie: Ellie arranges work you already listed, Beans helps work out what the work is. Two Ellie features would fit Beans later because it already plans by estimates and the Timebox: "Add estimates to tasks without them" and "Timebox my day". They could reuse the same server action and review drawer.

## Data model

Beans already has most of the pieces (`packages/core/src/model.ts`): `List` has `autoLabelId`, `Label` has a name and one of 8 colors, and `Task` has one `labelId` and an `estimate`.

```ts
interface List {
  // existing fields…
  /** Set when the list is a goal. */
  goal: {
    outcome: string;          // "Run a half marathon by March 14"
    why: string;              // optional, "" when empty
    targetDate: DateKey | null;
    plan: string;             // two-sentence plan from the first suggestion round
  } | null;
}

interface Label {
  // existing fields…
  /** The goal list this label belongs to. `null` for everyday labels. */
  goalId: string | null;
}
```

- Goal labels show in the sidebar under their goal's name, and only that goal's list offers them in the label picker.
- A task has one label, so a goal task carries its goal label, not an everyday one like Work. Inside a goal that's the grouping that matters.
- Goal labels use the same 8 label colors. Pick ones the account's everyday labels don't use, and reuse colors only when all 8 are taken.

## AI setup

- **Provider:** OpenRouter's chat completions API, called from a Convex action. The key goes in Convex env as `OPENROUTER_API_KEY`, never in the browser.
- **Model:** `GOAL_MODEL` in `convex/goalModels.ts`, default `anthropic/claude-haiku-5.5` ($0.10 in, $0.50 out per million tokens). The file lists 93 models that take a strict JSON schema, with prices, context and tier. TypeScript rejects an id that isn't in the list.
- **Request:** `response_format` with a strict JSON schema; `provider: { require_parameters: true, data_collection: "deny" }` so OpenRouter only routes to providers that honor the schema and don't keep prompts; low reasoning effort on reasoning models; a timeout with a "Nothing changed, try again" error.
- **Cost:** a round is about 1,500 tokens in and 1,200 out, so about $0.00075 on the default model. At a cap of 20 rounds a day, one person's worst month is about $0.45, against $6 a month.
- **Refreshing the list:** run the command below and update the file's ids and prices by hand. Keep only models with `structured_outputs`, and skip `:batch` variants and `~…-latest` aliases.

```bash
curl -s https://openrouter.ai/api/v1/models | jq -r '.data[] | select(.supported_parameters | index("structured_outputs")) | [.id, (.pricing.prompt | tonumber * 1e6), (.pricing.completion | tonumber * 1e6), .context_length] | @tsv'
```

## Build plan

1. **Data:** `List.goal` and `Label.goalId` in core, Convex validators and schema, with defaults for existing rows.
2. **Core:** `packages/core/src/goals.ts` builds the request context (goal, labels, done and open tasks), checks a proposal against the schema and drops duplicate titles.
3. **Convex:** a `suggestGoalTasks` action (checks sign-in, subscription and the daily cap, calls OpenRouter, returns a proposal and writes nothing) and an `addGoalSuggestions` mutation that adds the kept labels and tasks through the existing ops.
4. **UI:** Make this a goal, the goal header with label progress, Plant a few more, More for the goal, and the proposal drawer. Tokens from `DESIGN.md` only.
5. **Legal:** the privacy policy names OpenRouter and says goal and task text goes to the model provider when you press a suggest button. The terms mention the daily cap.
6. **Tests:** adding suggestions never edits existing tasks; duplicates are dropped; the cap blocks the 21st round; a bad or late response changes nothing.

Rough size, for one person: about 4 days.

## Demo

Interactive mock with fixed sample suggestions, no real AI: https://claude.ai/artifact/6NmwHW3a1Vsv3NwyYEZp1j (private until shared).

- **Desktop, interactive:** Make this a goal, then Suggest labels and tasks, untick anything, then Add. Tick tasks to grow the label bars. Plant a few more on a label, or More for the goal. Tweaks has a Dark switch.
- **Phone, dark:** the goal view at 390 wide.
