"use client";

import { useSyncExternalStore } from "react";
import { PlannerSession } from "@/data/session";
import { LoadingScreen, PlannerApp, SetupNeeded } from "@/planner/PlannerApp";

const subscribe = () => () => {};

/** The planner only renders in the browser, where the user's time zone is known. */
export function PlannerRoot() {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  if (!client) return <LoadingScreen />;
  return (
    <PlannerSession loading={<LoadingScreen />} unconfigured={<SetupNeeded />}>
      <PlannerApp />
    </PlannerSession>
  );
}
