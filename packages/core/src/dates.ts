import type { DateKey, TimeKey } from "./model";

const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parses a `YYYY-MM-DD` key as a UTC midnight timestamp. */
export function keyToUtc(key: DateKey): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

export function utcToKey(ms: number): DateKey {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: DateKey, days: number): DateKey {
  return utcToKey(keyToUtc(key) + days * DAY_MS);
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((keyToUtc(a) - keyToUtc(b)) / DAY_MS);
}

/** 0 = Sunday. */
export function weekday(key: DateKey): number {
  return new Date(keyToUtc(key)).getUTCDay();
}

export function isWeekend(key: DateKey): boolean {
  const w = weekday(key);
  return w === 0 || w === 6;
}

export function startOfWeek(key: DateKey, weekStart: 0 | 1): DateKey {
  const offset = (weekday(key) - weekStart + 7) % 7;
  return addDays(key, -offset);
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function addMonths(key: DateKey, months: number): DateKey {
  const [y, m] = key.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const d = Math.min(Number(key.slice(8, 10)), last);
  return `${ny}-${pad(nm)}-${pad(d)}`;
}

export function daysInRange(from: DateKey, count: number): DateKey[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

/** Today's key in an IANA time zone. */
export function todayIn(timeZone: string, now: number = Date.now()): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Minutes since midnight in an IANA time zone. */
export function minutesNowIn(timeZone: string, now: number = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function timeToMinutes(time: TimeKey): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function minutesToTime(minutes: number): TimeKey {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function snapMinutes(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function weekdayName(key: DateKey, long = false): string {
  return (long ? WEEKDAYS_LONG : WEEKDAYS)[weekday(key)]!;
}

export function monthName(key: DateKey, long = false): string {
  return (long ? MONTHS_LONG : MONTHS)[Number(key.slice(5, 7)) - 1]!;
}

export function dayOfMonth(key: DateKey): number {
  return Number(key.slice(8, 10));
}

/** "Oct 31" */
export function shortDate(key: DateKey): string {
  return `${monthName(key)} ${dayOfMonth(key)}`;
}

/** Friendly name relative to today: Today, Tomorrow, Yesterday, a weekday within the week, or a date. */
export function relativeDay(key: DateKey, today: DateKey): string {
  const diff = diffDays(key, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return weekdayName(key, true);
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return sameYear ? `${weekdayName(key)}, ${shortDate(key)}` : `${shortDate(key)}, ${key.slice(0, 4)}`;
}

/** Formats a time for display in 12- or 24-hour form. */
export function formatTime(time: TimeKey, format: "12h" | "24h", compact = false): string {
  const total = timeToMinutes(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (format === "24h") return `${pad(h)}:${pad(m)}`;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (compact && m === 0) return `${h12}${suffix}`;
  return `${h12}:${pad(m)}${suffix}`;
}

/** Hour label for the calendar gutter. */
export function formatHour(hour: number, format: "12h" | "24h"): string {
  if (format === "24h") return `${pad(hour)}:00`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? "AM" : "PM"}`;
}
