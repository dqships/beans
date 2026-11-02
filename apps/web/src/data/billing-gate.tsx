"use client";

import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { BASE_OFFER, type BillingStatus, type Offer, type PlanId } from "@beans/core";
import { BillingContext, type Billing } from "./billing";
import { DataStoreContext } from "./store";

/**
 * Provides the subscription to the planner, which shows the paywall after
 * first-run setup until the account has a trial or a subscription. Sample data
 * and deployments without Stripe skip it.
 */
export function BillingGate({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const backend = useContext(DataStoreContext)?.backend;
  if (backend !== "convex") return <>{children}</>;
  return <ConvexBillingGate loading={loading}>{children}</ConvexBillingGate>;
}

function ConvexBillingGate({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const status = useQuery(api.billing.status);
  const offerAction = useAction(api.billing.offer);
  const checkoutAction = useAction(api.billing.checkout);
  const portalAction = useAction(api.billing.portal);
  const confirm = useAction(api.billing.confirm);
  const passMutation = useMutation(api.billing.startPass);
  const [offer, setOffer] = useState<Offer>(BASE_OFFER);
  const returning = useReturnFromCheckout(confirm);

  const enforced = status?.enforced ?? false;
  useEffect(() => {
    if (enforced) offerAction({}).then(setOffer, (e: unknown) => console.error(e));
  }, [enforced, offerAction]);

  const startCheckout = useCallback(
    async (plan: PlanId) => {
      const { url } = await checkoutAction({ plan, origin: window.location.origin });
      window.location.assign(url);
    },
    [checkoutAction],
  );
  const openPortal = useCallback(async () => {
    const { url } = await portalAction({ origin: window.location.origin });
    window.location.assign(url);
  }, [portalAction]);

  const startPass = useCallback(async () => {
    await passMutation({});
  }, [passMutation]);

  if (!status) return <>{loading}</>;
  const value: Billing = { status, offer, startCheckout, openPortal, startPass };
  return <BillingContext.Provider value={value}>{!status.access && returning ? loading : children}</BillingContext.Provider>;
}

/**
 * Checkout sends the buyer back to `/app?checkout=<session>`. Reading that
 * session opens the planner straight away instead of waiting for the webhook.
 * Returns true while it's being read.
 */
function useReturnFromCheckout(confirm: (args: { sessionId: string }) => Promise<BillingStatus>): boolean {
  const [sessionId] = useState(() => new URLSearchParams(window.location.search).get("checkout"));
  const [pending, setPending] = useState(Boolean(sessionId));
  const started = useRef(false);
  useEffect(() => {
    if (!sessionId || started.current) return;
    started.current = true;
    confirm({ sessionId })
      .catch((e: unknown) => console.error(e))
      .finally(() => {
        setPending(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        window.history.replaceState(null, "", url);
      });
  }, [sessionId, confirm]);
  return pending;
}
