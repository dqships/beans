# Beans MCP (idea)

Status: idea only, nothing built. Branch `claude/beans-mcp`, started 2026-11-03.

## The idea, in DQ's words

> An MCP for Beans interests me so users can connect it to their existing AI tools and have it create lists, tasks, timebox stuff, read analytics, etc.

## What it is

An MCP server is a web address that AI apps such as Claude, ChatGPT and Cursor can connect to. Once someone connects Beans, their AI can read their planner and make changes in it. They sign in to Beans once and approve access. After that they can say things like:

- "Put these six things in my Brain Dump."
- "Make a list called Half marathon and fill it with a 16-week plan, with estimates."
- "What's left on today? Move anything I won't get to onto tomorrow."
- "Timebox my afternoon from 1pm, longest tasks first."
- "How many hours went to Work last week, and how far off were my estimates?"

## Why it's worth it

1. **Beans pays nothing for AI.** People use their own AI subscription, and their model does the thinking. Beans only answers data requests.
2. **It covers a lot of AI features at once.** Breaking a goal into tasks, planning a day and reviewing a week all become things the person's own AI can do with Beans' tools. There's no model, prompt or daily cap for Beans to maintain.
3. **Ellie has it.** Ellie offers MCP and API access in beta. Its limits are read-only, write-only or both, plus an allowed-tools list. Its key is an API token pasted into the AI app. Beans can match that with a better sign-in flow.
4. **It fits how Beans is built.** Every change in Beans is a small "op" (`packages/core/src/ops.ts`). The server applies ops in `applyOne` (`convex/planner.ts`). MCP tools can make the same ops as the app's buttons, so open Beans windows update live and nothing new can write to the data.

It reverses one call: `RESEARCH.md` lists MCP under "Out for now". See Open decisions.

## Tools

Few, clear tools work better with AI apps than many small ones. 14 to start:

### Reading

| Tool | What it returns |
|---|---|
| `get_overview` | Today's date in the user's time zone, workday limit, lists, labels, and counts for today and the Brain Dump |
| `get_day` | One day's tasks in order, with Timebox times, estimates, actual time and the day's total against the workday limit |
| `list_tasks` | Tasks filtered by days, list, Brain Dump, label, done or not, and due date. Compact rows with ids |
| `search_tasks` | Title and notes search, using the existing `search_title` index |
| `get_task` | One task in full: notes, subtasks, time, repeat, due date, priority |
| `get_analytics` | For a date range: time and task counts by label, per day, estimate against actual, and the completed tasks list |

### Changing

| Tool | What it does |
|---|---|
| `create_tasks` | Up to 50 tasks at once, each in the Brain Dump, a list or a day, with optional label, estimate, start time, due date, priority, notes and subtasks |
| `update_task` | Title, notes, label, estimate, actual time, due date, priority |
| `set_done` | Marks tasks done or not done, using the same rules as the checkbox (actual-time fill, subtasks) |
| `move_tasks` | Moves tasks to a day, a list or the Brain Dump |
| `timebox_task` | Sets or clears a task's start time on its day, and warns when it overlaps or runs past midnight |
| `create_list` | A new list with a name, icon and optional auto label |
| `create_label` | A new label in one of the 8 label colors |
| `delete_tasks` | Moves tasks to Trash, where they can be restored for 30 days. Nothing is deleted for good |

Every tool is marked read-only, or as changing data, using MCP's tool hints. AI apps use those hints to decide when to ask the person first. `delete_tasks` is also marked destructive, even though Trash can undo it.

Left out at first: emptying Trash, deleting lists, settings, billing, account, templates, repeat rules, and timers. Each is easy to add later if people ask.

## How it would be built

### Recommended: an MCP route in the Next.js app, with Clerk handling sign-in

Clerk already runs Beans' sign-in, and it has an official guide for adding an MCP server to a Next.js app. Clerk acts as the OAuth server: it shows the "Allow Claude to access Beans?" screen and issues the access token.

1. **Endpoint:** `https://beans.followusai.com/mcp`, a route in `apps/web` built with Vercel's `mcp-handler`. It uses the stateless Streamable HTTP transport.
2. **Sign-in:** `withMcpAuth` plus Clerk's `auth({ acceptsToken: 'oauth_token' })` check the token on every call. Clerk's helpers serve the two `.well-known` OAuth discovery addresses. Those must stay public, so `proxy.ts` needs to let them through without running Clerk's page handling or the markdown answers.
3. **Reaching Convex:** the route has a Clerk OAuth token, not the Convex sign-in token the app uses. So a new `convex/mcp.ts` holds Convex functions that take the user id and a server-only secret (`MCP_SERVER_SECRET`). They run `requireAccess` (subscription) and then the same core functions and `applyOne` as the app. The user id has to match Beans' existing format, Convex's `tokenIdentifier` (issuer, a `|`, then the Clerk user id). A test should prove the two match.
4. **Shared logic:** tools call the core functions the app already uses, such as `createTask`, `moveTask`, `setDone`, `deleteTask`, `createList` and `createLabel`, so rules like actual-time fill and Trash stay the same everywhere.
5. **Analytics:** the math lives in the analytics screen today (`apps/web/src/planner/Analytics.tsx`). Move it to `packages/core/src/analytics.ts` so the screen and `get_analytics` share one copy.
6. **Settings > Connected apps:** lists connected AI apps and lets people disconnect one. Check that Clerk's OAuth consent records support this before building.
7. **Help page:** `/connect-ai` with the address to paste and steps for Claude, ChatGPT and Cursor.

### Other ways, not recommended now

| Option | Why not first |
|---|---|
| Convex's MCP component (`@convex-dev/mcp`) | Runs on Convex with its own OAuth server, but sign-in would still need wiring to Clerk, and its install notes call it alpha |
| API keys, like Ellie | Simplest to build, but people copy a secret into each AI app, and some apps only take OAuth. Worth adding later for Zapier and scripts |

### Spec details to check before building

The current MCP authorization spec (2026-07-28) requires protected resource metadata (RFC 9728) and resource indicators (RFC 8707). It keeps dynamic client registration only for older servers and prefers Client ID Metadata Documents. Clerk's guide relies on dynamic client registration. Check whether Clerk supports Client ID Metadata Documents now, and test with the AI apps people actually use.

## Limits and safety

- **Subscribers only,** checked on every call with the existing `requireAccess`.
- **Two scopes:** read only, or read and change. People choose when they connect.
- **Rate limits per account:** for example 60 calls a minute and 1,000 changes a day, plus the 50-task batch cap. That stops a runaway agent without getting in a normal person's way.
- **Prompt injection:** task titles and notes go back to the person's AI, and text pasted into a note could try to steer it. The tools only touch that person's own data and can't send anything anywhere, deletes go to Trash, and batches are capped, so the worst case can be undone.
- **Privacy policy:** says that when you connect an AI app, Beans sends it the data it asks for, and that the AI provider's own policy then applies.
- **Terms:** changes made through a connected AI app count as the person's own.

## Cost

No model cost. Each call is one Vercel function run plus one or two Convex calls, about what a page load costs. The rate limits keep the worst case small.

## Open decisions for DQ

1. **In v1, or after launch?** `RESEARCH.md` has MCP under "Out for now".
2. **Changes from day one, or read-only first?** Read-only is safer to launch. Changes are where the value is.
3. **Sign-in:** Clerk OAuth (recommended), API keys, or both?
4. **Who gets it:** paying subscribers only, or the 7-day trial and the 3-day no-card pass too?
5. **The goal lists idea:** does MCP replace it, come first, or ship alongside it?
6. **Listing:** submit Beans to the Claude and ChatGPT connector directories later?

## Build plan

1. Move the analytics math to core, with tests. Half a day.
2. `convex/mcp.ts`: secret check, user id, access check, and one function per tool on top of the core functions, with tests. One day.
3. The `/mcp` route, Clerk OAuth, the `.well-known` addresses and the `proxy.ts` change. One day.
4. Tool definitions: input schemas, descriptions, hints and compact outputs. One day.
5. Connected apps in Settings, the `/connect-ai` help page, rate limits. One day.
6. Test with the MCP Inspector, Claude, ChatGPT and Cursor. Half a day.
7. Privacy policy and terms. Half a day.

About 5 to 6 days for one person.

## Sources

- [Clerk: Build an MCP server in your Next.js app](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server), with the example repo [clerk/mcp-nextjs-example](https://github.com/clerk/mcp-nextjs-example) and [clerk/mcp-tools](https://github.com/clerk/mcp-tools)
- [MCP authorization spec, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [Convex MCP component](https://www.convex.dev/components/mcp)
- [Ellie: MCP and API access](https://guide.ellieplanner.com/features/integrations/mcp-and-api-access)
