"use client";

import { createContext, useContext } from "react";
import type { BeansState, DateKey, Op } from "@beans/core";

/**
 * What every data backend gives the screens. The sample backend keeps data in
 * memory; the Convex backend (Phase 3) loads it from the server. Screens never
 * see which one is running.
 */
export interface DataStore {
  /** `null` until the first load finishes. */
  state: BeansState | null;
  /** Applies ops locally right away and sends them to the backend. */
  apply(ops: Op[]): void;
  /** Asks the backend to load dated tasks in this range. */
  requestRange(from: DateKey, to: DateKey): void;
  /** Which backend is running, for the account menu. */
  backend: "sample" | "convex";
}

export const DataStoreContext = createContext<DataStore | null>(null);

export function useDataStore(): DataStore {
  const store = useContext(DataStoreContext);
  if (!store) throw new Error("Beans data hooks must be used inside a data provider.");
  return store;
}
