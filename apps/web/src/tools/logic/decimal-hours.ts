/** Hours and minutes to decimal hours, and back. */

import { decimalHours, decimalMinutes, fixed, splitSeconds, toSeconds } from "./hms";

/** The most either side takes: 99,999 hours. */
export const MAX_DECIMAL_HOURS = 99_999;

const MAX_SECONDS = MAX_DECIMAL_HOURS * 3600;

const safe = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

/**
 * Hours, minutes and seconds as one number of hours. Minutes and seconds over
 * 59 are fine: 90 minutes is 1.5 hours. `hours` and `minutes` are rounded to
 * two decimal places.
 */
export function timeToDecimal(hours: number, minutes: number, seconds = 0): { seconds: number; hours: number; minutes: number } {
  const total = Math.min(MAX_SECONDS, Math.round(toSeconds(safe(hours), safe(minutes), safe(seconds))));
  return { seconds: total, hours: decimalHours(total), minutes: decimalMinutes(total) };
}

/** Decimal hours as hours, minutes and seconds, to the nearest second: 1.75 is 1 hour 45 minutes. */
export function decimalToTime(decimal: number): { totalSeconds: number; hours: number; minutes: number; seconds: number; totalMinutes: number } {
  const totalSeconds = Math.min(MAX_SECONDS, Math.round(safe(decimal) * 3600));
  const { hours, minutes, seconds } = splitSeconds(totalSeconds);
  return { totalSeconds, hours, minutes, seconds, totalMinutes: decimalMinutes(totalSeconds) };
}

/** The minutes in the reference table: 1, the tenth of an hour, then every five up to the hour. */
export const REFERENCE_MINUTES = [1, 5, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;

export type ReferenceRow = { minutes: number; hours: string };

/** Each reference minute with its decimal hours, worked out by the same function the converter uses. */
export function referenceRows(): ReferenceRow[] {
  return REFERENCE_MINUTES.map((minutes) => ({ minutes, hours: fixed(timeToDecimal(0, minutes).hours) }));
}

/** The reference rows side by side in two columns, reading down the left column first. */
export function referencePairs(): [ReferenceRow, ReferenceRow | null][] {
  const rows = referenceRows();
  const half = Math.ceil(rows.length / 2);
  return rows.slice(0, half).map((row, i) => [row, rows[half + i] ?? null]);
}
