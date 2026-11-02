"use client";

import { useSyncExternalStore } from "react";
import { BillingGate } from "@/data/billing-gate";
import { PlannerSession } from "@/data/session";
import { LoadingScreen, PlannerApp, SetupNeeded } from "@/planner/PlannerApp";
import { Paywall } from "@/planner/Paywall";

const subscribe = () => () => {};

/** The planner only renders in the browser, where the user's time zone is known. */
export function PlannerRoot() {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  if (!client) return <LoadingScreen />;
  return (
    <PlannerSession loading={<LoadingScreen />} unconfigured={<SetupNeeded />}>
      <BillingGate loading={<LoadingScreen />} paywall={<Paywall />}>
        <PlannerApp />
      </BillingGate>
    </PlannerSession>
  );
}
