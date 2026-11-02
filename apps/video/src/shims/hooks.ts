import { createContext, useContext, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { todayIn, type DateKey, type Task } from "@beans/core";
import { useRangeTasks as realRangeTasks, useListTasks as realListTasks, useTimeZone } from "../../../web/src/data/hooks";
import { phantomsAt } from "../script";

export * from "../../../web/src/data/hooks";

/** The film's clock. Everything that would read the wall clock reads this. */
export const ClockContext = createContext(0);

export function useClock(): number {
  return useContext(ClockContext);
}

export function useTicker(active: boolean): number {
  const now = useClock();
  return active ? now : 0;
}

export function useToday(): DateKey {
  return todayIn(useTimeZone(), useClock());
}

function insert(tasks: Task[], extra: { task: Task; index: number }[]): Task[] {
  if (!extra.length) return tasks;
  const out = [...tasks];
  for (const e of extra) out.splice(Math.min(e.index, out.length), 0, e.task);
  return out;
}

/** Real day lists, plus tasks that have just left and are closing their gap. */
export function useRangeTasks(from: DateKey, days: number): Record<DateKey, Task[]> {
  const base = realRangeTasks(from, days);
  const phantoms = phantomsAt(useCurrentFrame());
  return useMemo(() => {
    if (!phantoms.length) return base;
    const out = { ...base };
    for (const key of Object.keys(out)) {
      const here = phantoms.filter((p) => p.container === `day:${key}`);
      if (here.length) out[key] = insert(out[key]!, here);
    }
    return out;
  }, [base, phantoms]);
}

export function useListTasks(listId: string | null): Task[] {
  const base = realListTasks(listId);
  const phantoms = phantomsAt(useCurrentFrame());
  return useMemo(() => insert(base, phantoms.filter((p) => p.container === `list:${listId ?? "brain"}`)), [base, phantoms, listId]);
}
