import { describe, expect, it } from "vitest";
import { applyOps } from "./ops";
import { sampleState } from "./sample";
import { expireTrashOps, trashDaysLeft, TRASH_DAYS } from "./trash";
import { deleteTask, completeWithTimer, startTimerOps } from "./tasks";
import { deleteList } from "./collections";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 31, 12);

describe("Trash", () => {
  it("counts days left", () => {
    expect(trashDaysLeft(NOW, NOW)).toBe(30);
    expect(trashDaysLeft(NOW - DAY, NOW)).toBe(29);
    expect(trashDaysLeft(NOW - 29.5 * DAY, NOW)).toBe(1);
    expect(trashDaysLeft(NOW - 31 * DAY, NOW)).toBe(0);
    expect(trashDaysLeft(NOW + 1000, NOW)).toBe(30);
  });

  it("removes records trashed more than 30 days ago, with their subtasks", () => {
    let s = sampleState("2026-10-31", "UTC", NOW);
    const old = NOW - (TRASH_DAYS + 1) * DAY;
    s = applyOps(s, deleteTask("task-today-2", old), NOW);
    s = applyOps(s, deleteTask("task-today-3", NOW - 5 * DAY), NOW);
    s = applyOps(s, deleteList(s, "list-garden", old), NOW);
    s = applyOps(s, expireTrashOps(s, NOW), NOW);
    expect(s.tasks["task-today-2"]).toBeUndefined();
    expect(s.subtasks["task-today-2-sub-0"]).toBeUndefined();
    expect(s.tasks["task-today-3"]).toBeDefined();
    expect(s.lists["list-garden"]).toBeUndefined();
    expect(s.tasks["task-list-2"]).toBeUndefined();
    expect(expireTrashOps(s, NOW)).toEqual([]);
  });
});

describe("auto-start next task", () => {
  it("starts the timer on the next task when the setting is on", () => {
    let s = sampleState("2026-10-31", "UTC", NOW);
    s = { ...s, settings: { ...s.settings, autoStartNext: true } };
    s = applyOps(s, startTimerOps(s, "task-today-2", "stopwatch", NOW), NOW);
    s = applyOps(s, completeWithTimer(s, "task-today-2", NOW + 60_000), NOW);
    expect(s.tasks["task-today-2"]!.done).toBe(true);
    expect(s.settings.activeTimer?.taskId).toBe("task-today-1");
  });

  it("just stops the timer when the setting is off", () => {
    let s = sampleState("2026-10-31", "UTC", NOW);
    s = applyOps(s, startTimerOps(s, "task-today-2", "stopwatch", NOW), NOW);
    s = applyOps(s, completeWithTimer(s, "task-today-2", NOW + 60_000), NOW);
    expect(s.settings.activeTimer).toBeNull();
    expect(s.tasks["task-today-2"]!.actual).toBe(1);
  });
});
