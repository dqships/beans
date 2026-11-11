/** Time as hours, minutes and seconds: the reading, splitting and wording that the time calculators share. No React, no clock. */

/** A real minus sign, so a negative answer doesn't look like a dash. */
export const MINUS = "−";

const pad = (n: number) => String(n).padStart(2, "0");

/** What a whole-number field holds as you type: digits only, up to `maxLength` of them. */
export function digitsOnly(text: string, maxLength = 5): string {
  return text.replace(/\D/g, "").slice(0, maxLength);
}

/** What a decimal field holds as you type: digits and one point. A comma counts as the point. */
export function decimalOnly(text: string, maxLength = 9): string {
  let seenPoint = false;
  let out = "";
  for (const char of text.replace(/,/g, ".")) {
    if (char >= "0" && char <= "9") out += char;
    else if (char === "." && !seenPoint) {
      seenPoint = true;
      out += char;
    }
    if (out.length >= maxLength) break;
  }
  return out;
}

/** A whole-number field read as a number. Blank, or anything without a digit in it, is 0. */
export function wholeNumber(text: string): number {
  const digits = text.replace(/\D/g, "").slice(0, 9);
  return digits ? Number(digits) : 0;
}

/** A decimal field read as a number. Blank, or anything that isn't a number, is 0. Never negative. */
export function decimalNumber(text: string): number {
  const value = Number(decimalOnly(text, 15));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function toSeconds(hours: number, minutes: number, seconds = 0): number {
  return hours * 3600 + minutes * 60 + seconds;
}

/** Whole seconds split into hours, minutes and seconds. Minutes and seconds are always under 60; hours can be any size. */
export function splitSeconds(totalSeconds: number): { negative: boolean; hours: number; minutes: number; seconds: number } {
  const whole = Number.isFinite(totalSeconds) ? Math.round(totalSeconds) : 0;
  const abs = Math.abs(whole);
  return { negative: whole < 0, hours: Math.floor(abs / 3600), minutes: Math.floor((abs % 3600) / 60), seconds: abs % 60 };
}

/** `1:30:00`, or with a minus sign in front when the time is negative. */
export function formatHms(totalSeconds: number): string {
  const { negative, hours, minutes, seconds } = splitSeconds(totalSeconds);
  return `${negative ? MINUS : ""}${hours}:${pad(minutes)}:${pad(seconds)}`;
}

/** Seconds as hours with two decimal places: 5,400 seconds is 1.5. Worked in whole numbers, so 0.005 always rounds up. */
export function decimalHours(totalSeconds: number): number {
  const { negative } = splitSeconds(totalSeconds);
  const hundredths = Math.round(Math.abs(Math.round(totalSeconds)) / 36);
  return hundredths === 0 ? 0 : ((negative ? -1 : 1) * hundredths) / 100;
}

/** Seconds as minutes with two decimal places: 90 seconds is 1.5. */
export function decimalMinutes(totalSeconds: number): number {
  const { negative } = splitSeconds(totalSeconds);
  const hundredths = Math.round((Math.abs(Math.round(totalSeconds)) * 5) / 3);
  return hundredths === 0 ? 0 : ((negative ? -1 : 1) * hundredths) / 100;
}

/** A number with a fixed count of decimal places: `1.50`. Thousands get a comma. */
export function fixed(value: number, places = 2): string {
  if (!Number.isFinite(value)) return (0).toFixed(places);
  const rounded = Number(Math.abs(value).toFixed(places));
  const text = rounded.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places });
  return value < 0 && rounded !== 0 ? `${MINUS}${text}` : text;
}

/** A number with up to `places` decimal places and no trailing zeros: `90.5`, `90`. Thousands get a comma. */
export function trimmed(value: number, places = 2): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(Math.abs(value).toFixed(places));
  const text = rounded.toLocaleString("en-US", { maximumFractionDigits: places });
  return value < 0 && rounded !== 0 ? `${MINUS}${text}` : text;
}

export function plural(count: number, unit: string): string {
  return `${count.toLocaleString("en-US")} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * A length of time in words, leaving out the parts that are zero: "1 hour 30 minutes", "45 seconds".
 * With `days`, 24 hours become a day. Nothing at all is "0 minutes". The sign is dropped.
 */
export function spanWords(totalSeconds: number, options: { days?: boolean } = {}): string {
  const { hours: allHours, minutes, seconds } = splitSeconds(totalSeconds);
  const days = options.days ? Math.floor(allHours / 24) : 0;
  const hours = options.days ? allHours % 24 : allHours;
  const parts = [days ? plural(days, "day") : "", hours ? plural(hours, "hour") : "", minutes ? plural(minutes, "minute") : "", seconds ? plural(seconds, "second") : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "0 minutes";
}

/** The same length in short units, for a tight space: "1 h 30 min", "45 s". Nothing at all is "0 min". The sign is dropped. */
export function spanShort(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitSeconds(totalSeconds);
  const parts = [hours ? `${hours.toLocaleString("en-US")} h` : "", minutes ? `${minutes} min` : "", seconds ? `${seconds} s` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "0 min";
}

/** A clock time from a time input, as minutes after midnight. Null for a blank or broken value. */
export function parseClock(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

const wrapDay = (minutes: number) => ((Math.round(minutes) % 1440) + 1440) % 1440;

/** Minutes after midnight as `5:30 PM`. */
export function clock12(minutes: number): string {
  const m = wrapDay(minutes);
  const hour = Math.floor(m / 60);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(m % 60)} ${hour < 12 ? "AM" : "PM"}`;
}

/** Minutes after midnight as `17:30`. */
export function clock24(minutes: number): string {
  const m = wrapDay(minutes);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
