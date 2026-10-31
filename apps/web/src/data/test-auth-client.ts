"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "beans-test-user";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setTestUser(name: string | null) {
  try {
    if (name) localStorage.setItem(KEY, name);
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function useTestUser(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => null,
  );
}

/** Auth hook for ConvexProviderWithAuth, backed by the dev server's test tokens. */
export function useTestAuth() {
  const user = useTestUser();
  const fetchAccessToken = useCallback(async () => {
    if (!user) return null;
    const res = await fetch("/api/test-auth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { token: string }).token;
  }, [user]);
  return useMemo(() => ({ isLoading: false, isAuthenticated: user !== null, fetchAccessToken }), [user, fetchAccessToken]);
}
