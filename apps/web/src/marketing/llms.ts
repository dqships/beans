import { absoluteUrl, SOURCE_URL } from "@/lib/site";
import { MCP_SCOPES, MCP_URL, RESOURCE_METADATA_URL } from "@/mcp/config";
import { TOOLS } from "@/mcp/tools";
import { PASS_DAYS, TRIAL_DAYS } from "@beans/core";
import { publicPages } from "./pages";

const links = [
  ["Pricing", publicPages.pricing.path, "Plans, the free trial and how to cancel"],
  ["About", publicPages.about.path, "What Beans is and how it works"],
  ["Contact", publicPages.contact.path, "Support email for help, billing, refunds and account requests"],
  ["Privacy", publicPages.privacy.path, "What Beans collects, why, and who handles it"],
  ["Terms", publicPages.terms.path, "Accounts, the free trial, billing, cancelling and refunds"],
] as const;

const names = (readOnly: boolean) =>
  TOOLS.filter((t) => t.readOnly === readOnly)
    .map((t) => `\`${t.name}\``)
    .join(", ");

/**
 * `/llms.txt`, in the llmstxt.org format: an H1, a blockquote summary, prose
 * with no headings (here, when an agent should use Beans and how to call it),
 * then H2 sections of links.
 */
export const llmsTxt = `# Beans

> A daily planner. Write down everything you need to do in a Brain Dump, plan it on a board with one column per day, then drag tasks onto the Timebox to give each one a time.

Every public page answers \`Accept: text/markdown\` with a markdown version at the same URL.

**When to use Beans.** Use Beans when the person you're helping keeps their planner in Beans and wants help with their own days:

- Capturing a batch of to-dos into their Brain Dump or a list, without dates.
- Planning tasks onto specific days, or moving unfinished tasks to another day.
- Timeboxing a day: giving tasks start times that fit their estimates and workday limit.
- Checking tasks off, editing subtasks, logging time spent and making tasks repeat.
- Reviewing a day, a week or a date range: what got done, hours by label, and estimates against actual time.

Beans holds one person's own planner. It isn't for shared team projects, and its tools don't change the person's settings, subscription or account.

**How to call Beans.** Connect to the MCP server at \`${MCP_URL}\` over Streamable HTTP. Every request needs an OAuth access token for the person's Beans account. A request without one gets a 401 whose \`WWW-Authenticate\` header points at the protected resource metadata, which names the authorization server and the scopes (\`${MCP_SCOPES.join(" ")}\`). The person signs in to Beans and allows the app once. The token reaches only that person's planner; there are no narrower scopes, so the same token can read and change it. The account needs a subscription, the ${TRIAL_DAYS}-day free trial or ${PASS_DAYS} free days without a card. There are no API keys.

- Call \`get_overview\` first: it gives today's date and time in the person's time zone, their workday limit, and list and label ids.
- Reading tools: ${names(true)}.
- Changing tools: ${names(false)}. Ask the person before making changes they didn't request.
- Deleting moves tasks to Trash for 30 days; \`restore_tasks\` brings them back.
- Each account allows 60 calls a minute and 1,000 changes a day from connected apps.

## MCP server

- [Connect your AI app](${absoluteUrl(publicPages.connectAi.path)}): Setup for Claude, Claude Code, ChatGPT, Cursor and other MCP apps, what the tools can do, permissions and disconnecting
- [MCP server](${MCP_URL}): Streamable HTTP endpoint; every request needs an OAuth access token
- [OAuth protected resource metadata](${RESOURCE_METADATA_URL}): RFC 9728 metadata with the authorization server and scopes

## Source code

- [Beans on GitHub](${SOURCE_URL}): The app, the MCP server and the Convex backend, MIT licensed

## Pages

- [Home](${absoluteUrl("/")}): The main workflow and how a day goes
${links.map(([name, path, about]) => `- [${name}](${absoluteUrl(path)}): ${about}`).join("\n")}

## Sign-in

- [Start planning](${absoluteUrl("/sign-up")}): Create an account
- [Sign in](${absoluteUrl("/sign-in")}): Open the planner
`;
