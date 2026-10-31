import { describe, expect, it } from "vitest";
import { applyOps, invertOps } from "./ops";
import { sampleState } from "./sample";
import {
  createTask, detectLabel, moveTask, setDone, setSubtaskDone, tasksForDay, tasksForList,
  liveLabels, deleteTask, restoreTask, startTimerOps, stopTimerOps, dayTotals, runsPastMidnight,
} from "./tasks";
import { deleteList, restoreList, templateFromTask, taskFromTemplate } from "./collections";

const TODAY = "2026-10-31";
const NOW = Date.UTC(2026, 9, 31, 12);

describe("tasks", () => {
  it("puts timeboxed tasks first, by time, and finished tasks last", () => {
    const s = sampleState(TODAY, "UTC", NOW);
    const ids = tasksForDay(s, TODAY).map((t) => t.id);
    expect(ids[0]).toBe("task-today-1");
    expect(ids[ids.length - 1]).toBe("task-today-4");
  });

  it("creates new tasks at the top by default and at the bottom when set", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    const top = createTask(s, { title: "New", date: TODAY }, NOW);
    s = applyOps(s, top.ops, NOW);
    expect(tasksForDay(s, TODAY)[1]!.id).toBe(top.id);
    s = { ...s, settings: { ...s.settings, newTaskPosition: "bottom" } };
    const bottom = createTask(s, { title: "Last", date: TODAY }, NOW);
    s = applyOps(s, bottom.ops, NOW);
    const undone = tasksForDay(s, TODAY).filter((t) => !t.done);
    expect(undone[undone.length - 1]!.id).toBe(bottom.id);
  });

  it("detects [labels] in titles, including multi-word names", () => {
    const s = sampleState(TODAY, "UTC", NOW);
    expect(detectLabel("Draft post [side project]", liveLabels(s))).toEqual({ title: "Draft post", labelId: "label-side" });
    expect(detectLabel("No [match] here", liveLabels(s))).toEqual({ title: "No [match] here", labelId: null });
  });

  it("applies the list's auto label", () => {
    const s = sampleState(TODAY, "UTC", NOW);
    const { ops } = createTask(s, { title: "Mulch the beds", listId: "list-garden" }, NOW);
    const next = applyOps(s, ops, NOW);
    expect(Object.values(next.tasks).find((t) => t.title === "Mulch the beds")!.labelId).toBe("label-home");
  });

  it("moves a task between days at an index and clears its timebox", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, moveTask(s, "task-today-1", { date: "2026-11-01", index: 1 }), NOW);
    const day = tasksForDay(s, "2026-11-01").map((t) => t.id);
    expect(day).toEqual(["task-tomorrow-1", "task-today-1", "task-tomorrow-2"]);
    expect(s.tasks["task-today-1"]!.start).toBeNull();
  });

  it("moves a task into a list", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, moveTask(s, "task-today-3", { date: null, listId: "list-reading", index: 0 }), NOW);
    expect(tasksForList(s, "list-reading")[0]!.id).toBe("task-today-3");
    expect(s.tasks["task-today-3"]!.date).toBeNull();
  });

  it("fills actual time from the estimate on completion", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, setDone(s, "task-today-3", true, NOW), NOW);
    expect(s.tasks["task-today-3"]!.actual).toBe(10);
    s = { ...s, settings: { ...s.settings, fillActual: false } };
    s = applyOps(s, setDone(s, "task-tomorrow-1", true, NOW), NOW);
    expect(s.tasks["task-tomorrow-1"]!.actual).toBe(0);
  });

  it("completes the parent when its last subtask is checked", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, setSubtaskDone(s, "task-today-2-sub-1", true, NOW), NOW);
    expect(s.tasks["task-today-2"]!.done).toBe(true);
  });

  it("undoes a delete with inverse ops", () => {
    const s = sampleState(TODAY, "UTC", NOW);
    const ops = deleteTask("task-today-3", NOW);
    const after = applyOps(s, ops, NOW);
    expect(after.tasks["task-today-3"]!.deletedAt).toBe(NOW);
    const undone = applyOps(after, invertOps(s, ops), NOW);
    expect(undone.tasks["task-today-3"]!.deletedAt).toBeNull();
  });

  it("restores from Trash to today", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, deleteTask("task-dump-1", NOW), NOW);
    s = applyOps(s, restoreTask(s, "task-dump-1", TODAY), NOW);
    expect(s.tasks["task-dump-1"]!.date).toBe(TODAY);
    expect(s.tasks["task-dump-1"]!.deletedAt).toBeNull();
  });

  it("trashes and restores a list with its tasks", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, deleteList(s, "list-garden", NOW), NOW);
    expect(s.tasks["task-list-2"]!.deletedAt).toBe(NOW);
    s = applyOps(s, restoreList(s, "list-garden"), NOW);
    expect(s.tasks["task-list-2"]!.deletedAt).toBeNull();
  });

  it("adds timer time to actual when stopped", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    s = applyOps(s, startTimerOps(s, "task-today-3", "stopwatch", NOW), NOW);
    s = applyOps(s, stopTimerOps(s, NOW + 6 * 60_000), NOW);
    expect(s.tasks["task-today-3"]!.actual).toBe(6);
    expect(s.settings.activeTimer).toBeNull();
    expect(Object.values(s.timeEntries)).toHaveLength(1);
  });

  it("round-trips templates", () => {
    let s = sampleState(TODAY, "UTC", NOW);
    const tpl = templateFromTask(s, "task-today-2", NOW);
    s = applyOps(s, tpl.ops, NOW);
    const made = taskFromTemplate(s, tpl.id, { date: "2026-11-02" }, NOW);
    s = applyOps(s, made.ops, NOW);
    const task = s.tasks[made.id]!;
    expect(task.title).toBe("Review launch plan");
    expect(task.dueDate).toBeNull();
    expect(Object.values(s.subtasks).filter((x) => x.taskId === made.id)).toHaveLength(2);
  });

  it("totals a day and spots timeboxes past midnight", () => {
    const s = sampleState(TODAY, "UTC", NOW);
    expect(dayTotals(tasksForDay(s, TODAY)).estimate).toBe(115);
    expect(runsPastMidnight({ start: "15:30", estimate: 540 })).toBe(true);
    expect(runsPastMidnight({ start: "09:00", estimate: 60 })).toBe(false);
  });
});
