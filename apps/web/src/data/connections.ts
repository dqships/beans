"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export type ConnectedApp = { clientId: string; name: string; firstUsedAt: number; lastUsedAt: number };

/**
 * AI apps connected to this account through the MCP server, and a way to
 * disconnect one. Only for the Convex backend; sample data has none.
 */
export function useConnectedApps(): { apps: ConnectedApp[] | undefined; disconnect: (clientId: string) => Promise<void> } {
  const apps = useQuery(api.mcp.connections);
  const disconnect = useMutation(api.mcp.disconnect);
  return { apps, disconnect: async (clientId) => void (await disconnect({ clientId })) };
}
