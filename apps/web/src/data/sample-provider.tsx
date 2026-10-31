"use client";

import { useCallback, useMemo, useReducer, type ReactNode } from "react";
import { applyOps, localTimeZone, sampleState, todayIn, type BeansState, type Op } from "@beans/core";
import { DataStoreContext, type DataStore } from "./store";

function reducer(state: BeansState, ops: Op[]): BeansState {
  return applyOps(state, ops);
}

function initialState(): BeansState {
  const zone = localTimeZone();
  return sampleState(todayIn(zone), zone);
}

/** In-memory data seeded with a sample planner. Nothing is saved. */
export function SampleDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const apply = useCallback((ops: Op[]) => {
    if (ops.length) dispatch(ops);
  }, []);
  const value = useMemo<DataStore>(
    () => ({ state, apply, requestRange: () => {}, backend: "sample" }),
    [state, apply],
  );
  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}
