import { absoluteUrl } from "@/lib/site";
import { MCP_URL } from "./config";

/**
 * The MCP host's home page. Google's favicon service, and the apps that use
 * it for connector icons, read a host's icons from its home page, so the MCP
 * host needs one. The icon files themselves come from the app, since
 * `proxy.ts` never runs on static files.
 */
export function mcpHomePage(): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beans MCP server</title>
<meta name="description" content="The address AI apps use to connect to Beans, the daily planner.">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/icon.png" type="image/png" sizes="512x512">
<link rel="apple-touch-icon" href="/apple-icon.png">
</head>
<body>
<h1>Beans MCP server</h1>
<p>This is the address AI apps use to connect to Beans: <code>${MCP_URL}</code></p>
<p><a href="${absoluteUrl("/connect-ai")}">How to connect Claude, ChatGPT and other AI apps</a></p>
</body>
</html>
`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
