import { addDays, keyToUtc, utcToKey, weekday } from "@beans/core/dates";

/** The habit tracker: a few habits, and the days each one was done. Days are `YYYY-MM-DD` keys, months `YYYY-MM`. All pure. */

export type Habit = { id: string; name: string };

export type Tracker = {
  habits: Habit[];
  /** For each habit id, the days it was done, sorted, with no repeats. Every month lives here. */
  done: Record<string, string[]>;
};

export const EMPTY_TRACKER: Tracker = { habits: [], done: {} };

export const MAX_HABITS = 12;
export const MAX_NAME = 60;
/** Ten years of days for one habit. */
const MAX_DAYS = 3660;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n: number) => String(n).padStart(2, "0");

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** `month` is 1 to 12. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** A real calendar day written `YYYY-MM-DD`. */
export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) && utcToKey(keyToUtc(value)) === value;
}

/** A month written `YYYY-MM`. */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value);
}

/** The month a day is in: "2026-11-11" gives "2026-11". */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/** Every day of a month, in order. */
export function monthDays(month: string): string[] {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return Array.from({ length: daysInMonth(year, m) }, (_, i) => `${month}-${pad(i + 1)}`);
}

/** The month `delta` months away. Stays between the years 1000 and 9999. */
export function shiftMonth(month: string, delta: number): string {
  const total = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + delta;
  const clamped = Math.min(9999 * 12 + 11, Math.max(1000 * 12, total));
  return `${Math.floor(clamped / 12)}-${pad((clamped % 12) + 1)}`;
}

/** "November 2026" */
export function monthLabel(month: string): string {
  return `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** "M" for a Monday: the letter over a day's column. */
export function weekdayLetter(day: string): string {
  return WEEKDAY_LETTERS[weekday(day)]!;
}

/** "Wednesday, November 11" */
export function dayLabel(day: string): string {
  return `${WEEKDAY_NAMES[weekday(day)]}, ${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
}

const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);

/** Adds a habit at the end. A blank name and a full tracker change nothing. */
export function addHabit(tracker: Tracker, name: string, id: string): Tracker {
  const cleaned = cleanName(name);
  if (!cleaned || tracker.habits.length >= MAX_HABITS || tracker.habits.some((habit) => habit.id === id)) return tracker;
  return { ...tracker, habits: [...tracker.habits, { id, name: cleaned }] };
}

/** Renames a habit. A blank name changes nothing, so a habit's days are never lost to a slip. */
export function renameHabit(tracker: Tracker, id: string, name: string): Tracker {
  const cleaned = cleanName(name);
  if (!cleaned) return tracker;
  return { ...tracker, habits: tracker.habits.map((habit) => (habit.id === id ? { ...habit, name: cleaned } : habit)) };
}

/** Removes a habit and every day marked for it. */
export function removeHabit(tracker: Tracker, id: string): Tracker {
  const done = { ...tracker.done };
  delete done[id];
  return { habits: tracker.habits.filter((habit) => habit.id !== id), done };
}

export function isDone(tracker: Tracker, habitId: string, day: string): boolean {
  return tracker.done[habitId]?.includes(day) ?? false;
}

/** Marks a day done for a habit, or clears it if it already was. */
export function toggleDay(tracker: Tracker, habitId: string, day: string): Tracker {
  if (!isDayKey(day) || !tracker.habits.some((habit) => habit.id === habitId)) return tracker;
  const days = tracker.done[habitId] ?? [];
  const next = days.includes(day) ? days.filter((other) => other !== day) : [...days, day].sort();
  if (next.length > MAX_DAYS) return tracker;
  return { ...tracker, done: { ...tracker.done, [habitId]: next } };
}

/** How many days of a month a habit was done. */
export function countInMonth(tracker: Tracker, habitId: string, month: string): number {
  return (tracker.done[habitId] ?? []).filter((day) => monthOf(day) === month).length;
}

/**
 * The run of days in a row that a habit has been done, up to today. A day
 * that isn't over doesn't break the run: if today isn't marked yet, the run
 * is counted up to yesterday. Days after today don't count.
 */
export function currentStreak(days: readonly string[], today: string): number {
  const done = new Set(days);
  let day = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** Clears every habit's marks for one month and keeps the habits. */
export function clearMonth(tracker: Tracker, month: string): Tracker {
  const done: Record<string, string[]> = {};
  for (const [id, days] of Object.entries(tracker.done)) {
    const kept = days.filter((day) => monthOf(day) !== month);
    if (kept.length > 0) done[id] = kept;
  }
  return { ...tracker, done };
}

/** How many marks a month has across all habits. */
export function marksInMonth(tracker: Tracker, month: string): number {
  return tracker.habits.reduce((sum, habit) => sum + countInMonth(tracker, habit.id, month), 0);
}

/** Checks a tracker read back from local storage. */
export function parseTracker(stored: unknown): Tracker | null {
  if (!stored || typeof stored !== "object") return null;
  const { habits, done } = stored as Record<string, unknown>;
  if (!Array.isArray(habits) || habits.length > MAX_HABITS || !done || typeof done !== "object" || Array.isArray(done)) return null;
  const parsedHabits: Habit[] = [];
  const ids = new Set<string>();
  for (const habit of habits) {
    if (!habit || typeof habit !== "object") return null;
    const { id, name } = habit as Record<string, unknown>;
    if (typeof id !== "string" || !id || typeof name !== "string" || !name.trim() || ids.has(id)) return null;
    ids.add(id);
    parsedHabits.push({ id, name: name.slice(0, MAX_NAME) });
  }
  const parsedDone: Record<string, string[]> = {};
  for (const [id, days] of Object.entries(done as Record<string, unknown>)) {
    if (!Array.isArray(days) || days.length > MAX_DAYS || !days.every(isDayKey)) return null;
    // Marks for a habit that no longer exists are dropped.
    if (ids.has(id) && days.length > 0) parsedDone[id] = [...new Set(days)].sort();
  }
  return { habits: parsedHabits, done: parsedDone };
}
