import {
  addDays,
  applyOps,
  baseTask,
  defaultSettings,
  emptyState,
  put,
  timeToMinutes,
  type BeansState,
  type DateKey,
  type Label,
  type Op,
  type TimeKey,
} from "@beans/core";

/** The film's own fixed Tuesday. Nothing here reads the real date. */
export const TODAY: DateKey = "2026-11-03";
export const TOMORROW: DateKey = addDays(TODAY, 1);
export const ZONE = "UTC";

/** A wall-clock moment on `date`, as milliseconds. */
export function moment(date: DateKey, time: TimeKey): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) + timeToMinutes(time) * 60_000;
}

export const START_TIME = moment(TODAY, "08:41");

/**
 * The planner as it stands on Tuesday morning: one idea in the Brain Dump and a
 * few things later in the week. The Brain Dump is never empty on screen, because
 * its empty state shows "Spill the beans" alone, and the film only uses that
 * line where it's explained.
 */
export function initialState(): BeansState {
  const now = START_TIME;
  const settings = {
    ...defaultSettings(ZONE, now),
    theme: "light" as const,
    // A finished task stays where it is, so the sprout happens in place.
    completedToBottom: false,
    lastRollover: TODAY,
  };
  const record = { createdAt: now, updatedAt: now, deletedAt: null };
  const labels: Label[] = [
    { ...record, id: "label-work", name: "Work", color: "rain", order: 0 },
    { ...record, id: "label-home", name: "Home", color: "pumpkin", order: 1 },
    { ...record, id: "label-health", name: "Health", color: "sprout", order: 2 },
    { ...record, id: "label-side", name: "Side project", color: "plum", order: 3 },
  ];
  const task = (id: string, fields: Partial<ReturnType<typeof baseTask>>) => put("tasks", { ...baseTask(id, now), ...fields });
  const ops: Op[] = [
    ...labels.map((l) => put("labels", l)),
    task("t-gift", { title: "Find a birthday gift", labelId: "label-home", estimate: 30, order: 0 }),
    task("t-gym", { title: "Renew the gym plan", date: TOMORROW, labelId: "label-health", estimate: 15, order: 0 }),
    task("t-trip", { title: "Plan the weekend trip", date: addDays(TODAY, 2), labelId: "label-home", estimate: 60, order: 0 }),
    task("t-tax", { title: "File the receipts", date: addDays(TODAY, 2), labelId: "label-work", estimate: 30, order: 1 }),
    task("t-demo", { title: "Rehearse the demo", date: addDays(TODAY, 3), labelId: "label-work", estimate: 45, order: 0 }),
    task("t-market", { title: "Farmers market", date: addDays(TODAY, 4), labelId: "label-home", estimate: 60, order: 0 }),
    task("t-meal", { title: "Meal prep", date: addDays(TODAY, 5), labelId: "label-health", estimate: 90, order: 0 }),
  ];
  return applyOps(emptyState(settings), ops, now);
}
