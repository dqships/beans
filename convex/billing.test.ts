import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { STRIPE_IDS } from "../packages/core/src/billing";
import { clearPromoCache } from "./billing";
import { signWebhook, verifyWebhook } from "./stripe";

// Vitest provides import.meta.glob.
const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob("./**/*.ts");

const SECRET = "whsec_test_beans";
const ALICE = "test|alice";
const MONTHLY = STRIPE_IDS.test.prices.monthly;
const YEARLY = STRIPE_IDS.test.prices.yearly;
const NOW_S = Math.floor(Date.now() / 1000);

type Call = { method: string; path: string; body: URLSearchParams };

/** A fake Stripe API: subscriptions and promotion codes by id, and every call recorded. */
function fakeStripe() {
  const calls: Call[] = [];
  const subscriptions = new Map<string, Record<string, unknown>>();
  const promos = new Map<string, Record<string, unknown>>();
  const sessions = new Map<string, Record<string, unknown>>();
  let failDiscounts = false;
  const fetchMock = vi.fn(async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const body = new URLSearchParams(init.method === "GET" ? url.search : String(init.body ?? ""));
    calls.push({ method: init.method!, path: url.pathname, body });
    const ok = (json: unknown) => new Response(JSON.stringify(json), { status: 200 });
    const [, , kind, id] = url.pathname.split("/");
    if (kind === "subscriptions" && subscriptions.has(id)) return ok(subscriptions.get(id));
    if (kind === "promotion_codes") return ok({ data: promos.has(body.get("code")!) ? [promos.get(body.get("code")!)] : [] });
    if (kind === "customers") return ok({ id: `cus_${calls.length}` });
    if (url.pathname === "/v1/checkout/sessions" && init.method === "POST") {
      if (failDiscounts && body.has("discounts[0][promotion_code]")) return new Response(JSON.stringify({ error: { message: "This promotion code has expired" } }), { status: 400 });
      return ok({ id: "cs_test_new", url: "https://checkout.stripe.com/c/pay/cs_test_new" });
    }
    const last = url.pathname.split("/").at(-1)!;
    if (url.pathname.startsWith("/v1/checkout/sessions/") && sessions.has(last)) return ok(sessions.get(last));
    if (url.pathname === "/v1/billing_portal/sessions") return ok({ url: "https://billing.stripe.com/p/session/test" });
    return new Response(JSON.stringify({ error: { message: `no fake for ${url.pathname}` } }), { status: 404 });
  });
  return { calls, subscriptions, promos, sessions, fetchMock, failDiscounts: () => (failDiscounts = true) };
}

function subscription(id: string, fields: Record<string, unknown> = {}) {
  return {
    id,
    object: "subscription",
    customer: "cus_alice",
    status: "trialing",
    cancel_at_period_end: false,
    trial_end: NOW_S + 7 * 86_400,
    current_period_end: NOW_S + 7 * 86_400,
    metadata: { app: "beans", user_id: ALICE, plan: "monthly" },
    items: { data: [{ price: { id: MONTHLY } }] },
    ...fields,
  };
}

let stripe: ReturnType<typeof fakeStripe>;

function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice", tokenIdentifier: ALICE, name: "Alice", email: "alice@example.com" });
  const bob = t.withIdentity({ subject: "bob", tokenIdentifier: "test|bob", name: "Bob" });
  return { t, alice, bob };
}

async function deliver(t: ReturnType<typeof setup>["t"], event: unknown, secret = SECRET) {
  const body = JSON.stringify(event);
  return await t.fetch("/stripe/webhook", {
    method: "POST",
    body,
    headers: { "Stripe-Signature": await signWebhook(body, secret, Math.floor(Date.now() / 1000)) },
  });
}

const subscriptionEvent = (type: string, sub: Record<string, unknown>) => ({ id: "evt_1", type, data: { object: sub } });

beforeEach(() => {
  clearPromoCache();
  stripe = fakeStripe();
  vi.stubGlobal("fetch", stripe.fetchMock);
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("webhook signatures", () => {
  it("accepts Stripe's signature and refuses tampering, wrong secrets and old timestamps", async () => {
    const t = NOW_S;
    const header = await signWebhook("{}", SECRET, t);
    expect(await verifyWebhook("{}", header, SECRET, t)).toBe(true);
    expect(await verifyWebhook("{ }", header, SECRET, t)).toBe(false);
    expect(await verifyWebhook("{}", header, "whsec_other", t)).toBe(false);
    expect(await verifyWebhook("{}", header, SECRET, t + 301)).toBe(false);
    expect(await verifyWebhook("{}", null, SECRET, t)).toBe(false);
    expect(await verifyWebhook("{}", `t=${t},v1=abc,${header.split(",")[1]}`, SECRET, t)).toBe(true);
  });

  it("answers 400 to an unsigned delivery and changes nothing", async () => {
    const { t, alice } = setup();
    stripe.subscriptions.set("sub_1", subscription("sub_1"));
    const res = await deliver(t, subscriptionEvent("customer.subscription.created", subscription("sub_1")), "whsec_wrong");
    expect(res.status).toBe(400);
    expect((await alice.query(api.billing.status, {})).access).toBe(false);
  });
});

describe("entitlement", () => {
  it("keeps the planner open when Stripe isn't set up", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { alice } = setup();
    expect(await alice.query(api.billing.status, {})).toMatchObject({ enforced: false, access: true });
    await alice.mutation(api.planner.init, { timeZone: "UTC" });
    await alice.mutation(api.planner.apply, { ops: [{ kind: "settings", fields: { theme: "dark" } }] });
  });

  it("locks writes until a subscription starts, then opens on the webhook", async () => {
    const { t, alice } = setup();
    await alice.mutation(api.planner.init, { timeZone: "UTC" });
    expect(await alice.query(api.billing.status, {})).toMatchObject({ enforced: true, access: false, trialAvailable: true, status: null });
    await expect(alice.mutation(api.planner.apply, { ops: [{ kind: "settings", fields: { theme: "dark" } }] })).rejects.toThrow(/subscription is needed/);

    stripe.subscriptions.set("sub_1", subscription("sub_1"));
    const res = await deliver(t, { id: "evt_1", type: "checkout.session.completed", data: { object: { metadata: { app: "beans", user_id: ALICE }, subscription: "sub_1" } } });
    expect(res.status).toBe(200);
    expect(await alice.query(api.billing.status, {})).toMatchObject({ access: true, status: "trialing", plan: "monthly", trialAvailable: false, hasCustomer: true, discountPercent: null });
    await alice.mutation(api.planner.apply, { ops: [{ kind: "settings", fields: { theme: "dark" } }] });
  });

  it("follows cancelling, plan changes and the end of a subscription", async () => {
    const { t, alice } = setup();
    stripe.subscriptions.set("sub_1", subscription("sub_1"));
    await deliver(t, subscriptionEvent("customer.subscription.created", subscription("sub_1")));

    stripe.subscriptions.set("sub_1", subscription("sub_1", { status: "active", cancel_at_period_end: true, items: { data: [{ price: { id: YEARLY } }] } }));
    await deliver(t, subscriptionEvent("customer.subscription.updated", subscription("sub_1")));
    expect(await alice.query(api.billing.status, {})).toMatchObject({ access: true, status: "active", cancelAtPeriodEnd: true, plan: "yearly" });

    stripe.subscriptions.set("sub_1", subscription("sub_1", { status: "canceled" }));
    await deliver(t, subscriptionEvent("customer.subscription.deleted", subscription("sub_1")));
    expect(await alice.query(api.billing.status, {})).toMatchObject({ access: false, status: "canceled", trialAvailable: false });
  });

  it("keeps the launch discount and when it ends", async () => {
    const { t, alice } = setup();
    const sub = subscription("sub_1", { discount: { end: NOW_S + 92 * 86_400, coupon: { percent_off: 100 } } });
    stripe.subscriptions.set("sub_1", sub);
    await deliver(t, subscriptionEvent("customer.subscription.created", sub));
    expect(await alice.query(api.billing.status, {})).toMatchObject({ discountPercent: 100, discountEnd: (NOW_S + 92 * 86_400) * 1000 });
  });

  it("reads the subscription fresh, so a late event can't undo a newer state", async () => {
    const { t, alice } = setup();
    stripe.subscriptions.set("sub_1", subscription("sub_1", { status: "active" }));
    // An old "trialing" payload arrives after the subscription became active.
    await deliver(t, subscriptionEvent("customer.subscription.updated", subscription("sub_1", { status: "trialing" })));
    expect((await alice.query(api.billing.status, {})).status).toBe("active");
  });

  it("never lets an ended subscription replace a different live one", async () => {
    const { t, alice } = setup();
    stripe.subscriptions.set("sub_new", subscription("sub_new", { status: "active" }));
    stripe.subscriptions.set("sub_old", subscription("sub_old", { status: "canceled" }));
    await deliver(t, subscriptionEvent("customer.subscription.created", subscription("sub_new")));
    await deliver(t, subscriptionEvent("customer.subscription.deleted", subscription("sub_old")));
    expect(await alice.query(api.billing.status, {})).toMatchObject({ access: true, status: "active" });
  });

  it("ignores other products on the same Stripe account", async () => {
    const { t, alice } = setup();
    const vidzilla = subscription("sub_vz", { metadata: { install_id: "x" }, items: { data: [{ price: { id: "price_vidzilla" } }] } });
    stripe.subscriptions.set("sub_vz", vidzilla);
    const res = await deliver(t, subscriptionEvent("customer.subscription.created", vidzilla));
    expect(await res.text()).toBe("ignored");
    expect((await alice.query(api.billing.status, {})).status).toBeNull();
    const session = await deliver(t, { id: "evt_2", type: "checkout.session.completed", data: { object: { metadata: {}, subscription: "sub_vz" } } });
    expect(await session.text()).toBe("Ignored");
  });

  it("keeps each user's subscription to themselves", async () => {
    const { t, alice, bob } = setup();
    stripe.subscriptions.set("sub_1", subscription("sub_1"));
    await deliver(t, subscriptionEvent("customer.subscription.created", subscription("sub_1")));
    expect((await alice.query(api.billing.status, {})).access).toBe(true);
    expect((await bob.query(api.billing.status, {})).access).toBe(false);
  });
});

describe("checkout", () => {
  const origin = "http://localhost:3100";

  it("makes one customer and starts the trial on a first subscription", async () => {
    const { alice } = setup();
    const { url } = await alice.action(api.billing.checkout, { plan: "monthly", origin });
    expect(url).toContain("checkout.stripe.com");
    await alice.action(api.billing.checkout, { plan: "yearly", origin });
    expect(stripe.calls.filter((c) => c.path === "/v1/customers")).toHaveLength(1);
    const [first] = stripe.calls.filter((c) => c.path === "/v1/checkout/sessions");
    expect(Object.fromEntries(first.body)).toMatchObject({
      mode: "subscription",
      customer: "cus_1",
      "line_items[0][price]": MONTHLY,
      payment_method_collection: "always",
      "subscription_data[trial_period_days]": "7",
      "subscription_data[metadata][user_id]": ALICE,
      "metadata[app]": "beans",
      allow_promotion_codes: "true",
      success_url: `${origin}/app?checkout={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app`,
    });
  });

  it("gives no second trial or launch code", async () => {
    stripe.promos.set("BEANS100", { id: "promo_100", code: "BEANS100", active: true, times_redeemed: 1, coupon: { percent_off: 100, duration: "repeating", duration_in_months: 3, valid: true } });
    const { t, alice } = setup();
    stripe.subscriptions.set("sub_1", subscription("sub_1", { status: "canceled" }));
    await deliver(t, subscriptionEvent("customer.subscription.deleted", subscription("sub_1")));
    await alice.action(api.billing.checkout, { plan: "monthly", origin });
    const [session] = stripe.calls.filter((c) => c.path === "/v1/checkout/sessions");
    expect(session.body.get("customer")).toBe("cus_alice");
    expect(session.body.has("subscription_data[trial_period_days]")).toBe(false);
    // No launch code and no code box the second time round.
    expect(session.body.has("discounts[0][promotion_code]")).toBe(false);
    expect(session.body.has("allow_promotion_codes")).toBe(false);
  });

  it("refuses a second subscription and a foreign return address", async () => {
    const { t, alice } = setup();
    await expect(alice.action(api.billing.checkout, { plan: "monthly", origin: "javascript:alert(1)" })).rejects.toThrow(/return address/);
    stripe.subscriptions.set("sub_1", subscription("sub_1"));
    await deliver(t, subscriptionEvent("customer.subscription.created", subscription("sub_1")));
    await expect(alice.action(api.billing.checkout, { plan: "yearly", origin })).rejects.toThrow(/already have/);
  });

  it("applies a running launch code to the monthly plan only, and falls back if it ran out", async () => {
    stripe.promos.set("BEANS100", {
      id: "promo_100",
      code: "BEANS100",
      active: true,
      times_redeemed: 3,
      max_redemptions: 100,
      expires_at: NOW_S + 86_400,
      coupon: { name: "Launch offer", percent_off: 100, duration: "repeating", duration_in_months: 3, valid: true },
    });
    const { alice, bob } = setup();
    await alice.action(api.billing.checkout, { plan: "monthly", origin });
    await alice.action(api.billing.checkout, { plan: "yearly", origin });
    const [monthly, yearly] = stripe.calls.filter((c) => c.path === "/v1/checkout/sessions");
    expect(monthly.body.get("discounts[0][promotion_code]")).toBe("promo_100");
    expect(monthly.body.has("allow_promotion_codes")).toBe(false);
    expect(yearly.body.has("discounts[0][promotion_code]")).toBe(false);
    expect(yearly.body.get("allow_promotion_codes")).toBe("true");

    stripe.failDiscounts();
    stripe.calls.length = 0;
    const { url } = await bob.action(api.billing.checkout, { plan: "monthly", origin });
    expect(url).toContain("checkout.stripe.com");
    const tries = stripe.calls.filter((c) => c.path === "/v1/checkout/sessions");
    expect(tries.map((c) => c.body.has("discounts[0][promotion_code]"))).toEqual([true, false]);
    expect(tries[1].body.get("allow_promotion_codes")).toBe("true");
  });

  it("shows the offer with its count, or full prices without Stripe", async () => {
    stripe.promos.set("BEANS100", {
      id: "promo_100",
      code: "BEANS100",
      active: true,
      times_redeemed: 0,
      max_redemptions: 100,
      coupon: { name: "Launch offer", percent_off: 100, duration: "repeating", duration_in_months: 3, valid: true },
    });
    const { t } = setup();
    expect((await t.action(api.billing.offer, {})).promo).toMatchObject({ code: "BEANS100", claimed: "100 available" });
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await t.action(api.billing.offer, {})).promo).toBeNull();
  });
});

describe("after checkout", () => {
  it("opens the planner from the session before the webhook arrives", async () => {
    const { alice } = setup();
    stripe.subscriptions.set("sub_1", subscription("sub_1"));
    stripe.sessions.set("cs_test_abcdefghijkl", { id: "cs_test_abcdefghijkl", status: "complete", subscription: "sub_1", metadata: { app: "beans", user_id: ALICE } });
    expect(await alice.action(api.billing.confirm, { sessionId: "cs_test_abcdefghijkl" })).toMatchObject({ access: true, status: "trialing" });
  });

  it("won't confirm another account's checkout", async () => {
    const { bob } = setup();
    stripe.sessions.set("cs_test_abcdefghijkl", { id: "cs_test_abcdefghijkl", status: "complete", subscription: "sub_1", metadata: { app: "beans", user_id: ALICE } });
    await expect(bob.action(api.billing.confirm, { sessionId: "cs_test_abcdefghijkl" })).rejects.toThrow(/another account/);
    await expect(bob.action(api.billing.confirm, { sessionId: "../customers" })).rejects.toThrow(/Bad checkout/);
  });

  it("opens the portal with the Beans configuration", async () => {
    const { t, alice, bob } = setup();
    stripe.subscriptions.set("sub_1", subscription("sub_1"));
    await deliver(t, subscriptionEvent("customer.subscription.created", subscription("sub_1")));
    expect((await alice.action(api.billing.portal, { origin: "https://beans.example" })).url).toContain("billing.stripe.com");
    const call = stripe.calls.find((c) => c.path === "/v1/billing_portal/sessions")!;
    expect(Object.fromEntries(call.body)).toEqual({ customer: "cus_alice", return_url: "https://beans.example/app", configuration: STRIPE_IDS.test.portalConfiguration });
    await expect(bob.action(api.billing.portal, { origin: "https://beans.example" })).rejects.toThrow(/No subscription/);
  });
});
