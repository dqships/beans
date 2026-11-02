"use client";

import { useSyncExternalStore } from "react";
import { phoneBreakpoint } from "@beans/tokens";

const query = `(max-width: ${phoneBreakpoint - 1}px)`; // token-ok: built from --layout-phone

function subscribe(cb: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

/** True below the phone breakpoint (`--layout-phone`). */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
