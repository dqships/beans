import { authServerMetadataHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

/**
 * Clerk's authorization server metadata, for MCP clients that only look for
 * it on the MCP host (older versions of the spec).
 */
const clerkMetadata = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? authServerMetadataHandlerClerk() : null;

export function GET() {
  return clerkMetadata ? clerkMetadata() : new Response("Sign-in isn't set up on this server.", { status: 404 });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
