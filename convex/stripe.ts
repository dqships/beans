/**
 * A small Stripe client for Convex actions, plus webhook signature checks.
 * No SDK: Convex's default runtime has fetch and Web Crypto, which is all
 * this needs. Follows the Vidzilla reference (dqships/vidzilla api/_stripe.js).
 */

/** Pinned so the fields read below don't move under us. The webhook endpoints use the same version. */
export const STRIPE_VERSION = "2024-06-20";

/** Flattens {a: {b: 1}} into Stripe's form encoding, a[b]=1. */
export function formEncode(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") formEncode(value as Record<string, unknown>, name, out);
    else out.append(name, String(value));
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stripe objects are read field by field below.
export type StripeObject = Record<string, any>;
export type StripeCall = (method: "GET" | "POST", path: string, params?: Record<string, unknown>) => Promise<StripeObject>;

export function stripeClient(secretKey: string, fetchImpl: typeof fetch = fetch): StripeCall {
  return async (method, path, params = {}) => {
    const body = formEncode(params);
    const url = method === "GET" ? `https://api.stripe.com${path}?${body}` : `https://api.stripe.com${path}`;
    const res = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Stripe-Version": STRIPE_VERSION,
        ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" }),
      },
      body: method === "GET" ? undefined : body,
    });
    const json = (await res.json()) as StripeObject;
    if (!res.ok) throw new Error(json?.error?.message ?? `Stripe ${res.status}`);
    return json;
  };
}

const encoder = new TextEncoder();

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Stripe's default: a signature older than five minutes is a replay. */
export const WEBHOOK_TOLERANCE_S = 300;

/**
 * Checks a `Stripe-Signature` header (`t=...,v1=...`) against the raw body,
 * as Stripe documents for verifying webhooks without its SDK.
 */
export async function verifyWebhook(payload: string, header: string | null, secret: string, nowS = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!Number.isFinite(t) || !signatures.length || Math.abs(nowS - t) > WEBHOOK_TOLERANCE_S) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return signatures.some((s) => sameText(s, expected));
}

/** Builds a valid header, for tests. */
export async function signWebhook(payload: string, secret: string, t: number): Promise<string> {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${payload}`)}`;
}

/** A subscription reduced to what Beans keeps. Times in ms. */
export function subscriptionFields(sub: StripeObject) {
  const item = sub.items?.data?.[0];
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;
  return {
    subscriptionId: String(sub.id),
    customerId: typeof sub.customer === "string" ? sub.customer : String(sub.customer?.id ?? ""),
    status: String(sub.status),
    priceId: (item?.price?.id as string | undefined) ?? null,
    trialEnd: typeof sub.trial_end === "number" ? sub.trial_end * 1000 : null,
    periodEnd: typeof periodEnd === "number" ? periodEnd * 1000 : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    discountPercent: typeof sub.discount?.coupon?.percent_off === "number" ? sub.discount.coupon.percent_off : null,
    discountEnd: typeof sub.discount?.end === "number" ? sub.discount.end * 1000 : null,
  };
}

export type SubscriptionFields = ReturnType<typeof subscriptionFields>;
