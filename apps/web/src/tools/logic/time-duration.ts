/** The time between a start and an end: two clock times, or two dates with times. */

import { clock12, parseClock, wholeNumber } from "./hms";

export type DurationMode = "times" | "dates";

/** What the time duration calculator keeps. Every field holds what was typed or picked. */
export type DurationState = {
  mode: DurationMode;
  /** Between two times. */
  start: string;
  end: string;
  /** Unpaid break in minutes, as typed. Blank is none. */
  breakMinutes: string;
  /** Between two dates. `TODAY` until a date is picked, and blank when one was cleared. */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

/** Stands in for a date that hasn't been picked: whatever today is when the page is open. */
export const TODAY = "today";

export const INITIAL_DURATION: DurationState = { mode: "times", start: "09:00", end: "17:00", breakMinutes: "", startDate: TODAY, startTime: "09:00", endDate: TODAY, endTime: "17:00" };

/** The date a field holds. `TODAY` becomes today's date, or blank while today isn't known yet. */
export function resolveDate(value: string, today: string | null): string {
  return value === TODAY ? (today ?? "") : value;
}

/** Start and end changed places. */
export function swapDates(state: DurationState): DurationState {
  return { ...state, startDate: state.endDate, startTime: state.endTime, endDate: state.startDate, endTime: state.startTime };
}

const DAY_MINUTES = 1440;
/** Digits the break field takes. */
export const BREAK_DIGITS = 4;

export type TimeSpan = {
  /** From start to end, before the break comes off. */
  grossMinutes: number;
  /** The break that was taken off: never more than the time there was. */
  breakMinutes: number;
  /** What's left after the break. */
  minutes: number;
  /** The end is earlier on the clock than the start, so it was read as the next day. */
  overnight: boolean;
  /** The break typed was longer than the whole span. */
  breakTooLong: boolean;
};

/**
 * The time from one clock time to another. An end earlier than the start is
 * the next day, so 22:00 to 06:00 is 8 hours. The same time twice is nothing.
 * Null when either time is blank.
 */
export function betweenTimes(start: string, end: string, breakText = ""): TimeSpan | null {
  const from = parseClock(start);
  const to = parseClock(end);
  if (from === null || to === null) return null;
  const overnight = to < from;
  const grossMinutes = to - from + (overnight ? DAY_MINUTES : 0);
  const asked = wholeNumber(breakText);
  const breakMinutes = Math.min(asked, grossMinutes);
  return { grossMinutes, breakMinutes, minutes: grossMinutes - breakMinutes, overnight, breakTooLong: asked > grossMinutes };
}

/**
 * A `YYYY-MM-DD` date as a count of days, so two dates can be subtracted.
 * Null for a blank value or a date that doesn't exist, such as February 30.
 */
export function dayNumber(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = new Date(Date.UTC(2000, month - 1, day));
  // setUTCFullYear, because Date.UTC reads years 0 to 99 as 1900 to 1999.
  utc.setUTCFullYear(year, month - 1, day);
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null;
  return Math.round(utc.getTime() / 86_400_000);
}

export type DateSpan = {
  /** Always zero or more: the size of the gap. */
  minutes: number;
  /** The end comes before the start. */
  backwards: boolean;
};

/**
 * The time from one date and time to another, counted by the calendar and the
 * clock: every day is 24 hours. It doesn't know about time zones, so it won't
 * add or drop the hour when clocks change. Null when a date or time is blank
 * or isn't a real date.
 */
export function betweenDates(startDate: string, startTime: string, endDate: string, endTime: string): DateSpan | null {
  const fromDay = dayNumber(startDate);
  const toDay = dayNumber(endDate);
  const fromTime = parseClock(startTime);
  const toTime = parseClock(endTime);
  if (fromDay === null || toDay === null || fromTime === null || toTime === null) return null;
  const minutes = (toDay - fromDay) * DAY_MINUTES + (toTime - fromTime);
  return { minutes: Math.abs(minutes), backwards: minutes < 0 };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A date and time as "Wed, Nov 11, 9:00 AM", with the year after the day when asked. Empty when either isn't real. */
export function momentLabel(date: string, time: string, withYear = false): string {
  const day = dayNumber(date);
  const clock = parseClock(time);
  if (day === null || clock === null) return "";
  // Day 0, 1 January 1970, was a Thursday.
  const weekday = WEEKDAYS[(((day + 4) % 7) + 7) % 7];
  const month = MONTHS[Number(date.slice(5, 7)) - 1];
  return `${weekday}, ${month} ${Number(date.slice(8, 10))}${withYear ? ` ${Number(date.slice(0, 4))}` : ""}, ${clock12(clock)}`;
}

/** One line naming both ends of a span. The year shows only when the two ends are in different years. */
export function rangeLabel(startDate: string, startTime: string, endDate: string, endTime: string): string {
  const withYear = startDate.slice(0, 4) !== endDate.slice(0, 4);
  return `${momentLabel(startDate, startTime, withYear)} to ${momentLabel(endDate, endTime, withYear)}.`;
}

const isTime = (value: unknown): value is string => typeof value === "string" && (value === "" || parseClock(value) !== null);
const isDate = (value: unknown): value is string => typeof value === "string" && (value === "" || value === TODAY || dayNumber(value) !== null);

/** Checks what was read back from local storage. */
export function parseDurationState(stored: unknown): DurationState | null {
  if (!stored || typeof stored !== "object") return null;
  const s = stored as Record<string, unknown>;
  if (s.mode !== "times" && s.mode !== "dates") return null;
  if (!isTime(s.start) || !isTime(s.end) || !isTime(s.startTime) || !isTime(s.endTime)) return null;
  if (!isDate(s.startDate) || !isDate(s.endDate)) return null;
  if (typeof s.breakMinutes !== "string" || !/^\d*$/.test(s.breakMinutes) || s.breakMinutes.length > BREAK_DIGITS) return null;
  return { mode: s.mode, start: s.start, end: s.end, breakMinutes: s.breakMinutes, startDate: s.startDate, startTime: s.startTime, endDate: s.endDate, endTime: s.endTime };
}
