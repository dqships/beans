import { describe, expect, it } from "vitest";
import { analyticsFor, brainDumpAge, completedDay, finishedBetween, STALE_DAYS } from "./analytics";
import { applyOps } from "./ops";
import { sampleState } from "./sample";
import { deleteTask, liveTasks, setDone, updateTask } from "./tasks";

const DAY = 86_400_000;
const TODAY = "2026-10-31";
const NOW = Date.UTC(2026, 9, 31, 12);

function sample() {
  return sampleState(TODAY, "UTC", NOW);
}

describe("analytics", () => {
  it("counts a finished task on the day it was checked off, in the user's zone", () => {
    const s = sample();
    const walk = s.tasks["task-today-4"]!;
    expect(completedDay(walk, "UTC")).toBe(TODAY);
    // 12:00 UTC on the 31st is already the 1st in Auckland.
    expect(completedDay(walk, "Pacific/Auckland")).toBe("2026-11-01");
    expect(completedDay({ ...walk, completedAt: null }, "UTC")).toBe(walk.date);
  });

  it("keeps finished tasks in the range, newest first, and skips Trash", () => {
    let s = sample();
    s = applyOps(s, setDone(s, "task-today-1", true, NOW + 1000), NOW);
    const done = finishedBetween(liveTasks(s), "2026-10-30", TODAY, "UTC").map((t) => t.id);
    expect(done).toEqual(["task-today-1", "task-today-4", "task-past-1"]);
    expect(finishedBetween(liveTasks(s), TODAY, TODAY, "UTC").map((t) => t.id)).toEqual(["task-today-1", "task-today-4"]);
    s = applyOps(s, deleteTask("task-today-1", NOW), NOW);
    expect(finishedBetween(Object.values(s.tasks), TODAY, TODAY, "UTC").map((t) => t.id)).toEqual(["task-today-4"]);
  });

  it("totals time and tasks by label and by day, with empty days", () => {
    let s = sample();
    // Fills actual time from the 30-minute estimate.
    s = applyOps(s, setDone(s, "task-today-1", true, NOW), NOW);
    const a = analyticsFor(liveTasks(s), "2026-10-29", TODAY, "UTC");
    expect(a.total).toEqual({ minutes: 85, tasks: 3 });
    expect(a.byLabel).toEqual([
      { labelId: "label-work", minutes: 50, tasks: 2 },
      { labelId: "label-health", minutes: 35, tasks: 1 },
    ]);
    expect(a.perDay).toEqual([
      { date: "2026-10-29", minutes: 0, tasks: 0 },
      { date: "2026-10-30", minutes: 20, tasks: 1 },
      { date: TODAY, minutes: 65, tasks: 2 },
    ]);
  });

  it("compares estimates with actual time for tasks that had one", () => {
    let s = sample();
    s = applyOps(s, updateTask("task-today-3", { done: true, completedAt: NOW, actual: 0, estimate: null }), NOW);
    const a = analyticsFor(liveTasks(s), "2026-10-30", TODAY, "UTC");
    // Walk 30 → 35 and invoice 15 → 20. The seedlings had no estimate.
    expect(a.estimates).toEqual({ tasks: 2, estimated: 45, actual: 55, ratio: 1.22 });
    expect(analyticsFor([], TODAY, TODAY, "UTC").estimates.ratio).toBeNull();
  });

  it("puts unlabelled time in its own group", () => {
    let s = sample();
    s = applyOps(s, updateTask("task-tomorrow-1", { done: true, completedAt: NOW, actual: 90 }), NOW);
    expect(analyticsFor(liveTasks(s), TODAY, TODAY, "UTC").byLabel[0]).toEqual({ labelId: null, minutes: 90, tasks: 1 });
  });

  it("measures how long undated tasks have waited", () => {
    let s = sample();
    s = applyOps(s, updateTask("task-dump-1", { createdAt: NOW - STALE_DAYS * DAY }), NOW);
    s = applyOps(s, updateTask("task-list-1", { createdAt: NOW - 20 * DAY }), NOW);
    const age = brainDumpAge(liveTasks(s), TODAY, "UTC");
    // Three Brain Dump tasks and two list tasks: 14 + 20 + 0 + 0 + 0 days.
    expect(age.count).toBe(5);
    expect(age.averageDays).toBe(7);
    expect(age.stale.map((t) => t.id).sort()).toEqual(["task-dump-1", "task-list-1"]);
    expect(brainDumpAge([], TODAY, "UTC")).toEqual({ count: 0, averageDays: 0, stale: [] });
  });
});
