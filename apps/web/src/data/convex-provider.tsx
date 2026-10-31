"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { OptimisticLocalStore } from "convex/browser";
import { api } from "@convex/_generated/api";
import {
  addDays,
  applyOps,
  emptyState,
  localTimeZone,
  todayIn,
  type BeansState,
  type DateKey,
  type Op,
  type Settings,
} from "@beans/core";
import { DataStoreContext, type DataStore } from "./store";

/** Dated tasks load from this many days back; older days load when shown. */
const WINDOW_DAYS = 120;

type Load = NonNullable<ReturnType<typeof useLoad>>;

function useLoad(from: DateKey, enabled: boolean) {
  return useQuery(api.planner.load, enabled ? { from } : "skip");
}

const TABLES = ["tasks", "subtasks", "lists", "labels", "templates", "series", "timeEntries"] as const;

function toState(load: Load & { settings: Settings }): BeansState {
  const state = emptyState(load.settings);
  for (const table of TABLES) {
    const rows: Record<string, unknown> = {};
    for (const row of load[table] as { id: string }[]) rows[row.id] = row;
    (state as unknown as Record<string, unknown>)[table] = rows;
  }
  return state;
}

function fromState(state: BeansState): Load {
  const out: Record<string, unknown> = { settings: state.settings };
  for (const table of TABLES) out[table] = Object.values(state[table]);
  return out as Load;
}

/** Applies ops to every cached copy of the planner query, for instant feedback. */
function optimistic(store: OptimisticLocalStore, ops: Op[]) {
  for (const { args, value } of store.getAllQueries(api.planner.load)) {
    if (!value?.settings) continue;
    store.setQuery(api.planner.load, args, fromState(applyOps(toState(value as Load & { settings: Settings }), ops)));
  }
}

/**
 * Beans data from Convex. Writes go through one `apply` mutation with an
 * optimistic update, so dragging, checking off and reordering feel instant.
 */
export function ConvexDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const [from, setFrom] = useState(() => addDays(todayIn(localTimeZone()), -WINDOW_DAYS));
  const result = useLoad(from, isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const init = useMutation(api.planner.init);
  const ensure = useMutation(api.planner.ensureInstances);
  const applyMutation = useMutation(api.planner.apply).withOptimisticUpdate((store, { ops }) => optimistic(store, ops as Op[]));

  // Keep showing the last result while a wider window loads.
  const [kept, setKept] = useState<Load | undefined>(undefined);
  if (result !== undefined && result !== kept) setKept(result);
  const current = result ?? kept;

  const needsInit = current !== undefined && current.settings === null;
  useEffect(() => {
    if (needsInit) init({ timeZone: localTimeZone() }).catch((e) => setError(String(e)));
  }, [needsInit, init]);

  const state = useMemo(() => (current?.settings ? toState(current as Load & { settings: Settings }) : null), [current]);

  const apply = useCallback(
    (ops: Op[]) => {
      if (!ops.length) return;
      applyMutation({ ops: ops as never }).catch((e: unknown) => {
        console.error(e);
        setError("A change couldn't be saved. It has been undone.");
      });
    },
    [applyMutation],
  );

  // A new or changed repeat makes the same ranges worth checking again.
  const seriesKey = state ? Object.values(state.series).map((x) => `${x.id}@${x.updatedAt}`).sort().join(",") : "";
  const ensured = useRef(new Set<string>());
  const requestRange = useCallback(
    (start: DateKey, end: DateKey) => {
      if (start < from) setFrom(addDays(start, -14));
      const today = todayIn(state?.settings.timeZone ?? localTimeZone());
      let a = start > today ? start : today;
      while (a <= end) {
        const b = addDays(a, 60) < end ? addDays(a, 60) : end;
        const key = `${seriesKey}|${a}:${b}`;
        if (!ensured.current.has(key)) {
          ensured.current.add(key);
          ensure({ from: a, to: b }).catch((e) => {
            ensured.current.delete(key);
            console.error(e);
          });
        }
        a = addDays(b, 1);
      }
    },
    [from, ensure, state?.settings.timeZone, seriesKey],
  );

  const value = useMemo<DataStore>(
    () => ({ state, apply, requestRange, backend: "convex", error, clearError: () => setError(null) }),
    [state, apply, requestRange, error],
  );
  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}
