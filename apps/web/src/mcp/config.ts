/**
 * Where the Beans MCP server lives. In production it has a host of its own,
 * `mcp.beans.followusai.com`, served by this same app; `proxy.ts` keeps that
 * host to the MCP addresses and keeps the app host off them.
 */
export const MCP_PATH = "/mcp";
export const MCP_URL = "https://mcp.beans.followusai.com/mcp";
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";
/** The protected resource metadata (RFC 9728) for `MCP_URL`, on the MCP host. */
export const RESOURCE_METADATA_URL = `${new URL(MCP_URL).origin}${RESOURCE_METADATA_PATH}`;

/**
 * The OAuth scopes the MCP server declares (RFC 9728 `scopes_supported`).
 * Clerk, the authorization server, issues only identity scopes, so these don't
 * narrow planner access: a token reaches its person's whole planner.
 */
export const MCP_SCOPES = ["profile", "email"] as const;

/** True for the MCP server's own host. */
export function isMcpHost(host: string): boolean {
  return /^mcp\./i.test(host);
}

/** Paths the MCP host answers. Everything else there is a 404. */
export function isMcpPath(pathname: string): boolean {
  return pathname === MCP_PATH || pathname === "/.well-known/oauth-protected-resource" || pathname.startsWith("/.well-known/oauth-protected-resource/") || pathname === "/.well-known/oauth-authorization-server";
}

/** The origin the client used, behind Vercel's proxy too. */
export function publicOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (host) {
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

/** The MCP address for this host: exactly `MCP_URL` in production. */
export function resourceUrl(req: Request): string {
  return `${publicOrigin(req)}${MCP_PATH}`;
}

/** CORS for browser-based MCP clients. Calls carry a bearer token, never cookies. */
export const MCP_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};
