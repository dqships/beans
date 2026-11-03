import { generateClerkProtectedResourceMetadata } from "@clerk/mcp-tools/server";
import { metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";
import { publicOrigin, resourceUrl } from "@/mcp/config";

/**
 * OAuth protected resource metadata (RFC 9728) for the MCP address. Its
 * `resource` is the MCP address exactly, and Clerk is the authorization server.
 */
export function GET(req: Request) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return new Response("Sign-in isn't set up on this server.", { status: 404 });
  const metadata = generateClerkProtectedResourceMetadata({
    publishableKey,
    resourceUrl: resourceUrl(req),
    properties: {
      resource_name: "Beans",
      resource_documentation: `${publicOrigin(req).replace("//mcp.", "//")}/connect-ai`,
      service_documentation: `${publicOrigin(req).replace("//mcp.", "//")}/connect-ai`,
      scopes_supported: ["profile", "email"],
      bearer_methods_supported: ["header"],
    },
  });
  return Response.json(metadata, {
    headers: { "Cache-Control": "max-age=3600", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*" },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
