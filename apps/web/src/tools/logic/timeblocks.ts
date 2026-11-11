import { formatTime, minutesToTime } from "@beans/core/dates";

/** The time blocking planner: one day's tasks, and where each sits on the hours. All pure. */

export type PlanTask = {
  id: string;
  title: string;
  /** How long it takes. */
  minutes: number;
  /** Minutes after midnight, or null while it isn't on the schedule. */
  start: number | null;
  done: boolean;
};

export type DayPlan = {
  title: string;
  /** The hours shown, 0 to 24. */
  from: number;
  to: number;
  tasks: PlanTask[];
};

/** Blocks move and stretch in steps of this many minutes. */
export const SNAP = 15;
export const MAX_TASKS = 40;
export const LENGTHS = [15, 30, 45, 60, 90, 120, 180, 240];

export const EMPTY_PLAN: DayPlan = { title: "", from: 8, to: 18, tasks: [] };

export const EXAMPLE_PLAN: DayPlan = {
  title: "Tuesday",
  from: 8,
  to: 18,
  tasks: [
    { id: "ex1", title: "Write the weekly update", minutes: 45, start: 9 * 60, done: false },
    { id: "ex2", title: "Review launch plan", minutes: 60, start: 10 * 60, done: false },
    { id: "ex3", title: "Lunch and a walk", minutes: 45, start: 12 * 60, done: false },
    { id: "ex4", title: "Answer email", minutes: 30, start: 13 * 60, done: false },
    { id: "ex5", title: "Book a dentist appointment", minutes: 15, start: null, done: false },
    { id: "ex6", title: "Look into a standing desk", minutes: 30, start: null, done: false },
  ],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snap = (minutes: number) => Math.round(minutes / SNAP) * SNAP;
const clean = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 120);

const dayStart = (plan: DayPlan) => plan.from * 60;
const dayEnd = (plan: DayPlan) => plan.to * 60;

const change = (plan: DayPlan, id: string, edit: (task: PlanTask) => PlanTask): DayPlan => ({
  ...plan,
  tasks: plan.tasks.map((task) => (task.id === id ? edit(task) : task)),
});

/** Holds a start inside the visible hours, on a step, with room for the whole block. */
function fit(plan: DayPlan, start: number, minutes: number): number {
  return clamp(snap(start), dayStart(plan), Math.max(dayStart(plan), dayEnd(plan) - minutes));
}

export function addTask(plan: DayPlan, title: string, minutes: number, id: string): DayPlan {
  const cleaned = clean(title);
  if (!cleaned || plan.tasks.length >= MAX_TASKS) return plan;
  return { ...plan, tasks: [...plan.tasks, { id, title: cleaned, minutes: clamp(snap(minutes), SNAP, 8 * 60), start: null, done: false }] };
}

export function removeTask(plan: DayPlan, id: string): DayPlan {
  return { ...plan, tasks: plan.tasks.filter((task) => task.id !== id) };
}

export function renameTask(plan: DayPlan, id: string, title: string): DayPlan {
  const cleaned = clean(title);
  return cleaned ? change(plan, id, (task) => ({ ...task, title: cleaned })) : removeTask(plan, id);
}

export function toggleTask(plan: DayPlan, id: string): DayPlan {
  return change(plan, id, (task) => ({ ...task, done: !task.done }));
}

/** Puts a task on the schedule at `start`, or takes it off with null. */
export function setStart(plan: DayPlan, id: string, start: number | null): DayPlan {
  return change(plan, id, (task) => ({ ...task, start: start === null ? null : fit(plan, start, task.minutes) }));
}

/** Changes how long a task takes. A scheduled block never runs past the last hour shown. */
export function setMinutes(plan: DayPlan, id: string, minutes: number): DayPlan {
  return change(plan, id, (task) => {
    const room = task.start === null ? 8 * 60 : dayEnd(plan) - task.start;
    const next = clamp(snap(minutes), SNAP, Math.max(SNAP, room));
    return { ...task, minutes: next };
  });
}

export function moveBy(plan: DayPlan, id: string, delta: number): DayPlan {
  return change(plan, id, (task) => (task.start === null ? task : { ...task, start: fit(plan, task.start + delta, task.minutes) }));
}

export function resizeBy(plan: DayPlan, id: string, delta: number): DayPlan {
  const task = plan.tasks.find((t) => t.id === id);
  return task ? setMinutes(plan, id, task.minutes + delta) : plan;
}

/** The first gap that holds `minutes`, at or after `after`. Null when the day is full. */
export function nextFree(plan: DayPlan, minutes: number, after: number = dayStart(plan), skipId?: string): number | null {
  const busy = plan.tasks
    .filter((task) => task.start !== null && task.id !== skipId)
    .map((task) => [task.start!, task.start! + task.minutes] as const)
    .sort((a, b) => a[0] - b[0]);
  let at = Math.max(dayStart(plan), Math.ceil(after / SNAP) * SNAP);
  for (const [start, end] of busy) {
    if (at + minutes <= start) break;
    if (end > at) at = Math.ceil(end / SNAP) * SNAP;
  }
  return at + minutes <= dayEnd(plan) ? at : null;
}

/** Schedules a task in the first gap it fits. The plan is unchanged when nothing fits. */
export function scheduleNext(plan: DayPlan, id: string): DayPlan {
  const task = plan.tasks.find((t) => t.id === id);
  if (!task) return plan;
  const at = nextFree(plan, task.minutes, dayStart(plan), id);
  return at === null ? plan : setStart(plan, id, at);
}

/** Changes the hours shown. Blocks that no longer fit go back to the list. */
export function setHours(plan: DayPlan, from: number, to: number): DayPlan {
  const first = clamp(Math.round(from), 0, 23);
  const last = clamp(Math.round(to), first + 1, 24);
  return {
    ...plan,
    from: first,
    to: last,
    tasks: plan.tasks.map((task) => (task.start !== null && (task.start < first * 60 || task.start + task.minutes > last * 60) ? { ...task, start: null } : task)),
  };
}

export type Placed = { task: PlanTask; start: number; col: number; cols: number };

/**
 * Where each scheduled block goes. Blocks that overlap share the width side
 * by side: each group of touching blocks is split into as many columns as it
 * needs.
 */
export function layout(tasks: PlanTask[]): Placed[] {
  const sorted = tasks.filter((task) => task.start !== null).sort((a, b) => a.start! - b.start! || b.minutes - a.minutes);
  const placed: Placed[] = [];
  let group: Placed[] = [];
  let groupEnd = -1;
  let columnEnds: number[] = [];
  const close = () => {
    for (const item of group) item.cols = columnEnds.length;
    placed.push(...group);
    group = [];
    columnEnds = [];
  };
  for (const task of sorted) {
    const start = task.start!;
    if (group.length && start >= groupEnd) close();
    let col = columnEnds.findIndex((end) => end <= start);
    if (col < 0) col = columnEnds.length;
    columnEnds[col] = start + task.minutes;
    groupEnd = Math.max(groupEnd, start + task.minutes);
    group.push({ task, start, col, cols: 1 });
  }
  close();
  return placed;
}

export type Totals = {
  /** Minutes on the schedule, counting overlapping time once. */
  blocked: number;
  /** Minutes in the hours shown. */
  capacity: number;
  /** Tasks not on the schedule yet. */
  waiting: number;
  /** Minutes those waiting tasks need. */
  waitingMinutes: number;
};

export function totals(plan: DayPlan): Totals {
  const spans = plan.tasks
    .filter((task) => task.start !== null)
    .map((task) => [task.start!, task.start! + task.minutes] as const)
    .sort((a, b) => a[0] - b[0]);
  let blocked = 0;
  let reach = -1;
  for (const [start, end] of spans) {
    if (end <= reach) continue;
    blocked += end - Math.max(start, reach);
    reach = end;
  }
  const waiting = plan.tasks.filter((task) => task.start === null);
  return { blocked, capacity: dayEnd(plan) - dayStart(plan), waiting: waiting.length, waitingMinutes: waiting.reduce((sum, task) => sum + task.minutes, 0) };
}

/** "9:00am" */
export const clock = (minutes: number): string => formatTime(minutesToTime(minutes % (24 * 60)), "12h");

/** "9:00am – 9:45am". A block that ends at midnight reads "12:00am". */
export const range = (start: number, minutes: number): string => `${clock(start)} – ${clock(start + minutes)}`;

/** The plan as plain text, for the clipboard: the schedule in order, then what's still waiting. */
export function planAsText(plan: DayPlan): string {
  const scheduled = plan.tasks.filter((task) => task.start !== null).sort((a, b) => a.start! - b.start!);
  const waiting = plan.tasks.filter((task) => task.start === null);
  const lines = [plan.title.trim(), ...scheduled.map((task) => `${range(task.start!, task.minutes)}  ${task.title}`)];
  if (waiting.length) lines.push("", "Not scheduled:", ...waiting.map((task) => `- ${task.title} (${task.minutes} min)`));
  return lines.filter((line, i) => line || i > 0).join("\n").trim();
}

/** Checks a plan read back from local storage. */
export function parseDayPlan(stored: unknown): DayPlan | null {
  if (!stored || typeof stored !== "object") return null;
  const { title, from, to, tasks } = stored as Record<string, unknown>;
  if (typeof title !== "string" || typeof from !== "number" || typeof to !== "number" || !Array.isArray(tasks)) return null;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 24 || from >= to) return null;
  const parsed: PlanTask[] = [];
  for (const task of tasks.slice(0, MAX_TASKS)) {
    if (!task || typeof task !== "object") return null;
    const t = task as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.title !== "string" || typeof t.minutes !== "number" || typeof t.done !== "boolean") return null;
    if (t.start !== null && typeof t.start !== "number") return null;
    if (!Number.isFinite(t.minutes) || t.minutes < SNAP || t.minutes > 8 * 60) return null;
    const start = t.start === null || t.start < from * 60 || t.start + t.minutes > to * 60 ? null : t.start;
    parsed.push({ id: t.id, title: t.title.slice(0, 120), minutes: t.minutes, start, done: t.done });
  }
  return { title: title.slice(0, 120), from, to, tasks: parsed };
}
