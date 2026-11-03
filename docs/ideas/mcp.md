# Beans MCP

Status: planned for v1 on 2026-11-03, not built yet. Branch `claude/beans-mcp`.

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
3. **Clerk OAuth, if the free plan allows it.** If Clerk needs Pro for it, Beans uses API keys for now. See "Clerk on the free plan".
4. **Who gets it:** paying subscribers, people on the 7-day trial, and people on the 3-day no-card pass.
5. **MCP comes first.** People's own AI can plan their goals for them: make a list, add labels and tasks, and timebox it all. So Beans won't build AI goal planning into the app for now, and may never need to.
6. **Directory listings:** how to submit to Claude and ChatGPT, and what a domain change would do, are under "Directory listings" and "Changing the domain later".
7. **No competitor names on `main`.** Not in docs, code, comments or copy.

## Why it's worth it

1. **Beans pays nothing for AI.** People use their own AI subscription, and their model does the thinking. Beans only answers data requests.
2. **It covers many AI features at once.** Planning a day, reviewing a week and breaking a goal into tasks all become things the person's own AI can do with Beans' tools. There's no model, prompt or daily cap to maintain.
3. **It fits how Beans is built.** Every change in Beans is a small "op" (`packages/core/src/ops.ts`), and the server applies ops in `applyOne` (`convex/planner.ts`). MCP tools make the same ops as the app's buttons, so open Beans windows update live, and no second way to write the data appears.

## Tools

A few clear tools work better with AI apps than many small ones. The directories also reject catch-all tools, and want reading and changing kept in separate tools. 14 to start:

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

Every tool gets a `title` and all three hints set explicitly. ChatGPT requires all three, and Claude requires the first two:

- Reading tools: `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false`.
- Changing tools: `readOnlyHint: false`, `destructiveHint: true`, `openWorldHint: false`. Claude asks the person before every call to a tool marked destructive, which suits tools that change their planner.

Tool names stay under 64 characters. Descriptions say only what the tool does: no instructions to call other tools, and nothing that reads like steering the AI.

Left out at first: emptying Trash, deleting lists, settings, billing, account, templates, repeat rules and timers. Each is easy to add later if people ask.

## How it's built

### An MCP route in the Next.js app, with Clerk handling sign-in

Clerk already runs Beans' sign-in, and it has an official guide for an MCP server in a Next.js app. Clerk acts as the OAuth server: it shows the "Allow Claude to access Beans?" screen and issues the access token.

1. **Endpoint:** `https://beans.followusai.com/mcp`, a route in `apps/web` built with Vercel's `mcp-handler`, on the stateless Streamable HTTP transport.
2. **Sign-in:** `withMcpAuth` plus Clerk's `auth({ acceptsToken: 'oauth_token' })` check the token on every call. A call without a token gets a 401 with a `WWW-Authenticate` header that points at the protected resource metadata. Clerk's helpers serve the `.well-known` OAuth addresses. Those must stay public, so `proxy.ts` lets them through without Clerk's page handling or the markdown answers.
3. **Client registration:** turn on CIMD ("Publish CIMD support" in Clerk's OAuth applications settings). It's what the current MCP spec, Claude and ChatGPT prefer. Turn on DCR as well only if an AI app people use can't do CIMD. Keep Clerk's consent screen and PKCE on.
4. **Redirects to allow:** `https://claude.ai/api/mcp/auth_callback` for Claude on the web, desktop and phone. Loopback redirects on any port for Claude Code (`http://localhost:*` and `http://127.0.0.1:*`). `https://chatgpt.com/connector_platform_oauth_redirect` for ChatGPT.
5. **Reaching Convex:** the route has a Clerk OAuth token, not the Convex sign-in token the app uses. So a new `convex/mcp.ts` holds Convex functions that take the user id and a server-only secret (`MCP_SERVER_SECRET`). They check access, then run the same core functions and `applyOne` as the app. The user id has to match Beans' existing format, Convex's `tokenIdentifier` (issuer, a `|`, then the Clerk user id). A test proves the two match.
6. **Shared logic:** tools call the core functions the app already uses, such as `createTask`, `moveTask`, `setDone`, `deleteTask`, `createList` and `createLabel`, so rules like actual-time fill and Trash stay the same everywhere.
7. **Analytics:** the math lives in the analytics screen today (`apps/web/src/planner/Analytics.tsx`). Move it to `packages/core/src/analytics.ts` so the screen and `get_analytics` share one copy.
8. **Settings > Connected apps:** lists connected AI apps and lets people disconnect one.
9. **Help page:** `/connect-ai` with the address to paste and steps for Claude, ChatGPT and Cursor. Both directories need public setup docs, and this page is them.

### Clerk on the free plan

Clerk's pricing page doesn't list OAuth applications, CIMD or DCR as Pro features. Its MCP and OAuth guides mention no plan requirement either. Clerk's pricing FAQ says features that need an upgrade are tagged in the Dashboard.

- **Check before building:** open the production instance's OAuth applications page in the Clerk Dashboard and make sure nothing there has a Pro tag. No tag means Clerk OAuth. A tag means API keys.
- **Fallback, API keys:** Clerk's end-user API keys are on the free plan, capped at 1,000 keys created and 100,000 checks a month. That's enough to start, and Pro removes the caps. Note that ChatGPT's directory doesn't accept API-key connections, so the ChatGPT listing would wait for OAuth.
- Clerk's OAuth access tokens last 1 day, and refresh tokens don't expire, so people stay connected.

### Who can use it

Access follows `requireAccess`: an active subscription, the 7-day trial or the 3-day no-card pass. When access ends, tools return a clear "Your Beans trial has ended" error with the plans link, and nothing changes.

## Limits and safety

- **Rate limits per account:** for example 60 calls a minute and 1,000 changes a day, plus the 50-task batch cap. That stops a runaway agent without getting in a normal person's way.
- **Prompt injection:** task titles and notes go back to the person's AI, and text pasted into a note could try to steer it. The tools only touch that person's own data and can't send anything anywhere, deletes go to Trash, and batches are capped, so the worst case can be undone.
- **Clear errors:** both directories reject generic errors. Every error says what went wrong and what to do.
- **Privacy policy:** says that when you connect an AI app, Beans sends it the data it asks for, and the AI provider's own policy then applies. A missing or incomplete privacy policy gets a directory submission rejected straight away.
- **Terms:** changes made through a connected AI app count as the person's own.

## Directory listings

Getting listed means people find Beans inside Claude or ChatGPT and connect with one click. Without a listing, people can still connect by pasting the `/mcp` address as a custom connector.

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
3. **Domain check:** the portal gives a token, which Beans serves as plain text at `https://beans.followusai.com/.well-known/openai-apps-challenge`.
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

Beans runs on `beans.followusai.com`, and the MCP address, Clerk's sign-in domain (`clerk.beans.followusai.com`) and both directory listings would all be tied to it. Moving to a new domain later would mean:

1. **Every connected AI app has to reconnect.** The MCP address and the OAuth server address both change, so existing tokens stop working. The old address can redirect for a while, but people still sign in again.
2. **Claude:** the listing's slug stays. Changing the server address isn't self-serve; email mcp-review@anthropic.com first. Any auth change waits for a reviewer, so keep the old address working until the new one is approved.
3. **ChatGPT:** the domain can't change within a plugin. A new domain means a new plugin with its own domain check, submission and review. OpenAI's docs also mention asking support, so ask them first. The old listing keeps working only while the old address does.
4. **Beans' own user ids.** This applies with or without MCP. Beans stores every record under Convex's `tokenIdentifier`, which starts with Clerk's issuer address. If Clerk's sign-in domain changes, every user gets a new id and their data stops matching. A domain move needs a migration that rewrites `userId` on every table, or Beans switches to Clerk's user id alone before launch.

So if a new domain is likely, move before submitting to the directories, ideally before launch.

## Cost

No model cost. Each call is one Vercel function run plus one or two Convex calls, about what a page load costs, and the rate limits keep the worst case small.

## Build plan

1. Check the Clerk Dashboard for a Pro tag on OAuth applications. Five minutes.
2. Move the analytics math to core, with tests. Half a day.
3. `convex/mcp.ts`: secret check, user id, access check, and one function per tool on top of the core functions, with tests. One day.
4. The `/mcp` route, Clerk OAuth with CIMD, the `.well-known` addresses and the `proxy.ts` change. One day.
5. Tool definitions: input schemas, descriptions, titles, hints and compact outputs. One day.
6. Connected apps in Settings, the `/connect-ai` help page, rate limits. One day.
7. Test with the MCP Inspector, Claude, Claude Code, ChatGPT and Cursor. Half a day.
8. Privacy policy and terms. Half a day.
9. Demo account and both directory submissions. Half a day, plus waiting for review.

About 6 days for one person, plus review time.

## Sources

- [Clerk: Build an MCP server in your Next.js app](https://clerk.com/docs/nextjs/guides/ai/mcp/build-mcp-server), [How Clerk implements OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth), [Client ID Metadata Documents](https://clerk.com/docs/guides/configure/auth-strategies/oauth/client-id-metadata-documents), [Verifying OAuth tokens](https://clerk.com/docs/nextjs/guides/development/verifying-oauth-access-tokens), [Pricing](https://clerk.com/pricing)
- [MCP authorization spec, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- Claude: [Submitting a connector](https://claude.com/docs/connectors/building/submission), [Review criteria](https://claude.com/docs/connectors/building/review-criteria), [Authentication](https://claude.com/docs/connectors/building/authentication), [Publishing](https://claude.com/docs/directory/publish), [After publishing](https://claude.com/docs/connectors/building/after-publishing), [Managing your listing](https://claude.com/docs/connectors/building/managing-your-listing)
- ChatGPT: [Submission](https://developers.openai.com/plugins/deploy/submission), [Review](https://developers.openai.com/plugins/deploy/app-review), [Guidelines](https://developers.openai.com/plugins/plugin-guidelines), [Auth](https://developers.openai.com/plugins/build/auth)
