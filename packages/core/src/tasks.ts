import { orderAtBottom, orderAtIndex, orderAtTop } from "./order";
import { newId } from "./ids";
import { patch, put, type Op } from "./ops";
import type { BeansState, DateKey, Label, Priority, Subtask, Task, TimeKey } from "./model";
import { timeToMinutes } from "./dates";

// ---------- Selectors ----------

export function liveTasks(state: BeansState): Task[] {
  return Object.values(state.tasks).filter((t) => t.deletedAt === null);
}

export function liveLabels(state: BeansState): Label[] {
  return Object.values(state.labels)
    .filter((l) => l.deletedAt === null)
    .sort((a, b) => a.order - b.order);
}

/** Board order for one day: timeboxed first by time, then by position, finished last. */
export function sortDay(tasks: Task[], completedToBottom: boolean): Task[] {
  return [...tasks].sort((a, b) => {
    if (completedToBottom && a.done !== b.done) return a.done ? 1 : -1;
    const aBox = a.start !== null && !(completedToBottom && a.done);
    const bBox = b.start !== null && !(completedToBottom && b.done);
    if (aBox !== bBox) return aBox ? -1 : 1;
    if (aBox && bBox) {
      const diff = timeToMinutes(a.start!) - timeToMinutes(b.start!);
      if (diff !== 0) return diff;
    }
    return a.order - b.order;
  });
}

export function sortList(tasks: Task[], completedToBottom: boolean): Task[] {
  return [...tasks].sort((a, b) => {
    if (completedToBottom && a.done !== b.done) return a.done ? 1 : -1;
    return a.order - b.order;
  });
}

export function tasksForDay(state: BeansState, date: DateKey): Task[] {
  return sortDay(
    liveTasks(state).filter((t) => t.date === date),
    state.settings.completedToBottom,
  );
}

export function tasksForList(state: BeansState, listId: string | null): Task[] {
  return sortList(
    liveTasks(state).filter((t) => t.date === null && t.listId === listId),
    state.settings.completedToBottom,
  );
}

export function subtasksFor(state: BeansState, taskId: string): Subtask[] {
  return Object.values(state.subtasks)
    .filter((s) => s.taskId === taskId && s.deletedAt === null)
    .sort((a, b) => a.order - b.order);
}

export interface DayTotals {
  estimate: number;
  actual: number;
  count: number;
  done: number;
}

export function dayTotals(tasks: Task[]): DayTotals {
  return tasks.reduce<DayTotals>(
    (acc, t) => ({
      estimate: acc.estimate + (t.estimate ?? 0),
      actual: acc.actual + t.actual,
      count: acc.count + 1,
      done: acc.done + (t.done ? 1 : 0),
    }),
    { estimate: 0, actual: 0, count: 0, done: 0 },
  );
}

/** Block length on the calendar, in minutes. */
export function blockMinutes(task: Pick<Task, "estimate">): number {
  return task.estimate && task.estimate > 0 ? task.estimate : 30;
}

/** True when a timebox runs past the end of its day. */
export function runsPastMidnight(task: Pick<Task, "start" | "estimate">): boolean {
  if (!task.start) return false;
  return timeToMinutes(task.start) + blockMinutes(task) > 24 * 60;
}

// ---------- Label detection ----------

/**
 * Finds `[label name]` in a title. Matches are case-insensitive and the first
 * match wins. Returns the cleaned title and the label, if any.
 */
export function detectLabel(title: string, labels: Label[]): { title: string; labelId: string | null } {
  const re = /\[([^\]]+)\]/g;
  for (const m of title.matchAll(re)) {
    const name = m[1]!.trim().toLowerCase();
    const label = labels.find((l) => l.name.trim().toLowerCase() === name);
    if (label) {
      const cleaned = (title.slice(0, m.index) + title.slice(m.index! + m[0].length)).replace(/\s{2,}/g, " ").trim();
      return { title: cleaned, labelId: label.id };
    }
  }
  return { title, labelId: null };
}

// ---------- Actions ----------

export interface NewTaskInput {
  title: string;
  date?: DateKey | null;
  listId?: string | null;
  start?: TimeKey | null;
  labelId?: string | null;
  estimate?: number | null;
  priority?: Priority | null;
  dueDate?: DateKey | null;
  notes?: string;
  subtasks?: string[];
  /** Where to insert, overriding the user's top/bottom setting. */
  position?: "top" | "bottom";
  id?: string;
}

export function baseTask(id: string, now: number): Task {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    title: "",
    notes: "",
    date: null,
    listId: null,
    order: 0,
    done: false,
    completedAt: null,
    labelId: null,
    estimate: null,
    actual: 0,
    start: null,
    dueDate: null,
    priority: null,
    seriesId: null,
    seriesDate: null,
    rolledFrom: null,
  };
}

function containerOrders(state: BeansState, date: DateKey | null, listId: string | null, exclude?: string): number[] {
  return liveTasks(state)
    .filter((t) => t.id !== exclude && (date ? t.date === date : t.date === null && t.listId === listId))
    .map((t) => t.order);
}

export function createTask(state: BeansState, input: NewTaskInput, now: number = Date.now()): { id: string; ops: Op[] } {
  const id = input.id ?? newId(now);
  const date = input.date ?? null;
  const listId = date ? null : (input.listId ?? null);
  let title = input.title.trim();
  let labelId = input.labelId ?? null;
  if (state.settings.detectLabels && labelId === null) {
    const found = detectLabel(title, liveLabels(state));
    title = found.title;
    labelId = found.labelId;
  }
  if (labelId === null && listId) {
    labelId = state.lists[listId]?.autoLabelId ?? null;
  }
  const orders = containerOrders(state, date, listId);
  const position = input.position ?? state.settings.newTaskPosition;
  const task: Task = {
    ...baseTask(id, now),
    title,
    notes: input.notes ?? "",
    date,
    listId,
    order: position === "top" ? orderAtTop(orders) : orderAtBottom(orders),
    labelId,
    estimate: input.estimate !== undefined ? input.estimate : state.settings.defaultEstimate,
    start: date ? (input.start ?? null) : null,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? null,
  };
  const ops: Op[] = [put("tasks", task)];
  (input.subtasks ?? []).forEach((st, i) => {
    ops.push(put("subtasks", newSubtask(task.id, st, i, now)));
  });
  return { id, ops };
}

export function newSubtask(taskId: string, title: string, order: number, now: number = Date.now()): Subtask {
  return {
    id: newId(now),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    taskId,
    title,
    done: false,
    order,
  };
}

export function updateTask(id: string, fields: Partial<Omit<Task, "id" | "createdAt">>): Op[] {
  return [patch("tasks", id, fields)];
}

export interface MoveTarget {
  date: DateKey | null;
  listId?: string | null;
  /** Index in the target's board order, after removing the task itself. */
  index?: number;
  /** Timebox start. `undefined` clears it on the board, `null` clears it too. */
  start?: TimeKey | null;
}

/** Moves a task to a day, list or timebox slot. */
export function moveTask(state: BeansState, id: string, target: MoveTarget): Op[] {
  const task = state.tasks[id];
  if (!task) return [];
  const date = target.date;
  const listId = date ? null : (target.listId ?? null);
  let order = task.order;
  if (target.index !== undefined) {
    const siblings = (date ? tasksForDay(state, date) : tasksForList(state, listId)).filter((t) => t.id !== id);
    // Timeboxed tasks sort by time, so only untimed tasks in the same done group carry order.
    const ordered = siblings.filter((t) => t.start === null && t.done === task.done);
    const before = siblings.slice(0, target.index).filter((t) => t.start === null && t.done === task.done).length;
    order = orderAtIndex(ordered.map((t) => t.order), before);
  } else if (date !== task.date || listId !== task.listId) {
    const orders = containerOrders(state, date, listId, id);
    order = orderAtTop(orders);
  }
  const start = date ? (target.start ?? null) : null;
  const fields: Partial<Task> = { date, listId, order, start };
  if (listId && listId !== task.listId && task.labelId === null) {
    fields.labelId = state.lists[listId]?.autoLabelId ?? null;
  }
  return [patch("tasks", id, fields)];
}

export function setDone(state: BeansState, id: string, done: boolean, now: number = Date.now()): Op[] {
  const task = state.tasks[id];
  if (!task || task.done === done) return [];
  const fields: Partial<Task> = { done, completedAt: done ? now : null };
  if (done && state.settings.fillActual && task.actual === 0 && task.estimate) {
    fields.actual = task.estimate;
  }
  const ops: Op[] = [patch("tasks", id, fields)];
  if (done && state.settings.activeTimer?.taskId === id) {
    // Tracked time replaces the filled estimate because its patch comes last.
    ops.push(...stopTimerOps(state, now));
  }
  return ops;
}

export function toggleDone(state: BeansState, id: string, now: number = Date.now()): Op[] {
  const task = state.tasks[id];
  return task ? setDone(state, id, !task.done, now) : [];
}

export function deleteTask(id: string, now: number = Date.now()): Op[] {
  return [patch("tasks", id, { deletedAt: now })];
}

export function restoreTask(state: BeansState, id: string, today: DateKey): Op[] {
  const task = state.tasks[id];
  if (!task) return [];
  const orders = containerOrders(state, today, null, id);
  return [patch("tasks", id, { deletedAt: null, date: today, listId: null, start: null, order: orderAtTop(orders) })];
}

export function duplicateTask(state: BeansState, id: string, now: number = Date.now()): { id: string; ops: Op[] } {
  const task = state.tasks[id];
  if (!task) return { id: "", ops: [] };
  const copyId = newId(now);
  const ops: Op[] = [
    put("tasks", {
      ...task,
      id: copyId,
      createdAt: now,
      updatedAt: now,
      done: false,
      completedAt: null,
      actual: 0,
      order: task.order + 0.001,
      seriesId: null,
      seriesDate: null,
      rolledFrom: null,
    }),
  ];
  subtasksFor(state, id).forEach((s) => {
    ops.push(put("subtasks", { ...s, id: newId(now), taskId: copyId, done: false, createdAt: now, updatedAt: now }));
  });
  return { id: copyId, ops };
}

// ---------- Subtasks ----------

export function addSubtask(state: BeansState, taskId: string, title: string, afterId?: string, now: number = Date.now()): { id: string; ops: Op[] } {
  const siblings = subtasksFor(state, taskId);
  let order: number;
  if (afterId) {
    const idx = siblings.findIndex((s) => s.id === afterId);
    order = orderAtIndex(siblings.map((s) => s.order), idx + 1);
  } else {
    order = orderAtBottom(siblings.map((s) => s.order));
  }
  const sub = { ...newSubtask(taskId, title, order, now) };
  return { id: sub.id, ops: [put("subtasks", sub)] };
}

export function setSubtaskDone(state: BeansState, subtaskId: string, done: boolean, now: number = Date.now()): Op[] {
  const sub = state.subtasks[subtaskId];
  if (!sub) return [];
  const ops: Op[] = [patch("subtasks", subtaskId, { done })];
  const task = state.tasks[sub.taskId];
  if (done && task && !task.done && state.settings.completeWithSubtasks) {
    const others = subtasksFor(state, sub.taskId).filter((s) => s.id !== subtaskId);
    if (others.every((s) => s.done)) ops.push(...setDone(state, task.id, true, now));
  }
  return ops;
}

export function moveSubtask(state: BeansState, subtaskId: string, index: number): Op[] {
  const sub = state.subtasks[subtaskId];
  if (!sub) return [];
  const siblings = subtasksFor(state, sub.taskId).filter((s) => s.id !== subtaskId);
  return [patch("subtasks", subtaskId, { order: orderAtIndex(siblings.map((s) => s.order), index) })];
}

// ---------- Timer ----------

/** Elapsed milliseconds in the timer's current phase. */
export function timerElapsed(timer: NonNullable<BeansState["settings"]["activeTimer"]>, now: number = Date.now()): number {
  return timer.bankedMs + (timer.runningSince !== null ? now - timer.runningSince : 0);
}

export function startTimerOps(state: BeansState, taskId: string, mode: "stopwatch" | "pomodoro", now: number = Date.now()): Op[] {
  const ops: Op[] = [];
  if (state.settings.activeTimer) ops.push(...stopTimerOps(state, now));
  ops.push({
    kind: "settings",
    fields: { activeTimer: { taskId, mode, runningSince: now, bankedMs: 0, phase: "focus" } },
  });
  return ops;
}

export function pauseTimerOps(state: BeansState, now: number = Date.now()): Op[] {
  const timer = state.settings.activeTimer;
  if (!timer || timer.runningSince === null) return [];
  return [{ kind: "settings", fields: { activeTimer: { ...timer, runningSince: null, bankedMs: timerElapsed(timer, now) } } }];
}

export function resumeTimerOps(state: BeansState, now: number = Date.now()): Op[] {
  const timer = state.settings.activeTimer;
  if (!timer || timer.runningSince !== null) return [];
  return [{ kind: "settings", fields: { activeTimer: { ...timer, runningSince: now } } }];
}

/** Stops the timer and adds focus time to the task's actual time. */
export function stopTimerOps(state: BeansState, now: number = Date.now()): Op[] {
  const timer = state.settings.activeTimer;
  if (!timer) return [];
  const ops: Op[] = [{ kind: "settings", fields: { activeTimer: null } }];
  const task = state.tasks[timer.taskId];
  if (task && timer.phase === "focus") {
    const ms = timerElapsed(timer, now);
    const minutes = Math.round((ms / 60000) * 100) / 100;
    if (minutes > 0) {
      ops.push(patch("tasks", task.id, { actual: Math.round((task.actual + minutes) * 100) / 100 }));
      ops.push(
        put("timeEntries", {
          id: newId(now),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          taskId: task.id,
          kind: timer.mode === "pomodoro" ? "focus" : "timer",
          startedAt: now - ms,
          endedAt: now,
        }),
      );
    }
  }
  return ops;
}

/** Switches a Pomodoro between focus and break, banking focus time first. */
export function switchPhaseOps(state: BeansState, now: number = Date.now()): Op[] {
  const timer = state.settings.activeTimer;
  if (!timer || timer.mode !== "pomodoro") return [];
  const ops: Op[] = [];
  if (timer.phase === "focus") {
    const stop = stopTimerOps(state, now).filter((op) => op.kind !== "settings");
    ops.push(...stop);
  }
  ops.push({
    kind: "settings",
    fields: {
      activeTimer: { ...timer, phase: timer.phase === "focus" ? "break" : "focus", runningSince: now, bankedMs: 0 },
    },
  });
  return ops;
}
