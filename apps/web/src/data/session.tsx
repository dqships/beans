"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { AccountContext, type Account } from "@/planner/account";
import { authMode } from "./auth-mode";
import { ConvexDataProvider } from "./convex-provider";
import { identifyUser, resetAnalytics } from "./posthog";
import { SampleDataProvider } from "./sample-provider";
import { setTestUser, useTestUser } from "./test-auth-client";

/**
 * Wraps the planner with the right data source and account details, and sends
 * signed-out visitors to the sign-in page.
 */
export function PlannerSession({ children, loading, unconfigured }: { children: ReactNode; loading: ReactNode; unconfigured: ReactNode }) {
  if (authMode === "sample" || sampleRequested()) return <SampleDataProvider>{children}</SampleDataProvider>;
  if (authMode === "unconfigured") return <>{unconfigured}</>;
  return (
    <SignedInGate loading={loading}>
      {authMode === "clerk" ? <ClerkAccount>{children}</ClerkAccount> : <TestAccount>{children}</TestAccount>}
    </SignedInGate>
  );
}

/** True once the sign-in source (not Convex) knows the visitor is signed out. */
/** Development only: `/app?sample` opens the planner on sample data, for UI work and tests. */
function sampleRequested(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return new URLSearchParams(window.location.search).has("sample");
}

function useClerkSignedOut(): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && !isSignedIn;
}

function useTestSignedOut(): boolean {
  return useTestUser() === null;
}

// The mode is fixed at build time, so the same hook runs on every render.
const useSignedOut = authMode === "clerk" ? useClerkSignedOut : useTestSignedOut;

function SignedInGate({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const signedOut = useSignedOut();
  const router = useRouter();
  useEffect(() => {
    if (signedOut) router.replace("/sign-in");
  }, [signedOut, router]);
  // Convex can lag a moment behind the sign-in source while it checks the token.
  if (signedOut || !isAuthenticated) return <>{loading}</>;
  return <ConvexDataProvider>{children}</ConvexDataProvider>;
}

function ClerkAccount({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const clerk = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const name = user?.fullName || email;
  const userId = user?.id;
  useEffect(() => {
    if (userId) identifyUser(userId, email);
  }, [userId, email]);
  const account: Account = {
    name,
    email,
    initial: (name ?? "B").trim().charAt(0).toUpperCase(),
    // Clerk gives everyone a generated picture; only show one they chose.
    imageUrl: user?.hasImage ? user.imageUrl : null,
    manage: () => clerk.openUserProfile(),
    signOut: () => {
      resetAnalytics();
      void clerk.signOut({ redirectUrl: "/sign-in" });
    },
  };
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

function TestAccount({ children }: { children: ReactNode }) {
  const user = useTestUser();
  const router = useRouter();
  const account: Account = {
    name: user ? `${user} (test sign-in)` : null,
    email: null,
    initial: (user ?? "T").charAt(0).toUpperCase(),
    imageUrl: null,
    manage: null,
    signOut: () => {
      setTestUser(null);
      router.replace("/sign-in");
    },
  };
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
