import { addDays, diffDays } from "./dates";
import { orderAtBottom, orderAtTop } from "./order";
import { patch, type Op } from "./ops";
import type { BeansState, DateKey, Task } from "./model";
import { liveTasks } from "./tasks";

/** Tasks more than this many days overdue stay where they are. */
export const ROLLOVER_MAX_DAYS = 14;

function canRoll(state: BeansState, t: Task): boolean {
  return !t.done && t.deletedAt === null && t.date !== null && (state.settings.rolloverRepeating || t.seriesId === null);
}

/**
 * Moves unfinished tasks from `from` days onto `to`, keeping their relative
 * order, at the top or bottom as the user chose.
 */
export function moveUnfinished(state: BeansState, tasks: Task[], to: DateKey): Op[] {
  const sorted = [...tasks].sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : a.order - b.order));
  const existing = liveTasks(state).filter((t) => t.date === to && !sorted.some((s) => s.id === t.id)).map((t) => t.order);
  const ops: Op[] = [];
  const top = state.settings.rolloverPosition === "top";
  let next = top ? orderAtTop(existing) - sorted.length : orderAtBottom(existing);
  for (const t of sorted) {
    ops.push(patch("tasks", t.id, { date: to, start: null, order: next, rolledFrom: t.date }));
    next += 1;
  }
  return ops;
}

/**
 * Daily rollover for `today`. Safe to run more than once: after the first
 * run nothing is left on past days to move, and `lastRollover` records it.
 */
export function rolloverOps(state: BeansState, today: DateKey): Op[] {
  if (state.settings.lastRollover === today) return [];
  const ops: Op[] = [];
  if (state.settings.rollover) {
    const earliest = addDays(today, -ROLLOVER_MAX_DAYS);
    const due = liveTasks(state).filter((t) => canRoll(state, t) && t.date! < today && t.date! >= earliest);
    ops.push(...moveUnfinished(state, due, today));
  }
  ops.push({ kind: "settings", fields: { lastRollover: today } });
  return ops;
}

/** Unfinished tasks on `day` that would roll to the next day, and those that won't. */
export function wrapUpSplit(state: BeansState, day: DateKey): { rolling: Task[]; staying: Task[] } {
  const undone = liveTasks(state).filter((t) => t.date === day && !t.done);
  return {
    rolling: undone.filter((t) => canRoll(state, t)),
    staying: undone.filter((t) => !canRoll(state, t)),
  };
}

export function daysOverdue(task: Task, today: DateKey): number {
  return task.date ? diffDays(today, task.date) : 0;
}
