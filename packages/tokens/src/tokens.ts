// Generated from DESIGN.md by packages/tokens/scripts/build.mjs. Do not edit.

/** Spring used by every animation. */
export const spring = {"stiffness":380,"damping":32,"mass":1} as const;

/** Label color names, in the order shown in pickers. */
export const labelColors = ["soil","tomato","pumpkin","corn","sprout","rain","plum","beet"] as const;

export type LabelColor = (typeof labelColors)[number];

/** CSS variable reference for a token, for inline styles. */
export function token(name: `--${string}`): string {
  return `var(${name})`;
}

/** Phone breakpoint in px (`--layout-phone`). */
export const phoneBreakpoint = 720;

/** Calendar hour height at 100% zoom (`--layout-hour`). */
export const hourHeight = 80;
