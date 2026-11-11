/** The countdown timer's length: set as hours, minutes and seconds, kept as seconds. */

import { spanWords, splitSeconds, toSeconds } from "./hms";

export type CountdownSettings = {
  /** The length to count down from, in whole seconds. 0 means nothing is set. */
  seconds: number;
  sound: boolean;
};

/** 99:59:59, the most the three fields can hold. */
export const MAX_COUNTDOWN_SECONDS = toSeconds(99, 59, 59);

export const DEFAULT_COUNTDOWN: CountdownSettings = { seconds: 10 * 60, sound: true };

/** The quick lengths, in minutes. */
export const COUNTDOWN_PRESETS = [1, 5, 10, 15, 20, 30, 45, 60] as const;

export type LengthParts = { hours: number; minutes: number; seconds: number };

const whole = (value: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : 0);

/** A length in seconds as the three fields show it. */
export function splitLength(totalSeconds: number): LengthParts {
  const { hours, minutes, seconds } = splitSeconds(whole(totalSeconds, MAX_COUNTDOWN_SECONDS));
  return { hours, minutes, seconds };
}

/** The three fields as one length in seconds. Each is held to its range first: 0 to 99 hours, 0 to 59 minutes and seconds. */
export function joinLength(parts: LengthParts): number {
  return toSeconds(whole(parts.hours, 99), whole(parts.minutes, 59), whole(parts.seconds, 59));
}

/**
 * The time left, rounded up to a whole second. A countdown from 10:00 shows
 * 10:00 for its first second and reaches 00:00 only when it's over.
 */
export function ceilToSecond(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 1000) * 1000 : 0;
}

/** "10 minutes", "1 hour 30 minutes", "45 seconds". */
export function describeLength(totalSeconds: number): string {
  return spanWords(whole(totalSeconds, MAX_COUNTDOWN_SECONDS));
}

/** Checks settings read back from local storage. */
export function parseCountdownSettings(stored: unknown): CountdownSettings | null {
  if (!stored || typeof stored !== "object") return null;
  const { seconds, sound } = stored as Record<string, unknown>;
  if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 0 || seconds > MAX_COUNTDOWN_SECONDS) return null;
  return { seconds, sound: sound !== false };
}
