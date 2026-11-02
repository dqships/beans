"use client";

import { createContext, useContext } from "react";
import type { BillingStatus, Offer, PlanId } from "@beans/core";

/**
 * The subscription, for the paywall and Settings. Stripe Checkout and the
 * Stripe customer portal open as full-page redirects, so no Stripe script
 * runs here and the app's CSP needs no Stripe entries. `billing-gate.tsx`
 * provides it from Convex.
 */
export type Billing = {
  status: BillingStatus;
  offer: Offer;
  /** Sends the browser to Stripe Checkout. Resolves only if it fails. */
  startCheckout(plan: PlanId): Promise<void>;
  /** Sends the browser to the Stripe customer portal. */
  openPortal(): Promise<void>;
};

export const BillingContext = createContext<Billing | null>(null);

/** Null on sample data and before billing loads. */
export function useBilling(): Billing | null {
  return useContext(BillingContext);
}
