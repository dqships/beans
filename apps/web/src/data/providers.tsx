"use client";

import { useMemo, type ReactNode } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { authMode, convexUrl } from "./auth-mode";
import { useTestAuth } from "./test-auth-client";

let client: ConvexReactClient | null = null;
function getClient() {
  if (!client) client = new ConvexReactClient(convexUrl);
  return client;
}

/** Connects Convex to whichever sign-in is active. ClerkProvider wraps this in the layout. */
export function BackendProviders({ children }: { children: ReactNode }) {
  if (authMode === "clerk") {
    return (
      <ConvexProviderWithClerk client={getClient()} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    );
  }
  if (authMode === "test") return <TestProviders>{children}</TestProviders>;
  return <>{children}</>;
}

function TestProviders({ children }: { children: ReactNode }) {
  const convex = useMemo(() => getClient(), []);
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useTestAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
