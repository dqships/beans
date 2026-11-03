"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Drops query strings, so a Stripe checkout session in `/app?checkout=…` never reaches analytics. */
function withoutQuery(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  url.search = "";
  return { ...event, url: url.href };
}

/** Vercel Web Analytics for the planner and sign-in pages. Rendered only on Vercel. */
export function PlannerAnalytics() {
  return <Analytics beforeSend={withoutQuery} />;
}
