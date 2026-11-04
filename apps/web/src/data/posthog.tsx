"use client";

import { useEffect } from "react";
import posthog, { type CaptureResult } from "posthog-js";
import { firstTouch, forgetFirstTouch, rememberFirstTouch } from "./first-touch";

/**
 * PostHog product analytics for the planner and sign-in pages, the same
 * project the Convex functions send `signed_up`, `activated` and `paid` to
 * (convex/analytics.ts). Off unless NEXT_PUBLIC_POSTHOG_KEY is set, so local
 * builds and tests send nothing. Session replay stays off: the privacy
 * policy says so. The marketing pages' page views are sent by `proxy.ts`
 * instead, since those pages run no JavaScript.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = "https://us.i.posthog.com";

let started = false;

/** Drops query strings, so a Stripe checkout session in `/app?checkout=…` never reaches analytics. The carried source goes on the person instead. */
function withoutQuery(event: CaptureResult | null): CaptureResult | null {
  const current = event?.properties?.$current_url;
  if (typeof current === "string") {
    const url = new URL(current);
    url.search = "";
    event!.properties.$current_url = url.href;
  }
  return event;
}

export function startAnalytics() {
  rememberFirstTouch();
  if (started || !key || typeof window === "undefined") return;
  started = true;
  posthog.init(key, {
    api_host: POSTHOG_HOST,
    defaults: "2025-05-24",
    disable_session_recording: true,
    before_send: withoutQuery,
  });
}

/** Starts PostHog once the page is in the browser. Rendered by the sign-in and planner layout. */
export function ProductAnalytics() {
  useEffect(startAnalytics, []);
  return null;
}

/**
 * Links this browser to the account: the Clerk user id, the same `distinct_id`
 * the server events use. Where the visitor first came from goes on the person
 * as `$set_once` `first_touch_*` properties, so a later visit can't change it.
 */
export function identifyUser(userId: string, email: string | null) {
  startAnalytics();
  if (started) posthog.identify(userId, email ? { email } : undefined, firstTouch());
}

/** On sign-out, so the next person on this browser isn't counted as the last one. */
export function resetAnalytics() {
  forgetFirstTouch();
  if (started) posthog.reset();
}
