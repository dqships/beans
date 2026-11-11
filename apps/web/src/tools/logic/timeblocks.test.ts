import { describe, expect, it } from "vitest";
import {
  EMPTY_PLAN,
  EXAMPLE_PLAN,
  addTask,
  layout,
  moveBy,
  nextFree,
  parseDayPlan,
  planAsText,
  range,
  resizeBy,
  scheduleNext,
  setHours,
  setMinutes,
  setStart,
  totals,
  type DayPlan,
} from "./timeblocks";

const plan = (tasks: [string, number, number | null][]): DayPlan => ({
  ...EMPTY_PLAN,
  tasks: tasks.map(([id, minutes, start]) => ({ id, title: id, minutes, start, done: false })),
});

describe("placing blocks", () => {
  it("snaps to 15 minutes and stays inside the hours shown", () => {
    const one = plan([["a", 60, null]]);
    expect(setStart(one, "a", 9 * 60 + 7).tasks[0]!.start).toBe(9 * 60);
    expect(setStart(one, "a", 3 * 60).tasks[0]!.start).toBe(8 * 60);
    expect(setStart(one, "a", 23 * 60).tasks[0]!.start).toBe(17 * 60);
    expect(setStart(setStart(one, "a", 9 * 60), "a", null).tasks[0]!.start).toBeNull();
  });

  it("moves and stretches a block without leaving the day", () => {
    const one = plan([["a", 60, 17 * 60]]);
    expect(moveBy(one, "a", 15).tasks[0]!.start).toBe(17 * 60);
    expect(moveBy(one, "a", -30).tasks[0]!.start).toBe(16 * 60 + 30);
    expect(resizeBy(one, "a", 30).tasks[0]!.minutes).toBe(60);
    expect(resizeBy(one, "a", -60).tasks[0]!.minutes).toBe(15);
    expect(setMinutes(plan([["b", 30, null]]), "b", 52).tasks[0]!.minutes).toBe(45);
  });

  it("finds the next gap a task fits in", () => {
    const busy = plan([
      ["a", 60, 8 * 60],
      ["b", 30, 9 * 60 + 15],
      ["c", 45, null],
    ]);
    // 9:00 to 9:15 is too short for 45 minutes, so it goes after b.
    expect(nextFree(busy, 45)).toBe(9 * 60 + 45);
    expect(nextFree(busy, 15)).toBe(9 * 60);
    expect(scheduleNext(busy, "c").tasks[2]!.start).toBe(9 * 60 + 45);
  });

  it("leaves the plan alone when the day is full", () => {
    const full = plan([
      ["a", 480, 8 * 60],
      ["b", 120, 16 * 60],
      ["c", 30, null],
    ]);
    expect(nextFree(full, 30)).toBeNull();
    expect(scheduleNext(full, "c")).toBe(full);
  });

  it("sends blocks back to the list when the hours shrink past them", () => {
    const two = plan([
      ["early", 60, 8 * 60],
      ["late", 60, 12 * 60],
    ]);
    const shorter = setHours(two, 10, 18);
    expect(shorter.tasks.map((task) => task.start)).toEqual([null, 12 * 60]);
    expect(setHours(two, 9, 9).to).toBe(10);
  });
});

describe("laying out overlaps", () => {
  it("gives a lone block the full width", () => {
    expect(layout(plan([["a", 60, 9 * 60]]).tasks)).toMatchObject([{ col: 0, cols: 1 }]);
  });

  it("puts overlapping blocks side by side and reuses a column once it frees up", () => {
    const placed = layout(
      plan([
        ["a", 60, 9 * 60],
        ["b", 60, 9 * 60 + 30],
        ["c", 30, 10 * 60],
        ["d", 30, 13 * 60],
      ]).tasks,
    );
    const at = (id: string) => placed.find((p) => p.task.id === id)!;
    expect([at("a").col, at("b").col, at("c").col]).toEqual([0, 1, 0]);
    expect([at("a").cols, at("b").cols, at("c").cols]).toEqual([2, 2, 2]);
    expect(at("d")).toMatchObject({ col: 0, cols: 1 });
  });
});

describe("totals and text", () => {
  it("counts overlapping time once", () => {
    const t = totals(
      plan([
        ["a", 60, 9 * 60],
        ["b", 60, 9 * 60 + 30],
        ["c", 45, null],
      ]),
    );
    expect(t).toEqual({ blocked: 90, capacity: 600, waiting: 1, waitingMinutes: 45 });
  });

  it("writes times the way the planner shows them", () => {
    expect(range(9 * 60, 45)).toBe("9:00am – 9:45am");
    expect(range(23 * 60, 60)).toBe("11:00pm – 12:00am");
    expect(planAsText(EXAMPLE_PLAN).split("\n").slice(0, 2)).toEqual(["Tuesday", "9:00am – 9:45am  Write the weekly update"]);
    expect(planAsText(EXAMPLE_PLAN)).toContain("Not scheduled:\n- Book a dentist appointment (15 min)");
  });
});

describe("stored plans", () => {
  it("reads back what it saved", () => {
    expect(parseDayPlan(JSON.parse(JSON.stringify(EXAMPLE_PLAN)))).toEqual(EXAMPLE_PLAN);
  });

  it("drops a start that falls outside the hours, and rejects junk", () => {
    const odd = { ...EXAMPLE_PLAN, from: 10 };
    expect(parseDayPlan(odd)!.tasks[0]!.start).toBeNull();
    expect(parseDayPlan({ ...EXAMPLE_PLAN, from: 20, to: 8 })).toBeNull();
    expect(parseDayPlan({ title: "", from: 8, to: 18, tasks: [{ id: "a" }] })).toBeNull();
    expect(parseDayPlan(null)).toBeNull();
  });

  it("ignores a blank title and a full list", () => {
    expect(addTask(EMPTY_PLAN, "  ", 30, "x")).toBe(EMPTY_PLAN);
    expect(addTask(EMPTY_PLAN, "Read", 20, "x").tasks[0]).toMatchObject({ title: "Read", minutes: 15, start: null });
  });
});
