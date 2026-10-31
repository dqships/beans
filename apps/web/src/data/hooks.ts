"use client";

/**
 * The thin data hooks. Screens read and write Beans data only through these,
 * so the backend behind them (sample data, Convex, or a local database for the
 * desktop app later) can change without touching a screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  addDays,
  addSubtask,
  applyOps,
  createLabel,
  createList,
  createTask,
  createTemplate,
  changeRule,
  completeWithTimer,
  deleteInstance,
  deleteSeries,
  makeRepeating,
  moveUnfinished,
  rolloverOps,
  stopRepeating,
  updateAllIncomplete,
  deleteLabel,
  deleteList,
  deleteTask,
  duplicateTask,
  invertOps,
  liveLabels,
  liveLists,
  liveTasks,
  liveTemplates,
  moveSubtask,
  moveTask,
  newId,
  patch,
  pauseTimerOps,
  remove,
  restoreList,
  restoreTask,
  resumeTimerOps,
  setDone,
  setSubtaskDone,
  startTimerOps,
  stopTimerOps,
  subtasksFor,
  switchPhaseOps,
  taskFromTemplate,
  tasksForDay,
  tasksForList,
  templateFromTask,
  todayIn,
  type BeansState,
  type DateKey,
  type Label,
  type List,
  type MoveTarget,
  type NewTaskInput,
  type Op,
  type Settings,
  type Subtask,
  type Task,
  type Template,
  type TemplateInput,
} from "@beans/core";
import { useDataStore } from "./store";

const EMPTY: never[] = [];

function useStateSelector<T>(select: (state: BeansState) => T, fallback: T): T {
  const { state } = useDataStore();
  return useMemo(() => (state ? select(state) : fallback), [state, select, fallback]);
}

export function useDataReady(): boolean {
  return useDataStore().state !== null;
}

export function useBackend(): "sample" | "convex" {
  return useDataStore().backend;
}

/** The last save problem and a way to dismiss it. */
export function useSyncError(): [string | null, () => void] {
  const store = useDataStore();
  return [store.error ?? null, store.clearError ?? (() => {})];
}

export function useSettings(): Settings | null {
  return useDataStore().state?.settings ?? null;
}

// ---------- Time ----------

const minuteListeners = new Set<() => void>();
let minuteTimer: ReturnType<typeof setInterval> | null = null;
let minuteNow = Date.now();

function subscribeMinute(listener: () => void) {
  minuteListeners.add(listener);
  minuteNow = Date.now();
  if (!minuteTimer) {
    minuteTimer = setInterval(() => {
      minuteNow = Date.now();
      minuteListeners.forEach((l) => l());
    }, 15_000);
  }
  return () => {
    minuteListeners.delete(listener);
    if (!minuteListeners.size && minuteTimer) {
      clearInterval(minuteTimer);
      minuteTimer = null;
    }
  };
}

/** Current time, refreshed every 15 seconds. */
export function useClock(): number {
  return useSyncExternalStore(subscribeMinute, () => minuteNow, () => minuteNow);
}

/** Current time, refreshed every second while `active`. */
export function useTicker(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return active ? now : now;
}

export function useTimeZone(): string {
  return useSettings()?.timeZone ?? "UTC";
}

export function useToday(): DateKey {
  const zone = useTimeZone();
  const now = useClock();
  return todayIn(zone, now);
}

// ---------- Reads ----------

export function useDayTasks(date: DateKey): Task[] {
  const select = useCallback((s: BeansState) => tasksForDay(s, date), [date]);
  return useStateSelector(select, EMPTY);
}

/** Dated tasks for several days at once, keyed by day. */
export function useRangeTasks(from: DateKey, days: number): Record<DateKey, Task[]> {
  const { requestRange } = useDataStore();
  const to = addDays(from, days - 1);
  useEffect(() => requestRange(from, to), [from, to, requestRange]);
  const select = useCallback(
    (s: BeansState) => {
      const out: Record<DateKey, Task[]> = {};
      for (let i = 0; i < days; i++) {
        const d = addDays(from, i);
        out[d] = tasksForDay(s, d);
      }
      return out;
    },
    [from, days],
  );
  return useStateSelector(select, {});
}

export function useListTasks(listId: string | null): Task[] {
  const select = useCallback((s: BeansState) => tasksForList(s, listId), [listId]);
  return useStateSelector(select, EMPTY);
}

export function useAllTasks(): Task[] {
  return useStateSelector(liveTasks, EMPTY);
}

export function useTask(id: string | null): Task | null {
  const { state } = useDataStore();
  if (!id || !state) return null;
  const task = state.tasks[id];
  return task && task.deletedAt === null ? task : null;
}

export function useSubtasks(taskId: string): Subtask[] {
  const select = useCallback((s: BeansState) => subtasksFor(s, taskId), [taskId]);
  return useStateSelector(select, EMPTY);
}

export function useLabels(): Label[] {
  return useStateSelector(liveLabels, EMPTY);
}

export function useLabel(id: string | null): Label | null {
  const { state } = useDataStore();
  if (!id || !state) return null;
  const label = state.labels[id];
  return label && label.deletedAt === null ? label : null;
}

export function useLists(): List[] {
  return useStateSelector(liveLists, EMPTY);
}

export function useTemplates(): Template[] {
  return useStateSelector(liveTemplates, EMPTY);
}

export function useSeries(id: string | null) {
  const { state } = useDataStore();
  return id && state ? (state.series[id] ?? null) : null;
}

export interface TrashItem {
  kind: "task" | "list";
  id: string;
  title: string;
  deletedAt: number;
}

function selectTrash(s: BeansState): TrashItem[] {
  const lists = Object.values(s.lists).filter((l) => l.deletedAt !== null);
  const trashedListTimes = new Set(lists.map((l) => `${l.id}:${l.deletedAt}`));
  const tasks = Object.values(s.tasks).filter(
    (t) => t.deletedAt !== null && !(t.listId && trashedListTimes.has(`${t.listId}:${t.deletedAt}`)),
  );
  return [
    ...lists.map((l) => ({ kind: "list" as const, id: l.id, title: `${l.icon} ${l.name}`, deletedAt: l.deletedAt! })),
    ...tasks.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, deletedAt: t.deletedAt! })),
  ].sort((a, b) => b.deletedAt - a.deletedAt);
}

export function useTrash(): TrashItem[] {
  return useStateSelector(selectTrash, EMPTY);
}

/** Tasks with a due date, soonest first. */
export function useDueTasks(): Task[] {
  const select = useCallback(
    (s: BeansState) =>
      liveTasks(s)
        .filter((t) => t.dueDate !== null && !t.done)
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0)),
    [],
  );
  return useStateSelector(select, EMPTY);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

/** Matches titles and notes. Empty query returns nothing. */
export function useSearch(query: string): Task[] {
  const select = useCallback(
    (s: BeansState) => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return liveTasks(s)
        .filter((t) => t.title.toLowerCase().includes(q) || stripHtml(t.notes).toLowerCase().includes(q))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 50);
    },
    [query],
  );
  return useStateSelector(select, EMPTY);
}

export function useTimeEntries() {
  const select = useCallback((s: BeansState) => Object.values(s.timeEntries).filter((e) => e.deletedAt === null), []);
  return useStateSelector(select, EMPTY);
}

// ---------- Writes ----------

/**
 * Write actions. Each returns the ops that undo it, so callers can offer Undo.
 */
export function useActions() {
  const store = useDataStore();
  const stateRef = useRef(store.state);
  useEffect(() => {
    stateRef.current = store.state;
  }, [store.state]);
  const applyRef = useRef(store.apply);
  useEffect(() => {
    applyRef.current = store.apply;
  }, [store.apply]);

  return useMemo(() => {
    const current = (): BeansState => {
      if (!stateRef.current) throw new Error("Data isn't loaded yet.");
      return stateRef.current;
    };
    const run = (ops: Op[]): Op[] => {
      if (!ops.length) return [];
      const state = current();
      const inverse = invertOps(state, ops);
      applyRef.current(ops);
      // Keep reads inside the same event handler consistent with what we just wrote.
      stateRef.current = applyOps(state, ops);
      return inverse;
    };
    const today = () => todayIn(current().settings.timeZone);

    return {
      /** Applies raw ops, used for Undo. */
      apply: (ops: Op[]) => run(ops),
      createTask: (input: NewTaskInput) => {
        const { id, ops } = createTask(current(), input);
        return { id, undo: run(ops) };
      },
      updateTask: (id: string, fields: Partial<Omit<Task, "id" | "createdAt">>) => run([patch("tasks", id, fields)]),
      moveTask: (id: string, target: MoveTarget) => run(moveTask(current(), id, target)),
      setDone: (id: string, done: boolean) => run(done ? completeWithTimer(current(), id) : setDone(current(), id, false)),
      deleteTask: (id: string) => run(deleteTask(id)),
      deleteTasks: (ids: string[]) => run(ids.flatMap((id) => deleteTask(id))),
      completeTasks: (ids: string[]) => {
        let state = current();
        const ops: Op[] = [];
        for (const id of ids) {
          const next = setDone(state, id, true);
          ops.push(...next);
          state = applyOps(state, next);
        }
        return run(ops);
      },
      moveTasks: (ids: string[], target: MoveTarget) => {
        let ops: Op[] = [];
        for (const id of ids) ops = ops.concat(moveTask(current(), id, { ...target, index: undefined }));
        return run(ops);
      },
      duplicateTask: (id: string) => {
        const { id: copy, ops } = duplicateTask(current(), id);
        return { id: copy, undo: run(ops) };
      },
      restoreTask: (id: string) => run(restoreTask(current(), id, today())),
      restoreList: (id: string) => run(restoreList(current(), id)),
      purge: (kind: "task" | "list", id: string) => {
        const state = current();
        const ops: Op[] = [remove(kind === "task" ? "tasks" : "lists", id)];
        if (kind === "list") {
          for (const t of Object.values(state.tasks)) {
            if (t.listId === id && t.deletedAt !== null) ops.push(remove("tasks", t.id));
          }
        }
        return run(ops);
      },
      emptyTrash: () => {
        const state = current();
        const ops: Op[] = [];
        for (const t of Object.values(state.tasks)) if (t.deletedAt !== null) ops.push(remove("tasks", t.id));
        for (const l of Object.values(state.lists)) if (l.deletedAt !== null) ops.push(remove("lists", l.id));
        return run(ops);
      },

      addSubtask: (taskId: string, title: string, afterId?: string) => {
        const { id, ops } = addSubtask(current(), taskId, title, afterId);
        return { id, undo: run(ops) };
      },
      updateSubtask: (id: string, fields: Partial<Pick<Subtask, "title" | "done">>) => run([patch("subtasks", id, fields)]),
      setSubtaskDone: (id: string, done: boolean) => run(setSubtaskDone(current(), id, done)),
      moveSubtask: (id: string, index: number) => run(moveSubtask(current(), id, index)),
      duplicateSubtask: (id: string) => {
        const state = current();
        const sub = state.subtasks[id];
        if (!sub) return [];
        const { ops } = addSubtask(state, sub.taskId, sub.title, id);
        return run(ops);
      },
      deleteSubtask: (id: string) => run([patch("subtasks", id, { deletedAt: Date.now() })]),

      createList: (input: { name: string; icon: string; autoLabelId?: string | null }) => {
        const { id, ops } = createList(current(), input);
        return { id, undo: run(ops) };
      },
      updateList: (id: string, fields: Partial<Pick<List, "name" | "icon" | "autoLabelId" | "order">>) =>
        run([patch("lists", id, fields)]),
      deleteList: (id: string) => run(deleteList(current(), id)),

      createLabel: (input: { name: string; color: string }) => {
        const { id, ops } = createLabel(current(), input);
        return { id, undo: run(ops) };
      },
      updateLabel: (id: string, fields: Partial<Pick<Label, "name" | "color" | "order">>) => run([patch("labels", id, fields)]),
      deleteLabel: (id: string) => run(deleteLabel(current(), id)),

      createTemplate: (input: TemplateInput) => {
        const { id, ops } = createTemplate(current(), input);
        return { id, undo: run(ops) };
      },
      updateTemplate: (id: string, fields: Partial<Omit<Template, "id" | "createdAt">>) => run([patch("templates", id, fields)]),
      deleteTemplate: (id: string) => run([patch("templates", id, { deletedAt: Date.now() })]),
      saveAsTemplate: (taskId: string) => {
        const { id, ops } = templateFromTask(current(), taskId);
        return { id, undo: run(ops) };
      },
      useTemplate: (templateId: string, target: Pick<NewTaskInput, "date" | "listId" | "start" | "position">) => {
        const { id, ops } = taskFromTemplate(current(), templateId, target);
        return { id, undo: run(ops) };
      },

      makeRepeating: (taskId: string, rule: string, start: string | null = null) => run(makeRepeating(current(), taskId, rule, today(), start)),
      changeRule: (seriesId: string, rule: string, from: DateKey) => run(changeRule(current(), seriesId, rule, from)),
      stopRepeating: (taskId: string) => run(stopRepeating(current(), taskId)),
      deleteInstance: (taskId: string) => run(deleteInstance(current(), taskId)),
      deleteSeries: (seriesId: string) => run(deleteSeries(current(), seriesId)),
      updateAllIncomplete: (taskId: string) => run(updateAllIncomplete(current(), taskId)),

      moveUnfinished: (ids: string[], to: DateKey) => {
        const state = current();
        return run(moveUnfinished(state, ids.map((id) => state.tasks[id]!).filter(Boolean), to));
      },
      rollover: () => run(rolloverOps(current(), today())),

      updateSettings: (fields: Partial<Omit<Settings, "id">>) => run([{ kind: "settings", fields }]),

      startTimer: (taskId: string, mode: "stopwatch" | "pomodoro") => run(startTimerOps(current(), taskId, mode)),
      pauseTimer: () => run(pauseTimerOps(current())),
      resumeTimer: () => run(resumeTimerOps(current())),
      stopTimer: () => run(stopTimerOps(current())),
      switchPhase: () => run(switchPhaseOps(current())),

      newId: () => newId(),
    };
  }, []);
}

export type Actions = ReturnType<typeof useActions>;
