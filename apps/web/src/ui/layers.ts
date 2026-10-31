"use client";

import { useEffect, useRef } from "react";

/**
 * Tracks open overlays so Escape and outside clicks only close the top one.
 */
const stack: symbol[] = [];

export function useLayer(open: boolean, onClose: () => void) {
  const id = useRef<symbol>(Symbol("layer"));
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const me = id.current;
    stack.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === me) {
        e.stopPropagation();
        e.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      const i = stack.lastIndexOf(me);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [open]);
  return {
    isTop: () => stack[stack.length - 1] === id.current,
  };
}

/** True while any overlay is open, so single-key shortcuts stay quiet. */
export function anyLayerOpen(): boolean {
  return stack.length > 0;
}
