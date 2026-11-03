"use client";

import { useContext, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ConnectedAppsContext, type ConnectedApps } from "./connections";
import { DataStoreContext } from "./store";

/** Provides Settings > Connected apps from Convex. Sample data has none. */
export function ConnectedAppsProvider({ children }: { children: ReactNode }) {
  const backend = useContext(DataStoreContext)?.backend;
  if (backend !== "convex") return <>{children}</>;
  return <ConvexConnectedApps>{children}</ConvexConnectedApps>;
}

function ConvexConnectedApps({ children }: { children: ReactNode }) {
  const apps = useQuery(api.mcp.connections);
  const disconnect = useMutation(api.mcp.disconnect);
  const reconnect = useMutation(api.mcp.reconnect);
  const value: ConnectedApps = {
    apps,
    disconnect: async (clientId) => void (await disconnect({ clientId })),
    reconnect: async (clientId) => void (await reconnect({ clientId })),
  };
  return <ConnectedAppsContext.Provider value={value}>{children}</ConnectedAppsContext.Provider>;
}
