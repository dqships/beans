import { describe, expect, it } from "vitest";
import {
  EMPTY_TRACKER,
  MAX_HABITS,
  addHabit,
  clearMonth,
  countInMonth,
  currentStreak,
  dayLabel,
  daysInMonth,
  isDayKey,
  isDone,
  isLeapYear,
  isMonthKey,
  marksInMonth,
  monthDays,
  monthLabel,
  monthOf,
  parseTracker,
  removeHabit,
  renameHabit,
  shiftMonth,
  toggleDay,
  weekdayLetter,
  type Tracker,
} from "./habits";

const two = addHabit(addHabit(EMPTY_TRACKER, "Read 10 pages", "read"), "Stretch", "stretch");

const mark = (tracker: Tracker, id: string, ...days: string[]) => days.reduce((current, day) => toggleDay(current, id, day), tracker);

describe("habit tracker", () => {
  it("knows how long each month is, leap years included", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => daysInMonth(2026, month))).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
  });

  it("lists a month's days", () => {
    const november = monthDays("2026-11");
    expect(november).toHaveLength(30);
    expect(november[0]).toBe("2026-11-01");
    expect(november.at(-1)).toBe("2026-11-30");
    expect(monthDays("2024-02").at(-1)).toBe("2024-02-29");
    expect(monthDays("2026-02")).toHaveLength(28);
    expect(monthOf("2026-11-11")).toBe("2026-11");
  });

  it("steps between months across a year end", () => {
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", -23)).toBe("2024-12");
    expect(shiftMonth("9999-12", 1)).toBe("9999-12");
    expect(shiftMonth("1000-01", -1)).toBe("1000-01");
  });

  it("names months and days", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthLabel("2027-01")).toBe("January 2027");
    expect(weekdayLetter("2026-11-11")).toBe("W");
    expect(weekdayLetter("2026-11-01")).toBe("S");
    expect(dayLabel("2026-11-11")).toBe("Wednesday, November 11");
  });

  it("tells real days and months from made-up ones", () => {
    expect(isDayKey("2026-11-30")).toBe(true);
    expect(isDayKey("2026-11-31")).toBe(false);
    expect(isDayKey("2026-02-29")).toBe(false);
    expect(isDayKey("2024-02-29")).toBe(true);
    expect(isDayKey("2026-1-5")).toBe(false);
    expect(isDayKey(20261111)).toBe(false);
    expect(isMonthKey("2026-11")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-00")).toBe(false);
  });

  it("adds up to twelve habits, renames and removes them", () => {
    expect(two.habits.map((habit) => habit.name)).toEqual(["Read 10 pages", "Stretch"]);
    expect(addHabit(two, "  ", "x")).toBe(two);
    expect(addHabit(two, "Again", "read")).toBe(two);
    const full = Array.from({ length: MAX_HABITS + 3 }, (_, i) => i).reduce((current, i) => addHabit(current, `Habit ${i}`, `h${i}`), EMPTY_TRACKER);
    expect(full.habits).toHaveLength(MAX_HABITS);

    expect(renameHabit(two, "read", " Read  20 pages ").habits[0]!.name).toBe("Read 20 pages");
    expect(renameHabit(two, "read", "  ")).toBe(two);

    const marked = mark(two, "read", "2026-11-10", "2026-11-11");
    const removed = removeHabit(marked, "read");
    expect(removed.habits.map((habit) => habit.id)).toEqual(["stretch"]);
    expect(removed.done).toEqual({});
  });

  it("toggles a day on and off, and keeps the days sorted", () => {
    const marked = mark(two, "read", "2026-11-11", "2026-11-03", "2026-10-31");
    expect(marked.done.read).toEqual(["2026-10-31", "2026-11-03", "2026-11-11"]);
    expect(isDone(marked, "read", "2026-11-03")).toBe(true);
    expect(isDone(marked, "stretch", "2026-11-03")).toBe(false);
    const cleared = toggleDay(marked, "read", "2026-11-03");
    expect(isDone(cleared, "read", "2026-11-03")).toBe(false);
    expect(toggleDay(two, "missing", "2026-11-03")).toBe(two);
    expect(toggleDay(two, "read", "2026-11-31")).toBe(two);
  });

  it("counts a habit's days in one month only", () => {
    const marked = mark(two, "read", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-30", "2026-12-01");
    expect(countInMonth(marked, "read", "2026-11")).toBe(3);
    expect(countInMonth(marked, "read", "2026-10")).toBe(1);
    expect(countInMonth(marked, "stretch", "2026-11")).toBe(0);
    expect(marksInMonth(mark(marked, "stretch", "2026-11-05"), "2026-11")).toBe(4);
  });

  it("counts the current streak back from today", () => {
    expect(currentStreak(["2026-11-09", "2026-11-10", "2026-11-11"], "2026-11-11")).toBe(3);
    expect(currentStreak([], "2026-11-11")).toBe(0);
    expect(currentStreak(["2026-11-11"], "2026-11-11")).toBe(1);
  });

  it("doesn't break a streak because today isn't marked yet", () => {
    expect(currentStreak(["2026-11-08", "2026-11-09", "2026-11-10"], "2026-11-11")).toBe(3);
    // Yesterday missed: the run is over.
    expect(currentStreak(["2026-11-08", "2026-11-09"], "2026-11-11")).toBe(0);
    // A gap stops the count.
    expect(currentStreak(["2026-11-06", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11"], "2026-11-11")).toBe(4);
  });

  it("carries a streak across month ends, a leap day and a new year", () => {
    expect(currentStreak(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"], "2026-11-02")).toBe(4);
    expect(currentStreak(["2024-02-28", "2024-02-29", "2024-03-01"], "2024-03-01")).toBe(3);
    expect(currentStreak(["2026-02-28", "2026-03-01"], "2026-03-01")).toBe(2);
    expect(currentStreak(["2026-12-30", "2026-12-31", "2027-01-01"], "2027-01-01")).toBe(3);
  });

  it("ignores days after today in a streak", () => {
    expect(currentStreak(["2026-11-11", "2026-11-12", "2026-11-13"], "2026-11-11")).toBe(1);
    expect(currentStreak(["2026-11-12", "2026-11-13"], "2026-11-11")).toBe(0);
  });

  it("clears one month and leaves the rest", () => {
    const marked = mark(mark(two, "read", "2026-10-31", "2026-11-01", "2026-11-02"), "stretch", "2026-11-05");
    const cleared = clearMonth(marked, "2026-11");
    expect(cleared.done).toEqual({ read: ["2026-10-31"] });
    expect(cleared.habits).toHaveLength(2);
    expect(clearMonth(two, "2026-11").done).toEqual({});
  });

  it("reads back what it stored and rejects anything else", () => {
    const marked = mark(two, "read", "2026-11-10", "2026-11-11");
    expect(parseTracker(JSON.parse(JSON.stringify(marked)))).toEqual(marked);
    expect(parseTracker({ habits: [], done: {} })).toEqual(EMPTY_TRACKER);
    expect(parseTracker(null)).toBeNull();
    expect(parseTracker({ habits: [], done: [] })).toBeNull();
    expect(parseTracker({ habits: [{ id: "a", name: "" }], done: {} })).toBeNull();
    expect(parseTracker({ habits: [{ id: "a", name: "A" }, { id: "a", name: "B" }], done: {} })).toBeNull();
    expect(parseTracker({ habits: [{ id: "a", name: "A" }], done: { a: ["2026-02-30"] } })).toBeNull();
    expect(parseTracker({ habits: [{ id: "a", name: "A" }], done: { a: "2026-02-03" } })).toBeNull();
    expect(parseTracker({ habits: Array.from({ length: MAX_HABITS + 1 }, (_, i) => ({ id: `h${i}`, name: "A" })), done: {} })).toBeNull();
  });

  it("tidies stored days: sorted, no repeats, none for a habit that's gone", () => {
    expect(parseTracker({ habits: [{ id: "a", name: "A" }], done: { a: ["2026-11-11", "2026-11-03", "2026-11-11"], gone: ["2026-11-01"] } })).toEqual({
      habits: [{ id: "a", name: "A" }],
      done: { a: ["2026-11-03", "2026-11-11"] },
    });
  });
});
