import { describe, expect, it } from "vitest";
import { applyOps } from "./ops";
import { sampleState } from "./sample";
import { rolloverOps, wrapUpSplit, ROLLOVER_MAX_DAYS } from "./rollover";
import { addDays } from "./dates";
import { baseTask, tasksForDay } from "./tasks";
import { makeRepeating, ensureInstances } from "./repeat";
import type { BeansState } from "./model";

const TODAY = "2026-10-31";
const NOW = Date.UTC(2026, 9, 31, 12);
const YESTERDAY = addDays(TODAY, -1);

function withTask(s: BeansState, id: string, date: string, extra: Partial<ReturnType<typeof baseTask>> = {}): BeansState {
  return applyOps(s, [{ kind: "put", table: "tasks", record: { ...baseTask(id, NOW), title: id, date, ...extra } }], NOW);
}

describe("rollover", () => {
  it("moves unfinished tasks from past days to today, tagged with where they came from", () => {
    let s = sampleState(YESTERDAY, "UTC", NOW); // sample tasks sit on "yesterday" now
    s = applyOps(s, rolloverOps(s, TODAY), NOW);
    expect(s.tasks["task-today-3"]!.date).toBe(TODAY);
    expect(s.tasks["task-today-3"]!.rolledFrom).toBe(YESTERDAY);
    expect(s.tasks["task-today-1"]!.start).toBeNull();
    // Finished tasks stay put.
    expect(s.tasks["task-today-4"]!.date).toBe(YESTERDAY);
    expect(s.settings.lastRollover).toBe(TODAY);
  });

  it("is safe to run twice", () => {
    let s = sampleState(YESTERDAY, "UTC", NOW);
    s = applyOps(s, rolloverOps(s, TODAY), NOW);
    expect(rolloverOps(s, TODAY)).toEqual([]);
    // Even if lastRollover is lost, nothing is left to move.
    s = { ...s, settings: { ...s.settings, lastRollover: null } };
    expect(rolloverOps(s, TODAY).filter((o) => o.kind === "patch")).toEqual([]);
  });

  it("leaves tasks more than 14 days overdue where they are", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = withTask(s, "ancient", addDays(TODAY, -(ROLLOVER_MAX_DAYS + 1)));
    s = withTask(s, "two-weeks", addDays(TODAY, -ROLLOVER_MAX_DAYS));
    s = applyOps(s, rolloverOps(s, TODAY), NOW);
    expect(s.tasks["ancient"]!.date).toBe(addDays(TODAY, -15));
    expect(s.tasks["two-weeks"]!.date).toBe(TODAY);
  });

  it("puts rolled tasks at the bottom by default and at the top when set", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = withTask(s, "late", YESTERDAY);
    let bottom = applyOps(s, rolloverOps(s, TODAY), NOW);
    let undone = tasksForDay(bottom, TODAY).filter((t) => !t.done && !t.start);
    expect(undone[undone.length - 1]!.id).toBe("late");
    s = { ...s, settings: { ...s.settings, rolloverPosition: "top" } };
    bottom = applyOps(s, rolloverOps(s, TODAY), NOW);
    undone = tasksForDay(bottom, TODAY).filter((t) => !t.done && !t.start);
    expect(undone[0]!.id).toBe("late");
  });

  it("does nothing but record the day when rollover is off", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = withTask(s, "late", YESTERDAY);
    s = { ...s, settings: { ...s.settings, rollover: false } };
    const ops = rolloverOps(s, TODAY);
    expect(ops).toEqual([{ kind: "settings", fields: { lastRollover: TODAY } }]);
  });

  it("skips repeating tasks unless the setting says otherwise, and never touches Brain Dump", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = withTask(s, "habit", YESTERDAY);
    s = applyOps(s, makeRepeating(s, "habit", "FREQ=DAILY", YESTERDAY, null, NOW), NOW);
    s = applyOps(s, rolloverOps(s, TODAY), NOW);
    expect(s.tasks["habit"]!.date).toBe(YESTERDAY);
    expect(s.tasks["task-dump-1"]!.date).toBeNull();
    s = { ...s, settings: { ...s.settings, lastRollover: null, rolloverRepeating: true } };
    s = applyOps(s, rolloverOps(s, TODAY), NOW);
    expect(s.tasks["habit"]!.date).toBe(TODAY);
  });

  it("splits a day for wrap-up into rolling and staying", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, makeRepeating(s, "task-today-3", "FREQ=DAILY", TODAY, null, NOW), NOW);
    s = applyOps(s, ensureInstances(s, TODAY, TODAY, NOW), NOW);
    const { rolling, staying } = wrapUpSplit(s, TODAY);
    expect(staying.map((t) => t.id)).toEqual(["task-today-3"]);
    expect(rolling.map((t) => t.id)).toContain("task-today-2");
  });
});
