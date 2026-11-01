import { spring } from "@beans/tokens";

export const FPS = 30;

const { stiffness: k, damping: d, mass: m } = spring;
const w0 = Math.sqrt(k / m);
const zeta = d / (2 * Math.sqrt(k * m));
const w1 = w0 * Math.sqrt(1 - zeta * zeta);

/** The Beans spring in closed form, from 0 to 1. Exact at any time. */
export function springAt(seconds: number): number {
  if (seconds <= 0) return 0;
  const env = Math.exp(-zeta * w0 * seconds);
  return 1 - env * (Math.cos(w1 * seconds) + ((zeta * w0) / w1) * Math.sin(w1 * seconds));
}

/** The spring started at `start`. `speed` below 1 stretches the time, never the shape. */
export const sp = (frame: number, start: number, speed = 1): number => springAt(((frame - start) / FPS) * speed);

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lin = (frame: number, start: number, length: number): number => clamp((frame - start) / length, 0, 1);
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const seconds = (s: number): number => Math.round(s * FPS);
