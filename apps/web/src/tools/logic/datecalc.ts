import { addDays, addMonths, diffDays, keyToUtc, monthName, utcToKey, weekday, weekdayName } from "@beans/core/dates";

/** The date calculator's math, on `YYYY-MM-DD` keys. All pure; nothing here knows what today is. */

const MIN_YEAR = 1600;
const MAX_YEAR = 9999;

/** The largest number the add and subtract mode takes, in any unit. */
export const MAX_AMOUNT = 100_000;

/** True for a real calendar date between the years 1600 and 9999. */
export function isDateKey(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const year = Number(text.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  // February 30 and the like don't survive the round trip.
  return utcToKey(keyToUtc(text)) === text;
}

const isWeekdayNumber = (day: number) => day >= 1 && day <= 5;

/** How many Mondays to Fridays fall from `from` up to, but not counting, `to`. 0 when `to` isn't later. */
export function countWeekdays(from: string, to: string): number {
  const days = diffDays(to, from);
  if (days <= 0) return 0;
  const weeks = Math.floor(days / 7);
  let count = weeks * 5;
  const first = weekday(from);
  for (let i = 0; i < days % 7; i += 1) {
    if (isWeekdayNumber((first + i) % 7)) count += 1;
  }
  return count;
}

export type Span = {
  /** The earlier date. */
  from: string;
  /** The later date. */
  to: string;
  /** True when the dates were given later one first. */
  swapped: boolean;
  days: number;
  weeks: { weeks: number; days: number };
  months: { months: number; days: number };
  years: { years: number; months: number; days: number };
  weekdays: number;
};

/**
 * The time between two dates, in either order. Without `includeEnd` the last
 * day isn't counted, so Monday to Friday of one week is 4 days. With it, 5.
 */
export function daysBetween(a: string, b: string, includeEnd = false): Span | null {
  if (!isDateKey(a) || !isDateKey(b)) return null;
  const swapped = diffDays(b, a) < 0;
  const from = swapped ? b : a;
  const to = swapped ? a : b;
  // Everything is counted from `from` up to, but not counting, `stop`.
  const stop = includeEnd ? addDays(to, 1) : to;
  const days = diffDays(stop, from);

  // Whole calendar months first, then the days left over.
  let months = (Number(stop.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(stop.slice(5, 7)) - Number(from.slice(5, 7)));
  if (diffDays(stop, addMonths(from, months)) < 0) months -= 1;
  const left = diffDays(stop, addMonths(from, months));

  return {
    from,
    to,
    swapped,
    days,
    weeks: { weeks: Math.floor(days / 7), days: days % 7 },
    months: { months, days: left },
    years: { years: Math.floor(months / 12), months: months % 12, days: left },
    weekdays: countWeekdays(from, stop),
  };
}

export type Unit = "days" | "weekdays" | "weeks" | "months";

export const UNITS: readonly Unit[] = ["days", "weekdays", "weeks", "months"];

/** Steps `count` Mondays to Fridays forward (or back, when negative). The start day itself isn't counted. */
export function addWeekdays(start: string, count: number): string {
  const direction = count < 0 ? -1 : 1;
  const total = Math.abs(Math.trunc(count));
  if (total === 0) return start;
  // From a weekend, count as if from the weekday just behind it: the answer is the same.
  let date = start;
  while (!isWeekdayNumber(weekday(date))) date = addDays(date, -direction);
  // Five weekdays are one week.
  date = addDays(date, direction * Math.floor(total / 5) * 7);
  let left = total % 5;
  while (left > 0) {
    date = addDays(date, direction);
    if (isWeekdayNumber(weekday(date))) left -= 1;
  }
  return date;
}

/**
 * A date plus (or, with a negative amount, minus) a number of days, weekdays,
 * weeks or months. Adding months to the 31st lands on the last day of a
 * shorter month. Null for a bad date, or an answer outside the years 1600 to 9999.
 */
export function shiftDate(start: string, amount: number, unit: Unit): string | null {
  if (!isDateKey(start) || !Number.isFinite(amount)) return null;
  const whole = Math.trunc(amount);
  if (Math.abs(whole) > MAX_AMOUNT) return null;
  // Far enough either way and the year stops having four digits, so check before formatting.
  const reach = unit === "months" ? Math.abs(whole) / 12 : unit === "weeks" ? Math.abs(whole) / 52 : unit === "weekdays" ? Math.abs(whole) / 260 : Math.abs(whole) / 365;
  const year = Number(start.slice(0, 4)) + Math.sign(whole) * reach;
  if (year < MIN_YEAR - 1 || year > MAX_YEAR + 1) return null;
  let result: string;
  if (unit === "months") result = addMonths(start, whole);
  else if (unit === "weeks") result = addDays(start, whole * 7);
  else if (unit === "weekdays") result = addWeekdays(start, whole);
  else result = addDays(start, whole);
  return isDateKey(result) ? result : null;
}

export type Until = {
  /** Days from today to the date. Negative when it has passed, 0 when it is today. */
  days: number;
  /** Mondays to Fridays between the two, counting the earlier day but not the later one. */
  weekdays: number;
  weeks: { weeks: number; days: number };
};

export function daysUntil(today: string, target: string): Until | null {
  if (!isDateKey(today) || !isDateKey(target)) return null;
  const days = diffDays(target, today);
  const size = Math.abs(days);
  return {
    days,
    weekdays: days >= 0 ? countWeekdays(today, target) : countWeekdays(target, today),
    weeks: { weeks: Math.floor(size / 7), days: size % 7 },
  };
}

/** "Wednesday, November 11, 2026" */
export function formatLongDate(key: string): string {
  return `${weekdayName(key, true)}, ${monthName(key, true)} ${Number(key.slice(8, 10))}, ${Number(key.slice(0, 4))}`;
}

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** A count with thousands separators: "12,345". */
export function formatCount(count: number): string {
  return grouped.format(Number.isFinite(count) ? count : 0);
}

/** "1 day", "2 days", "1,200 days". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/** Joins the parts that aren't zero: "2 weeks and 3 days". Falls back to "0 days". */
export function joinParts(parts: string[], empty = "0 days"): string {
  const kept = parts.filter((part) => !part.startsWith("0 "));
  if (kept.length === 0) return empty;
  if (kept.length === 1) return kept[0]!;
  return `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`;
}

export type Mode = "between" | "add" | "until";

export type DateCalcState = {
  mode: Mode;
  /** Days between: the two dates. "" means not chosen, and the first falls back to today. */
  from: string;
  to: string;
  includeEnd: boolean;
  /** Add or subtract. */
  start: string;
  direction: "add" | "subtract";
  amount: number;
  unit: Unit;
  /** Days until. */
  target: string;
};

export const DEFAULT_DATE_CALC: DateCalcState = {
  mode: "between",
  from: "",
  to: "",
  includeEnd: false,
  start: "",
  direction: "add",
  amount: 30,
  unit: "days",
  target: "",
};

const isDateOrEmpty = (value: unknown): value is string => typeof value === "string" && (value === "" || isDateKey(value));

/** Checks what the calculator saved in local storage. */
export function parseDateCalc(stored: unknown): DateCalcState | null {
  if (!stored || typeof stored !== "object") return null;
  const { mode, from, to, includeEnd, start, direction, amount, unit, target } = stored as Record<string, unknown>;
  if (mode !== "between" && mode !== "add" && mode !== "until") return null;
  if (!isDateOrEmpty(from) || !isDateOrEmpty(to) || !isDateOrEmpty(start) || !isDateOrEmpty(target)) return null;
  if (typeof includeEnd !== "boolean" || (direction !== "add" && direction !== "subtract")) return null;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0 || amount > MAX_AMOUNT) return null;
  if (typeof unit !== "string" || !UNITS.includes(unit as Unit)) return null;
  return { mode, from, to, includeEnd, start, direction, amount, unit: unit as Unit, target };
}
