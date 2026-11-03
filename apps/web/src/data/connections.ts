"use client";

import { createContext, useContext } from "react";

export type ConnectedApp = { clientId: string; name: string; firstUsedAt: number; lastUsedAt: number; disconnected: boolean };

/**
 * AI apps that have used this account through the MCP server, with ways to
 * disconnect one and let it back in. `connections-provider.tsx` provides it
 * from Convex.
 */
export type ConnectedApps = {
  apps: ConnectedApp[] | undefined;
  disconnect(clientId: string): Promise<void>;
  reconnect(clientId: string): Promise<void>;
};

export const ConnectedAppsContext = createContext<ConnectedApps | null>(null);

/** Null on sample data, which has no account to connect. */
export function useConnectedApps(): ConnectedApps | null {
  return useContext(ConnectedAppsContext);
}
