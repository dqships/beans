import { MCP_URL, RESOURCE_METADATA_URL } from "@/mcp/config";

/**
 * Copy for `/connect-ai`, the setup steps for connecting an AI app to Beans'
 * MCP server. Shared by the HTML page and its markdown version, in the small
 * markdown `MarkdownBody` reads.
 */
export const connectBody = `Connect Beans to an AI app you already use, and it can read your planner and change it for you. Ask it to put a list of things in your Brain Dump, plan and timebox your afternoon, or tell you where last week's hours went. Changes show up in Beans straight away, in every open window.

## The address

Every AI app asks for the same address:

\`\`\`
${MCP_URL}
\`\`\`

The first time, the app sends you to Beans to sign in and allow it. You need a Beans subscription, the 7-day free trial or the 3 free days. [See pricing](/pricing).

## Claude

On the web, in the desktop app and on your phone:

1. Open **Settings**, then **Connectors**.
2. Choose **Add custom connector**. Name it Beans and paste the address.
3. Choose **Connect**, sign in to Beans and choose **Allow**.

On a Team or Enterprise plan, an owner may need to add the connector for your organization first.

## Claude Code

1. Run \`claude mcp add --transport http beans ${MCP_URL}\` in a terminal.
2. In Claude Code, type \`/mcp\`, choose **beans**, then **Authenticate**.
3. Sign in to Beans in the browser window that opens, and choose **Allow**.

## ChatGPT

1. Open **Settings**, then **Apps**. Under **Advanced settings**, turn on **Developer mode**.
2. Create an app named Beans, paste the address, and choose **OAuth** for authentication.
3. Sign in to Beans when ChatGPT asks, and choose **Allow**.

Where these settings sit depends on your ChatGPT plan, and some workspaces let only an admin add apps.

## Cursor

1. Open **Cursor Settings**, then **Tools & MCP**, and choose **New MCP server**.
2. Add Beans to the \`mcpServers\` list in the file that opens: \`"beans": { "url": "${MCP_URL}" }\`.
3. Back in Settings, choose **Connect** next to Beans, then sign in to Beans and choose **Allow**.

## Other AI apps

Any app that connects to remote MCP servers over HTTP with OAuth sign-in works. Give it the address, and it takes care of the rest.

## What your AI can do

- **Read:** today, any day or a whole week, your lists, labels and Brain Dump, a search across task titles, and analytics for a date range.
- **Change:** add up to 50 tasks at once, edit them and their subtasks, check them off, move them, timebox them, make them repeat, log time, and add lists and labels.
- **Delete:** tasks go to Trash, where they stay for 30 days and can be brought back. Nothing is deleted for good, and Trash can't be emptied from an AI app.
- **Leave alone:** your settings, your subscription and your account.

Most AI apps ask you before each change. Beans also gives them four ready-made prompts: Plan my day, Weekly review, Shutdown, and Clean up my Brain Dump.

To keep a runaway AI from flooding your planner, each account allows 60 calls a minute and 1,000 changes a day from connected apps.

## Permissions

When you choose **Allow**, Beans gives the app an OAuth access token for your account. It asks for the \`profile\` and \`email\` scopes, so the token says which Beans account it belongs to. The token reaches your own planner and no one else's, and it can use every tool above: there's no read-only option yet. To take an app's access away, disconnect it.

AI apps read these details from the server's [OAuth metadata](${RESOURCE_METADATA_URL}).

## Things to ask

- "Put these six things in my Brain Dump."
- "Make a list called Half marathon, with labels for training, gear and race day, and fill it with a 16-week plan with estimates."
- "What's left on today? Move anything I won't get to onto tomorrow."
- "Timebox my afternoon from 1pm, longest tasks first."
- "How many hours went to Work last week, and how far off were my estimates?"

## Disconnecting

In Beans, open **Settings**, then **Connected apps**, and choose **Disconnect** next to the app. It can't read or change your planner after that, even if it signs in again, until you choose **Reconnect** in the same place. To stop seeing Beans in the AI app too, remove the connector there.

## Privacy

Your AI app gets the parts of your planner it asks for, and its own privacy policy covers what it does with them. The [privacy policy](/privacy) has the details. Questions go to [support@followusai.com](mailto:support@followusai.com).`;
