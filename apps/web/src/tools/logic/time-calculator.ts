/** The time calculator: lengths of time added and subtracted, and a clock time moved by a length. */

import { parseClock, toSeconds, wholeNumber } from "./hms";

export type Sign = "add" | "subtract";

/** One line of the sum. The three fields hold what was typed, so a blank stays blank. */
export type TimeRow = { id: string; sign: Sign; hours: string; minutes: string; seconds: string };

/** A clock time and the length to move it by. */
export type ClockShift = { time: string; sign: Sign; hours: string; minutes: string };

export type TimeCalcMode = "lengths" | "clock";

export type TimeCalc = { mode: TimeCalcMode; rows: TimeRow[]; clock: ClockShift };

export const MAX_ROWS = 30;
/** Digits a field takes. */
export const FIELD_DIGITS = 5;

const blankRow = (id: string): TimeRow => ({ id, sign: "add", hours: "", minutes: "", seconds: "" });

export const INITIAL_TIME_CALC: TimeCalc = {
  mode: "lengths",
  rows: [blankRow("first"), blankRow("second")],
  clock: { time: "09:00", sign: "add", hours: "", minutes: "" },
};

/** A row's length in seconds, negative when it's subtracted. Blank fields are 0, and minutes or seconds over 59 carry. */
export function rowSeconds(row: TimeRow): number {
  const seconds = toSeconds(wholeNumber(row.hours), wholeNumber(row.minutes), wholeNumber(row.seconds));
  return row.sign === "subtract" && seconds !== 0 ? -seconds : seconds;
}

/** Every row added up, in seconds. Negative when more was subtracted than added. */
export function totalSeconds(rows: readonly TimeRow[]): number {
  return rows.reduce((sum, row) => sum + rowSeconds(row), 0);
}

/** Rows with something typed in them. */
export function countFilled(rows: readonly TimeRow[]): number {
  return rows.filter((row) => rowSeconds(row) !== 0).length;
}

/** Adds a blank row at the end. A full list changes nothing. */
export function addRow(calc: TimeCalc, id: string): TimeCalc {
  if (calc.rows.length >= MAX_ROWS) return calc;
  return { ...calc, rows: [...calc.rows, blankRow(id)] };
}

/** Removes a row. The last row left is emptied instead, so there's always one to type in. */
export function removeRow(calc: TimeCalc, id: string): TimeCalc {
  if (!calc.rows.some((row) => row.id === id)) return calc;
  if (calc.rows.length === 1) return { ...calc, rows: [blankRow(id)] };
  return { ...calc, rows: calc.rows.filter((row) => row.id !== id) };
}

export function updateRow(calc: TimeCalc, id: string, patch: Partial<Omit<TimeRow, "id">>): TimeCalc {
  return { ...calc, rows: calc.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)) };
}

/** Empties every row, keeping the first two to type in. */
export function clearRows(calc: TimeCalc): TimeCalc {
  return { ...calc, rows: calc.rows.slice(0, 2).map((row) => blankRow(row.id)) };
}

/**
 * A clock time moved forwards or back by a length. `minutes` is the new time
 * as minutes after midnight, and `dayOffset` is how many midnights it crossed:
 * 1 for the next day, -1 for the day before. Null when the time is blank.
 */
export function shiftClock(shift: ClockShift): { minutes: number; dayOffset: number } | null {
  const start = parseClock(shift.time);
  if (start === null) return null;
  const length = wholeNumber(shift.hours) * 60 + wholeNumber(shift.minutes);
  const moved = start + (shift.sign === "subtract" ? -length : length);
  const dayOffset = Math.floor(moved / 1440);
  return { minutes: moved - dayOffset * 1440, dayOffset };
}

/** Which day a moved clock time lands on, in words. */
export function dayOffsetText(dayOffset: number): string {
  if (dayOffset === 0) return "same day";
  if (dayOffset === 1) return "next day";
  if (dayOffset === -1) return "previous day";
  const days = Math.abs(dayOffset).toLocaleString("en-US");
  return dayOffset > 0 ? `${days} days later` : `${days} days earlier`;
}

const isSign = (value: unknown): value is Sign => value === "add" || value === "subtract";
const isField = (value: unknown): value is string => typeof value === "string" && /^\d*$/.test(value) && value.length <= FIELD_DIGITS;

/** Checks what was read back from local storage. */
export function parseTimeCalc(stored: unknown): TimeCalc | null {
  if (!stored || typeof stored !== "object") return null;
  const { mode, rows, clock } = stored as Record<string, unknown>;
  if (mode !== "lengths" && mode !== "clock") return null;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) return null;
  const parsedRows: TimeRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") return null;
    const { id, sign, hours, minutes, seconds } = row as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 40 || seen.has(id)) return null;
    if (!isSign(sign) || !isField(hours) || !isField(minutes) || !isField(seconds)) return null;
    seen.add(id);
    parsedRows.push({ id, sign, hours, minutes, seconds });
  }
  if (!clock || typeof clock !== "object") return null;
  const c = clock as Record<string, unknown>;
  if (typeof c.time !== "string" || (c.time !== "" && parseClock(c.time) === null)) return null;
  if (!isSign(c.sign) || !isField(c.hours) || !isField(c.minutes)) return null;
  return { mode, rows: parsedRows, clock: { time: c.time, sign: c.sign, hours: c.hours, minutes: c.minutes } };
}
