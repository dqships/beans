# Beans MCP

Status: built on 2026-11-03 (branch `claude/beans-mcp-server`). "As built" below lists where the build differs from this plan.

## The idea, in DQ's words

> An MCP for Beans interests me so users can connect it to their existing AI tools and have it create lists, tasks, timebox stuff, read analytics, etc.

## What it is

An MCP server is a web address that AI apps such as Claude, ChatGPT and Cursor can connect to. Once someone connects Beans, their AI can read their planner and make changes in it. They sign in to Beans once and approve access. After that they can say things like:

- "Put these six things in my Brain Dump."
- "Make a list called Half marathon, add labels for training, gear and race day, and fill it with a 16-week plan with estimates."
- "What's left on today? Move anything I won't get to onto tomorrow."
- "Timebox my afternoon from 1pm, longest tasks first."
- "How many hours went to Work last week, and how far off were my estimates?"

## Decisions (DQ, 2026-11-03)

1. **Part of v1.** This replaces "MCP: out for now" in `RESEARCH.md`.
2. **Reading and changing from day one.**
3. **Clerk OAuth.** DQ checked the Clerk Dashboard: OAuth applications carry no Pro tag, so it works on the free plan. No API keys.
4. **Who gets it:** paying subscribers, people on the 7-day trial, and people on the 3-day no-card pass.
5. **MCP comes first.** People's own AI can plan their goals for them: make a list, add labels and tasks, and timebox it all. So Beans won't build AI goal planning into the app for now, and may never need to.
6. **Directory listings:** how to submit to Claude and ChatGPT, and what a domain change would do, are under "Directory listings" and "Changing the domain later".
7. **No competitor names on `main`.** Not in docs, code, comments or copy.
8. **The MCP address is `https://mcp.beans.followusai.com/mcp`.** A host of its own, so the MCP could later move to a separate service without changing the address.
9. **No directory submissions for now.** People connect by pasting the MCP address into Claude, ChatGPT, Cursor or another MCP app. The directory steps below stay for later.
10. **Beans will move off `followusai.com` eventually,** but not in the foreseeable future. Beans lists on the current domain now and handles the move when it comes (see "Changing the domain later").

## Why it's worth it

1. **Beans pays nothing for AI.** People use their own AI subscription, and their model does the thinking. Beans only answers data requests.
2. **It covers many AI features at once.** Planning a day, reviewing a week and breaking a goal into tasks all become things the person's own AI can do with Beans' tools. There's no model, prompt or daily cap to maintain.
3. **It fits how Beans is built.** Every change in Beans is a small "op" (`packages/core/src/ops.ts`), and the server applies ops in `applyOne` (`convex/planner.ts`). MCP tools make the same ops as the app's buttons, so open Beans windows update live, and no second way to write the data appears.

## Tools

A few clear tools work better with AI apps than many small ones. The directories also reject catch-all tools, and want reading and changing kept in separate tools. 19 in v1, plus server instructions and four prompts:

### Reading

| Tool | What it returns |
|---|---|
| `get_overview` | Today's date in the user's time zone, workday limit, lists, labels, and counts for today and the Brain Dump |
| `get_day` | One day's tasks in order, with Timebox times, estimates, actual time and the day's total against the workday limit |
| `get_week` | A whole week in one call: each day's tasks and totals against the workday limit. Weekly planning takes one call instead of seven |
| `list_tasks` | Tasks filtered by days, list, Brain Dump, label, done or not, and due date. Compact rows with ids |
| `search_tasks` | Title and notes search, using the existing `search_title` index |
| `get_task` | One task in full: notes, subtasks, time, repeat, due date, priority |
| `get_analytics` | For a date range: time and task counts by label, per day, estimate against actual, and the completed tasks list |

### Changing

| Tool | What it does |
|---|---|
| `create_tasks` | Up to 50 tasks at once, each in the Brain Dump, a list or a day, with optional label, estimate, start time, due date, priority, notes and subtasks |
| `update_task` | Title, notes, label, estimate, actual time, due date, priority |
| `update_subtasks` | Adds, ticks, renames, reorders or removes subtasks on an existing task, so "break this into steps" works after a task exists |
| `set_done` | Marks tasks done or not done, using the same rules as the checkbox (actual-time fill, subtasks) |
| `move_tasks` | Moves tasks to a day, a list or the Brain Dump |
| `timebox_task` | Sets or clears a task's start time on its day, and warns when it overlaps or runs past midnight |
| `set_repeat` | Makes a task repeat ("every weekday", "every 2 weeks on Monday") or stops it repeating, using `packages/core/src/repeat.ts` |
| `log_time` | Adds actual minutes to a task ("I spent 40 minutes on the report"), so analytics stays right for people who don't run the timer |
| `create_list` | A new list with a name, icon and optional auto label |
| `create_label` | A new label in one of the 8 label colors |
| `delete_tasks` | Moves tasks to Trash, where they can be restored for 30 days. Nothing is deleted for good |
| `restore_tasks` | Brings tasks back from Trash, so the AI can undo its own mistake |

Every tool gets a `title` and all three hints set explicitly. ChatGPT requires all three, and Claude requires the first two:

- Reading tools: `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`.
- Changing tools: `readOnlyHint: false`, `destructiveHint: true`, `openWorldHint: false`. Claude asks the person before every call to a tool marked destructive, which suits tools that change their planner.

Tool names stay under 64 characters. Descriptions say only what the tool does: no instructions to call other tools, and nothing that reads like steering the AI.

### Server instructions

MCP lets a server send one short text to every AI app that connects. Beans' explains how the planner works, so the AI uses the tools the way Beans means them:

- The Brain Dump holds undated tasks; lists hold undated tasks by topic; days hold planned tasks.
- The Timebox gives a planned task a start time, and its block length comes from the estimate.
- Estimates and actual time are in minutes, and each day has a workday limit.
- Deleting moves tasks to Trash for 30 days, and `restore_tasks` brings them back.
- Dates are `YYYY-MM-DD` in the person's time zone, from `get_overview`.

It describes Beans only. It never tells the AI to call tools it wasn't asked to call.

### Prompts

Ready-made commands that show up in Claude and other apps, so people don't have to know what to ask. Each is a short template that points the AI at the right tools:

| Prompt | What it does |
|---|---|
| Plan my day | Reads today, the Brain Dump and anything overdue, suggests what fits the workday limit, then plans and timeboxes what the person agrees to |
| Weekly review | Reads last week's analytics and next week's days, sums up what got done and how estimates held up, and suggests next week's plan |
| Shutdown | Reviews today's done and not-done tasks and moves unfinished ones where the person wants them |
| Clean up my Brain Dump | Groups Brain Dump tasks, suggests what to plan, move to a list or delete, and acts only on what the person approves |

### After launch

Worth adding once people are using it:

1. `update_list` and `delete_list`: rename a list, change its icon or auto label, or move it to Trash (`deleteList` and `restoreList` already exist in core).
2. Stale-task analytics: Brain Dump tasks by age and long-overdue tasks, so "help me clean up" has data behind it.
3. Templates: list them and create a task from one ("Add my weekly review template to Friday"), using `taskFromTemplate`.

### Left out

- Emptying Trash or deleting anything for good: an AI mistake there can't be undone.
- Settings, billing and account: little benefit, and real risk.
- Starting and stopping the timer: Beans has one active timer per person, so an AI starting it would surprise people. `log_time` covers the need.
- Calendar events: Beans doesn't connect to calendars yet.

## How it's built

### An MCP route in the Next.js app, with Clerk handling sign-in

Clerk already runs Beans' sign-in, and it has an official guide for an MCP server in a Next.js app. Clerk acts as the OAuth server: it shows the "Allow Claude to access Beans?" screen and issues the access token.

1. **Endpoint:** `https://mcp.beans.followusai.com/mcp`. It's still a route in `apps/web`, built with Vercel's `mcp-handler` on the stateless Streamable HTTP transport, so there's one codebase and one deploy. `mcp.beans.followusai.com` is added to the same Vercel project with one DNS record in Cloudflare. On that host, `proxy.ts` serves only `/mcp` and the `.well-known` addresses and returns 404 for everything else; the app host doesn't serve `/mcp`. The protected resource metadata's `resource` is exactly `https://mcp.beans.followusai.com/mcp`.
2. **Sign-in:** `withMcpAuth` plus Clerk's `auth({ acceptsToken: 'oauth_token' })` check the token on every call. A call without a token gets a 401 with a `WWW-Authenticate` header that points at the protected resource metadata. Clerk's helpers serve the `.well-known` OAuth addresses. Those must stay public, so `proxy.ts` lets them through without Clerk's page handling or the markdown answers.
3. **Client registration:** turn on CIMD ("Publish CIMD support" in Clerk's OAuth applications settings). It's what the current MCP spec, Claude and ChatGPT prefer. Turn on DCR as well only if an AI app people use can't do CIMD. Keep Clerk's consent screen and PKCE on.
4. **Redirects to allow:** `https://claude.ai/api/mcp/auth_callback` for Claude on the web, desktop and phone. Loopback redirects on any port for Claude Code (`http://localhost:*` and `http://127.0.0.1:*`). `https://chatgpt.com/connector_platform_oauth_redirect` for ChatGPT.
5. **Reaching Convex:** the route has a Clerk OAuth token, not the Convex sign-in token the app uses. So a new `convex/mcp.ts` holds Convex functions that take the user id and a server-only secret (`MCP_SERVER_SECRET`). They check access, then run the same core functions and `applyOne` as the app. Since PR #26 Beans keys data by the plain Clerk user id, which is the OAuth token's `sub`, so the app and the MCP server see the same rows. A test proves it.
6. **Shared logic:** tools call the core functions the app already uses, such as `createTask`, `moveTask`, `setDone`, `deleteTask`, `createList` and `createLabel`, so rules like actual-time fill and Trash stay the same everywhere.
7. **Analytics:** the math lives in the analytics screen today (`apps/web/src/planner/Analytics.tsx`). Move it to `packages/core/src/analytics.ts` so the screen and `get_analytics` share one copy.
8. **Settings > Connected apps:** lists connected AI apps and lets people disconnect one.
9. **Help page:** `/connect-ai` with the address to paste and steps for Claude, ChatGPT and Cursor. Both directories need public setup docs, and this page is them.

### Clerk on the free plan

Confirmed on 2026-11-03: the OAuth applications page in the Clerk Dashboard has no Pro tag. Clerk's pricing FAQ says features that need an upgrade carry one, and its pricing page and MCP and OAuth guides name no plan requirement either.

- Clerk's OAuth access tokens last 1 day, and refresh tokens don't expire, so people stay connected.
- When building, turn on "Publish CIMD support" (and DCR only if needed) in the development instance first, then production.

### Who can use it

Access follows `requireAccess`: an active subscription, the 7-day trial or the 3-day no-card pass. When access ends, tools return a clear "Your Beans trial has ended" error with the plans link, and nothing changes.

## Limits and safety

- **Rate limits per account:** for example 60 calls a minute and 1,000 changes a day, plus the 50-task batch cap. That stops a runaway agent without getting in a normal person's way.
- **Prompt injection:** task titles and notes go back to the person's AI, and text pasted into a note could try to steer it. The tools only touch that person's own data and can't send anything anywhere, deletes go to Trash, and batches are capped, so the worst case can be undone.
- **Clear errors:** both directories reject generic errors. Every error says what went wrong and what to do.
- **Privacy policy:** says that when you connect an AI app, Beans sends it the data it asks for, and the AI provider's own policy then applies. A missing or incomplete privacy policy gets a directory submission rejected straight away.
- **Terms:** changes made through a connected AI app count as the person's own.

## Directory listings

Getting listed means people find Beans inside Claude or ChatGPT and connect with one click. Without a listing, people can still connect by pasting `https://mcp.beans.followusai.com/mcp` as a custom connector.

### Claude Connectors Directory

1. **Who can submit:** a Claude Pro, Max, Ultra, Team or Enterprise account. A free account can't. There's no partner program to join first.
2. **Where:** https://claude.ai/directory/manage, then Submit new, then MCP connector.
3. **What the server needs:** HTTPS, OAuth with PKCE (S256), a 401 with `WWW-Authenticate` pointing at the protected resource metadata, that metadata's `resource` matching the MCP address exactly, CIMD or DCR, the redirects listed above, and discovery and token answers within 10 seconds. Every tool needs a title and its hints.
4. **What you fill in:** name, a one-line summary, a description, categories, an icon, the docs URL (`/connect-ai`), the privacy policy URL, a support contact, company details, data handling answers, and 7 policy acknowledgements. The listing's URL slug can't change later.
5. **Reviewer account:** a filled-in Beans account the reviewer can sign in to with a password and no email code or second factor, plus step-by-step instructions. You also confirm you ran every tool through the MCP Inspector or as a custom connector in Claude.
6. **Review:** an automatic policy scan lists it as a Community connector. Some get a person testing each tool for the Verified label. No timeline is given.
7. **After approval:** press Publish. Later server changes go live without resubmitting. Changes to the listing text, auth setup or display name wait for a reviewer.

### ChatGPT

OpenAI now calls these plugins. A plain MCP server with tools is enough, with no custom UI needed.

1. **Who can submit:** an OpenAI platform organization owner, or a member with the Apps Management Write permission, with identity verification done. Individual verification publishes under DQ's name, and business verification under FollowUs AI LLC. The project must not use EU data residency.
2. **Where:** https://platform.openai.com/plugins, then Upload new or existing plugin.
3. **Domain check:** the portal gives a token, which Beans serves as plain text at `https://mcp.beans.followusai.com/.well-known/openai-apps-challenge`.
4. **What the server needs:** public HTTPS, OAuth 2.1 with PKCE (S256), protected resource metadata, the token's audience set from the `resource` parameter, and the ChatGPT redirect above. API-key connections aren't accepted.
5. **What you fill in:** name (30 characters), short description (30), long description (4,000), developer name, a square icon and logo of at least 48 px, privacy, support and terms URLs, and example prompts.
6. **Reviewer material:** a demo account with sample data and no MFA or email codes, 5 test prompts that should work (each with the tools it triggers and the expected result), 3 that shouldn't, a video walkthrough, and release notes.
7. **Review:** automatic scans plus a person. Feedback comes by email, with no timeline given.
8. **After approval:** press Publish. OpenAI rescans the server every day. Changed tools go live after checks, and new tools wait for approval. Listing text changes need a new submission.

### Before submitting to either

- A Beans demo account with sample data and an active subscription (comped), signing in with a password only. Check that Clerk doesn't ask the reviewer for an email code on a new device.
- `/connect-ai`, the privacy policy update and support contact are live.
- Every tool has been run through the MCP Inspector, Claude and ChatGPT.

## Changing the domain later

Beans will move off `followusai.com` eventually, but not in the foreseeable future. The MCP address (`mcp.beans.followusai.com`), Clerk's sign-in domain (`clerk.beans.followusai.com`) and both directory listings are tied to the current domain. The move will mean:

1. **Every connected AI app has to reconnect.** The MCP address and the OAuth server address both change, so existing tokens stop working. The old address can redirect for a while, but people still sign in again.
2. **Claude:** the listing's slug stays. Changing the server address isn't self-serve; email mcp-review@anthropic.com first. Any auth change waits for a reviewer, so keep the old address working until the new one is approved.
3. **ChatGPT:** the domain can't change within a plugin. A new domain means a new plugin with its own domain check, submission and review. OpenAI's docs also mention asking support, so ask them first. The old listing keeps working only while the old address does.
4. **Beans' own user ids.** This applies with or without MCP. Beans used to store every record under Convex's `tokenIdentifier`, which starts with Clerk's issuer address, so a new Clerk sign-in domain would have given every user a new id. A domain move needed a migration that rewrites `userId` on every table, or a switch to Clerk's user id alone. PR #26 made that switch, so a Clerk domain change no longer affects user ids.

Because the move isn't soon, Beans lists on `mcp.beans.followusai.com` now and accepts a reconnect and a new ChatGPT listing when it happens. At move time: keep the old addresses running and redirecting until both directories show the new one, email Anthropic before switching, and ask OpenAI support before submitting the new plugin.

## Cost

No model cost. Each call is one Vercel function run plus one or two Convex calls, about what a page load costs, and the rate limits keep the worst case small.

## Build plan

1. Move the analytics math to core, with tests. Half a day.
2. `convex/mcp.ts`: secret check, user id, access check, and one function per tool on top of the core functions, with tests. One day.
3. The `/mcp` route on `mcp.beans.followusai.com` (Vercel domain, DNS record, `proxy.ts` host rules), Clerk OAuth with CIMD and the `.well-known` addresses. One day.
4. The 19 tools (input schemas, descriptions, titles, hints and compact outputs), the server instructions and the four prompts. Two days.
5. Connected apps in Settings, the `/connect-ai` help page, rate limits. One day.
6. Test with the MCP Inspector, Claude, Claude Code, ChatGPT and Cursor. Half a day.
7. Privacy policy and terms. Half a day.

About 7 days for one person. A directory submission later adds a demo account and half a day, plus review time.

## As built (2026-11-03)

- **Where things live:** `convex/mcp.ts` (one Convex function per tool, plus `connections`, `disconnect` and `reconnect`), `apps/web/src/mcp/` (tools, instructions, prompts, Clerk token check), `apps/web/src/app/mcp/route.ts`, the `.well-known` routes, and the host rules in `apps/web/src/proxy.ts`. Analytics math is in `packages/core/src/analytics.ts`, notes text conversion in `packages/core/src/notes.ts`.
- **Reading tools are Convex mutations too,** so every call counts toward the rate limit and makes repeating-task instances for the days it reads, as the app does.
- **Rate limits:** 60 calls a minute and 1,000 changes a day (UTC) per account, kept in the `mcpUsage` table. A change is one task, list, label or subtask edit batch.
- **Disconnect stays until Reconnect.** Clerk's access tokens carry no grant id, so a refreshed token can't be told apart from a new sign-in. A disconnected app is refused whatever token it brings until the person chooses Reconnect in Settings > Connected apps. Apps are named from their client metadata document (`client_name`), so Claude Code shows as "Claude Code".
- **`search_tasks` searches titles only,** using the `search_title` index. Notes aren't indexed.
- **`restore_tasks` puts tasks on today,** the same rule as Beans' Trash.
- **`get_overview` counts overdue tasks from the last 14 days,** the rollover window.
- **Local tests:** the local test sign-in's tokens also work on `/mcp` in test runs (never in a production build), so `e2e/mcp.spec.ts` drives the real route against the local backend.
- **Tested:** every tool and prompt through the MCP Inspector CLI with a real Clerk development OAuth token, got with Claude Code's own CIMD client (PKCE S256, loopback redirect) and Clerk's consent screen ("Claude Code wants to access Beans"). A refresh-token exchange works. Not tested: Claude Code's own `/mcp` sign-in (its CLI here isn't signed in to a Claude account), Claude on the web, ChatGPT (needs DQ's account) and Cursor.

## Sources

- [Clerk: Build an MCP server in your Next.js app](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server), [How Clerk implements OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth), [Client ID Metadata Documents](https://clerk.com/docs/guides/configure/auth-strategies/oauth/client-id-metadata-documents), [Verifying OAuth tokens](https://clerk.com/docs/nextjs/guides/development/verifying-oauth-access-tokens), [Pricing](https://clerk.com/pricing)
- [MCP authorization spec, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- Claude: [Submitting a connector](https://claude.com/docs/connectors/building/submission), [Review criteria](https://claude.com/docs/connectors/building/review-criteria), [Authentication](https://claude.com/docs/connectors/building/authentication), [Publishing](https://claude.com/docs/directory/publish), [After publishing](https://claude.com/docs/connectors/building/after-publishing), [Managing your listing](https://claude.com/docs/connectors/building/managing-your-listing)
- ChatGPT: [Submission](https://developers.openai.com/plugins/deploy/submission), [Review](https://developers.openai.com/plugins/deploy/app-review), [Guidelines](https://developers.openai.com/plugins/plugin-guidelines), [Auth](https://developers.openai.com/plugins/build/auth)
