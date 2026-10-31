import { remove, type Op } from "./ops";
import type { BeansState } from "./model";

export const TRASH_DAYS = 30;
const DAY_MS = 86_400_000;

/** Whole days left before a trashed record is removed for good. */
export function trashDaysLeft(deletedAt: number, now: number = Date.now()): number {
  return Math.min(TRASH_DAYS, Math.max(0, Math.ceil((deletedAt + TRASH_DAYS * DAY_MS - now) / DAY_MS)));
}

/**
 * Ops that remove records trashed more than 30 days ago, along with the
 * subtasks of removed tasks. Safe to repeat.
 */
export function expireTrashOps(state: BeansState, now: number = Date.now()): Op[] {
  const cutoff = now - TRASH_DAYS * DAY_MS;
  const ops: Op[] = [];
  const goneTasks = new Set<string>();
  for (const t of Object.values(state.tasks)) {
    if (t.deletedAt !== null && t.deletedAt <= cutoff) {
      ops.push(remove("tasks", t.id));
      goneTasks.add(t.id);
    }
  }
  for (const s of Object.values(state.subtasks)) {
    if (goneTasks.has(s.taskId) || (s.deletedAt !== null && s.deletedAt <= cutoff)) ops.push(remove("subtasks", s.id));
  }
  for (const table of ["lists", "templates", "series"] as const) {
    for (const r of Object.values(state[table])) {
      if (r.deletedAt !== null && r.deletedAt <= cutoff) ops.push(remove(table, r.id));
    }
  }
  return ops;
}
