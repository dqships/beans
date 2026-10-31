"use client";

import { useSyncExternalStore } from "react";
import { SampleDataProvider } from "@/data/sample-provider";
import { LoadingScreen, PlannerApp } from "@/planner/PlannerApp";

const subscribe = () => () => {};

/** The planner only renders in the browser, where the user's time zone is known. */
export function PlannerRoot() {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  if (!client) return <LoadingScreen />;
  return (
    <SampleDataProvider>
      <PlannerApp />
    </SampleDataProvider>
  );
}
