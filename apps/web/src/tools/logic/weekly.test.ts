import { describe, expect, it } from "vitest";
import {
  EMPTY_DRAFT,
  EMPTY_WEEK,
  MAX_BLOCKS,
  MIN_SLOTS,
  addBlock,
  checkDraft,
  dayOrder,
  daysLabel,
  draftOf,
  formatClock,
  hiddenCount,
  layoutDay,
  parseTime,
  parseWeek,
  placeBlock,
  removeBlock,
  setEndHour,
  setStartHour,
  slotCount,
  toTimeValue,
  updateBlock,
  type Week,
  type WeekBlock,
} from "./weekly";

const block = (name: string, days: number[], start: number, end: number): Omit<WeekBlock, "id"> => ({ name, days, start, end, color: "rain" });

const week = (...blocks: Omit<WeekBlock, "id">[]): Week => blocks.reduce((current, next, i) => addBlock(current, next, `b${i}`), EMPTY_WEEK);

describe("weekly schedule", () => {
  it("orders the days from Monday or from Sunday", () => {
    expect(dayOrder("mon")).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(dayOrder("sun")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(daysLabel([0, 1, 5], "mon")).toBe("Mon, Fri, Sun");
    expect(daysLabel([0, 1, 5], "sun", true)).toBe("Sunday, Monday, Friday");
  });

  it("reads and writes times", () => {
    expect(parseTime("09:30")).toBe(570);
    expect(parseTime("9:05")).toBe(545);
    expect(parseTime("23:59:30")).toBe(1439);
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime("noon")).toBeNull();
    expect(toTimeValue(570)).toBe("09:30");
    expect(toTimeValue(0)).toBe("00:00");
    expect(toTimeValue(5000)).toBe("23:59");
    expect(formatClock(0)).toBe("12 AM");
    expect(formatClock(570)).toBe("9:30 AM");
    expect(formatClock(720)).toBe("12 PM");
    expect(formatClock(13 * 60 + 5)).toBe("1:05 PM");
    expect(formatClock(1440)).toBe("12 AM");
  });

  it("checks a draft and says what's wrong with it", () => {
    const good = { ...EMPTY_DRAFT, name: "  Biology   101 ", days: [5, 1, 3, 3] };
    expect(checkDraft(good)).toEqual({ ok: true, block: { name: "Biology 101", days: [1, 3, 5], start: 540, end: 600, color: "sprout" } });
    expect(checkDraft({ ...good, name: "   " })).toEqual({ ok: false, problem: "name" });
    expect(checkDraft({ ...good, days: [] })).toEqual({ ok: false, problem: "days" });
    expect(checkDraft({ ...good, days: [7, -1] })).toEqual({ ok: false, problem: "days" });
    expect(checkDraft({ ...good, start: "" })).toEqual({ ok: false, problem: "time" });
    expect(checkDraft({ ...good, start: "10:00", end: "10:00" })).toEqual({ ok: false, problem: "order" });
    expect(checkDraft({ ...good, start: "22:00", end: "06:00" })).toEqual({ ok: false, problem: "order" });
  });

  it("treats an end of midnight as the end of the day", () => {
    const late = checkDraft({ ...EMPTY_DRAFT, name: "Night shift", days: [6], start: "22:00", end: "00:00" });
    expect(late).toEqual({ ok: true, block: { name: "Night shift", days: [6], start: 1320, end: 1440, color: "sprout" } });
    if (late.ok) expect(draftOf({ ...late.block, id: "x" })).toEqual({ name: "Night shift", days: [6], start: "22:00", end: "00:00", color: "sprout" });
  });

  it("adds, changes and removes blocks", () => {
    const one = week(block("Gym", [1, 3], 420, 480));
    expect(one.blocks).toHaveLength(1);
    const changed = updateBlock(one, "b0", block("Swim", [2], 420, 450));
    expect(changed.blocks[0]).toEqual({ id: "b0", name: "Swim", days: [2], start: 420, end: 450, color: "rain" });
    expect(updateBlock(one, "missing", block("Swim", [2], 420, 450))).toBe(one);
    expect(removeBlock(one, "b0").blocks).toHaveLength(0);
    const full = Array.from({ length: MAX_BLOCKS + 5 }, (_, i) => block(`Block ${i}`, [1], 600, 660)).reduce((current, next, i) => addBlock(current, next, `f${i}`), EMPTY_WEEK);
    expect(full.blocks).toHaveLength(MAX_BLOCKS);
  });

  it("widens the hours shown to fit a new block", () => {
    const early = week(block("Run", [1], 5 * 60 + 30, 6 * 60 + 15));
    expect([early.startHour, early.endHour]).toEqual([5, 21]);
    const late = week(block("Night shift", [5], 22 * 60, 1440));
    expect([late.startHour, late.endHour]).toEqual([7, 24]);
    const partHour = week(block("Dinner out", [5], 20 * 60, 21 * 60 + 30));
    expect(partHour.endHour).toBe(22);
  });

  it("keeps at least one hour on the grid", () => {
    expect(setStartHour(EMPTY_WEEK, 23)).toMatchObject({ startHour: 23, endHour: 24 });
    expect(setEndHour(EMPTY_WEEK, 3)).toMatchObject({ startHour: 2, endHour: 3 });
    expect(setEndHour(EMPTY_WEEK, 0)).toMatchObject({ startHour: 0, endHour: 1 });
    expect(setStartHour(EMPTY_WEEK, Number.NaN)).toMatchObject({ startHour: 7, endHour: 21 });
    expect(slotCount(EMPTY_WEEK)).toBe(168);
  });

  it("places a block on the five-minute rows", () => {
    // 9:00 to 10:30 on a grid that starts at 7:00.
    expect(placeBlock({ start: 540, end: 630 }, 7, 21)).toEqual({ rowStart: 25, rowEnd: 43 });
    // Odd minutes round outward.
    expect(placeBlock({ start: 543, end: 626 }, 7, 21)).toEqual({ rowStart: 25, rowEnd: 43 });
  });

  it("cuts a block to the hours shown and drops one that is outside them", () => {
    expect(placeBlock({ start: 6 * 60, end: 8 * 60 }, 7, 21)).toEqual({ rowStart: 1, rowEnd: 13 });
    expect(placeBlock({ start: 20 * 60, end: 23 * 60 }, 7, 21)).toEqual({ rowStart: 157, rowEnd: 169 });
    expect(placeBlock({ start: 5 * 60, end: 7 * 60 }, 7, 21)).toBeNull();
    expect(placeBlock({ start: 21 * 60, end: 22 * 60 }, 7, 21)).toBeNull();
  });

  it("never draws a block too short to read, and keeps it on the grid", () => {
    expect(placeBlock({ start: 540, end: 545 }, 7, 21)).toEqual({ rowStart: 25, rowEnd: 25 + MIN_SLOTS });
    const atEnd = placeBlock({ start: 20 * 60 + 55, end: 21 * 60 }, 7, 21)!;
    expect(atEnd).toEqual({ rowStart: 169 - MIN_SLOTS, rowEnd: 169 });
  });

  it("lays a day out earliest first, side by side where blocks overlap", () => {
    const busy = week(block("Late", [1], 15 * 60, 16 * 60), block("Lab", [1], 9 * 60 + 30, 11 * 60), block("Lecture", [1, 2], 9 * 60, 10 * 60), block("Seminar", [1], 10 * 60, 11 * 60));
    const monday = layoutDay(busy, 1);
    expect(monday.map((item) => [item.block.name, item.lane, item.lanes])).toEqual([
      ["Lecture", 1, 2],
      ["Lab", 2, 2],
      ["Seminar", 1, 2],
      ["Late", 1, 1],
    ]);
    expect(layoutDay(busy, 2).map((item) => [item.block.name, item.lane, item.lanes])).toEqual([["Lecture", 1, 1]]);
    expect(layoutDay(busy, 3)).toEqual([]);
  });

  it("counts blocks the hours shown leave out", () => {
    const early = week(block("Run", [1], 5 * 60, 6 * 60), block("Work", [1], 9 * 60, 17 * 60));
    expect(hiddenCount(early)).toBe(0);
    const narrowed = setStartHour(early, 8);
    expect(hiddenCount(narrowed)).toBe(1);
    expect(layoutDay(narrowed, 1).map((item) => item.block.name)).toEqual(["Work"]);
  });

  it("reads back what it stored and rejects anything else", () => {
    const saved = { ...week(block("Gym", [1, 3], 420, 480)), title: "Fall term", weekStart: "sun" as const };
    expect(parseWeek(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(parseWeek(null)).toBeNull();
    expect(parseWeek({ ...saved, weekStart: "tue" })).toBeNull();
    expect(parseWeek({ ...saved, startHour: 21, endHour: 7 })).toBeNull();
    expect(parseWeek({ ...saved, endHour: 25 })).toBeNull();
    const bad = (change: Record<string, unknown>) => parseWeek({ ...saved, blocks: [{ ...saved.blocks[0], ...change }] });
    expect(bad({ color: "teal" })).toBeNull();
    expect(bad({ days: [] })).toBeNull();
    expect(bad({ days: [1, 9] })).toBeNull();
    expect(bad({ days: ["1"] })).toBeNull();
    expect(bad({ start: 500, end: 400 })).toBeNull();
    expect(bad({ end: 2000 })).toBeNull();
    expect(bad({ name: " " })).toBeNull();
  });
});
