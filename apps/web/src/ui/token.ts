"use client";

const cache = new Map<string, number>();

/** Reads a px token, such as `--space-2`, as a number for layout math. */
export function tokenPx(name: `--${string}`): number {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return 0;
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  const result = Number.isFinite(value) ? value : 0;
  cache.set(name, result);
  return result;
}
