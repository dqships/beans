"use client";

import { useCallback, useMemo, useReducer, type ReactNode } from "react";
import { applyOps, ensureInstances, localTimeZone, sampleState, todayIn, type BeansState, type DateKey, type Op } from "@beans/core";
import { DataStoreContext, type DataStore } from "./store";

interface SampleState {
  data: BeansState;
  /** Day ranges on screen, so repeating tasks get instances there. */
  ranges: [DateKey, DateKey][];
}

type Action = { type: "apply"; ops: Op[] } | { type: "range"; from: DateKey; to: DateKey };

function withInstances(data: BeansState, ranges: [DateKey, DateKey][]): BeansState {
  const today = todayIn(data.settings.timeZone);
  let next = data;
  for (const [from, to] of ranges) {
    const start = from > today ? from : today;
    if (start > to) continue;
    const ops = ensureInstances(next, start, to);
    if (ops.length) next = applyOps(next, ops);
  }
  return next;
}

function reducer(state: SampleState, action: Action): SampleState {
  if (action.type === "apply") {
    const data = applyOps(state.data, action.ops);
    const touchesSeries = action.ops.some((op) => (op.kind === "put" || op.kind === "patch") && op.table === "series");
    return { ...state, data: touchesSeries ? withInstances(data, state.ranges) : data };
  }
  if (state.ranges.some(([f, t]) => f === action.from && t === action.to)) return state;
  const ranges: [DateKey, DateKey][] = [...state.ranges.slice(-7), [action.from, action.to]];
  return { ranges, data: withInstances(state.data, [[action.from, action.to]]) };
}

function initialState(): SampleState {
  const zone = localTimeZone();
  return { data: sampleState(todayIn(zone), zone), ranges: [] };
}

/** In-memory data seeded with a sample planner. Nothing is saved. */
export function SampleDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const apply = useCallback((ops: Op[]) => {
    if (ops.length) dispatch({ type: "apply", ops });
  }, []);
  const requestRange = useCallback((from: DateKey, to: DateKey) => dispatch({ type: "range", from, to }), []);
  const value = useMemo<DataStore>(
    () => ({ state: state.data, apply, requestRange, backend: "sample" }),
    [state.data, apply, requestRange],
  );
  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}
