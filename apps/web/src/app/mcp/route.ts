import type { Implementation } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { verifyBeansToken } from "@/mcp/auth";
import { MCP_CORS, publicOrigin, RESOURCE_METADATA_PATH } from "@/mcp/config";
import { INSTRUCTIONS, registerBeans } from "@/mcp/server";

/**
 * The Beans MCP server: stateless Streamable HTTP at `/mcp`. Every request
 * needs a Clerk OAuth access token; without one the answer is a 401 whose
 * `WWW-Authenticate` points at the protected resource metadata.
 */
/**
 * Icons and the site let AI apps show Beans' own icon instead of guessing it
 * from the domain. `mcp-handler` types `serverInfo` as name and version only,
 * but hands the whole object to the SDK's `McpServer`, which sends these too.
 */
const serverInfo: Implementation = {
  name: "Beans",
  version: "1.0.0",
  websiteUrl: siteUrl,
  icons: [
    { src: absoluteUrl("/icon.svg"), mimeType: "image/svg+xml", sizes: ["any"] },
    { src: absoluteUrl("/icon.png"), mimeType: "image/png", sizes: ["512x512"] },
  ],
};

const handler = createMcpHandler(registerBeans, {
  serverInfo,
  instructions: INSTRUCTIONS,
});

async function serve(req: Request): Promise<Response> {
  // The metadata URL in the challenge uses the host the client called.
  const res = await withMcpAuth(handler, verifyBeansToken, {
    required: true,
    resourceMetadataPath: RESOURCE_METADATA_PATH,
    resourceUrl: publicOrigin(req),
  })(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(MCP_CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: MCP_CORS });
}

export { serve as GET, serve as POST, serve as DELETE };
