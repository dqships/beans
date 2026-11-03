import "server-only";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

let client: ConvexHttpClient | null = null;

/** Calls one of the MCP functions in `convex/mcp.ts` from the MCP route. */
export async function callMcp(fn: FunctionReference<"mutation", "public">, args: Record<string, unknown>): Promise<unknown> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  client ??= new ConvexHttpClient(url);
  return await client.mutation(fn, args);
}
