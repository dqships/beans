"use client";

import { useSyncExternalStore } from "react";
import { BillingGate } from "@/data/billing-gate";
import { ConnectedAppsProvider } from "@/data/connections-provider";
import { PlannerSession } from "@/data/session";
import { LoadingScreen, PlannerApp, SetupNeeded } from "@/planner/PlannerApp";

const subscribe = () => () => {};

/** The planner only renders in the browser, where the user's time zone is known. */
export function PlannerRoot() {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  if (!client) return <LoadingScreen />;
  return (
    <PlannerSession loading={<LoadingScreen />} unconfigured={<SetupNeeded />}>
      <BillingGate loading={<LoadingScreen />}>
        <ConnectedAppsProvider>
          <PlannerApp />
        </ConnectedAppsProvider>
      </BillingGate>
    </PlannerSession>
  );
}
