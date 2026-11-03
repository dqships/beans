import { addDays, diffDays, todayIn } from "./dates";
import type { DateKey, Task } from "./model";

/**
 * Analytics math, shared by the analytics screen and the MCP `get_analytics`
 * tool so both count the same way.
 */

/** Days a Brain Dump task can sit before it needs attention. */
export const STALE_DAYS = 14;

/** The day a finished task counts on: when it was checked off, else its planned day. */
export function completedDay(task: Task, timeZone: string): DateKey {
  return task.completedAt ? todayIn(timeZone, task.completedAt) : (task.date ?? "");
}

/** Finished, live tasks completed between `from` and `to`, both included, newest first. */
export function finishedBetween(tasks: Task[], from: DateKey, to: DateKey, timeZone: string): Task[] {
  return tasks
    .filter((t) => {
      if (!t.done || t.deletedAt !== null) return false;
      const day = completedDay(t, timeZone);
      return day >= from && day <= to;
    })
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

/** Tracked minutes and task count for one group. */
export interface Tally {
  minutes: number;
  tasks: number;
}

export interface LabelTally extends Tally {
  labelId: string | null;
}

export interface DayTally extends Tally {
  date: DateKey;
}

export interface EstimateAccuracy {
  /** Finished tasks that had an estimate. */
  tasks: number;
  estimated: number;
  actual: number;
  /** Actual over estimate, such as 1.2 for 20% over. `null` with nothing to compare. */
  ratio: number | null;
}

export interface Analytics {
  from: DateKey;
  to: DateKey;
  finished: Task[];
  total: Tally;
  /** Largest group first, by minutes and then by task count. */
  byLabel: LabelTally[];
  /** Every day in the range, oldest first, including empty days. */
  perDay: DayTally[];
  estimates: EstimateAccuracy;
}

const tally = (tasks: Task[]): Tally => ({ minutes: tasks.reduce((s, t) => s + t.actual, 0), tasks: tasks.length });

export function analyticsFor(tasks: Task[], from: DateKey, to: DateKey, timeZone: string): Analytics {
  const finished = finishedBetween(tasks, from, to, timeZone);

  const groups = new Map<string | null, Task[]>();
  for (const t of finished) groups.set(t.labelId, [...(groups.get(t.labelId) ?? []), t]);
  const byLabel = [...groups.entries()]
    .map(([labelId, group]) => ({ labelId, ...tally(group) }))
    .sort((a, b) => b.minutes - a.minutes || b.tasks - a.tasks);

  const perDay: DayTally[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    perDay.push({ date: d, ...tally(finished.filter((t) => completedDay(t, timeZone) === d)) });
  }

  const estimated = finished.filter((t) => t.estimate !== null && t.estimate > 0);
  const est = estimated.reduce((s, t) => s + t.estimate!, 0);
  const act = estimated.reduce((s, t) => s + t.actual, 0);

  return {
    from,
    to,
    finished,
    total: tally(finished),
    byLabel,
    perDay,
    estimates: { tasks: estimated.length, estimated: est, actual: act, ratio: est > 0 ? Math.round((act / est) * 100) / 100 : null },
  };
}

/** Days a task has been in the Brain Dump or a list, counted from when it was made. */
export function ageInDays(task: Task, today: DateKey, timeZone: string): number {
  return diffDays(today, todayIn(timeZone, task.createdAt));
}

export interface BrainDumpAge {
  /** Unfinished undated tasks, in the Brain Dump and in lists. */
  count: number;
  averageDays: number;
  /** Tasks that have waited `STALE_DAYS` or more. */
  stale: Task[];
}

export function brainDumpAge(tasks: Task[], today: DateKey, timeZone: string): BrainDumpAge {
  const waiting = tasks.filter((t) => t.date === null && !t.done && t.deletedAt === null);
  const ages = waiting.map((t) => ageInDays(t, today, timeZone));
  return {
    count: waiting.length,
    averageDays: waiting.length ? Math.round(ages.reduce((s, a) => s + a, 0) / waiting.length) : 0,
    stale: waiting.filter((_, i) => ages[i]! >= STALE_DAYS),
  };
}
