import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { verifyTestToken } from "@/data/test-auth-server";

/** What a tool call knows about who is calling, from their access token. */
export interface BeansAuth {
  /** The Clerk user id, Beans' user id everywhere. */
  userId: string;
  clientId: string;
  clientName: string;
  /** When the access token was issued, in ms, so Disconnect can refuse older tokens. */
  issuedAt: number;
}

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

/** Small caches for this server instance. Tokens last a day and app names rarely change. */
const issued = new Map<string, number>();
const names = new Map<string, string>();

function remember<V>(map: Map<string, V>, key: string, value: V): V {
  if (map.size > 500) map.delete(map.keys().next().value!);
  map.set(key, value);
  return value;
}

/** A JWT access token carries `iat`. Clerk's opaque tokens are looked up once each. */
async function issuedAtFor(token: string, tokenId: string): Promise<number> {
  const cached = issued.get(tokenId);
  if (cached) return cached;
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const iat = (JSON.parse(Buffer.from(parts[1]!, "base64url").toString()) as { iat?: number }).iat;
      if (typeof iat === "number") return remember(issued, tokenId, iat * 1000);
    } catch {}
  }
  const verified = await (await clerkClient()).idPOAuthAccessToken.verify(token);
  return remember(issued, tokenId, verified.createdAt * 1000);
}

/**
 * A readable name for the app behind an OAuth client: the `client_name` in its
 * client metadata document when the client id is that document's URL, the
 * name it registered with otherwise, or its host as a last resort.
 */
async function clientNameFor(clientId: string): Promise<string> {
  const cached = names.get(clientId);
  if (cached) return cached;
  let name = "AI app";
  try {
    const url = new URL(clientId);
    name = url.hostname;
    if (url.protocol === "https:" && !/^[\d.]+$|^\[/.test(url.hostname)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000), redirect: "error", headers: { Accept: "application/json" } });
      const doc = res.ok ? ((await res.json()) as { client_name?: unknown }) : {};
      if (typeof doc.client_name === "string" && doc.client_name.trim()) name = doc.client_name.trim();
    }
  } catch {
    try {
      const apps = await (await clerkClient()).oauthApplications.list({ limit: 100 });
      name = apps.data.find((a) => a.clientId === clientId)?.name ?? name;
    } catch {}
  }
  return remember(names, clientId, name.slice(0, 60));
}

/** Verifies a bearer token for the MCP route: a Clerk OAuth access token, or the local test sign-in's in test runs. */
export async function verifyBeansToken(_req: Request, token?: string): Promise<AuthInfo | undefined> {
  if (!token) return undefined;
  const test = verifyTestToken(token);
  if (test) {
    const extra: BeansAuth = { userId: test.sub, clientId: "beans-test-client", clientName: "Test client", issuedAt: test.iat * 1000 };
    return { token, clientId: extra.clientId, scopes: [], extra: { ...extra } };
  }
  if (!clerkConfigured) return undefined;
  const clerkAuth = await auth({ acceptsToken: "oauth_token" });
  const info = verifyClerkToken(clerkAuth, token);
  if (!info || !clerkAuth.isAuthenticated) return undefined;
  const [issuedAt, clientName] = await Promise.all([issuedAtFor(token, clerkAuth.id), clientNameFor(info.clientId)]);
  const extra: BeansAuth = { userId: clerkAuth.userId, clientId: info.clientId, clientName, issuedAt };
  return { ...info, extra: { ...info.extra, ...extra } };
}
