import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { STRIPE_IDS } from "../packages/core/src/billing";
import { addDays, applyOps, createTask, emptyState, makeRepeating, moveTask, todayIn, type BeansState } from "../packages/core/src";
import { clearPromoCache } from "./billing";
import { signWebhook } from "./stripe";

// Vitest provides import.meta.glob.
const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob("./**/*.ts");
const TODAY = "2026-10-31";
const SECRET = "whsec_test_beans";
const MCP_SECRET = "s".repeat(40);

beforeEach(() => {
  vi.stubEnv("MCP_SERVER_SECRET", MCP_SECRET);
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice", tokenIdentifier: "test|alice", email: "alice@example.com" });
  return { t, alice };
}

async function setupWithBob() {
  const ctx = await setup();
  return { ...ctx, bob: ctx.t.withIdentity({ subject: "bob", tokenIdentifier: "test|bob", email: "bob@example.com" }) };
}

/** Every PostHog capture scheduled so far, as [event, distinct id, properties]. */
async function captures(t: Awaited<ReturnType<typeof setup>>["t"]) {
  const jobs = await t.run(async (ctx) => await ctx.db.system.query("_scheduled_functions").collect());
  return jobs
    .filter((j) => j.name.startsWith("analytics"))
    .map((j) => {
      const { event, distinctId, properties, set, setOnce } = j.args[0] as {
        event: string;
        distinctId: string;
        properties: Record<string, unknown>;
        set?: Record<string, string>;
        setOnce?: Record<string, string>;
      };
      const props: Record<string, unknown> = { ...properties, ...(set ? { $set: set } : {}), ...(setOnce ? { $set_once: setOnce } : {}) };
      return [event, distinctId, props] as const;
    });
}

async function signedUp(timeZone = "UTC") {
  const ctx = await setup();
  await ctx.alice.mutation(api.planner.init, { timeZone });
  const load = await ctx.alice.query(api.planner.load, { from: "2026-01-01" });
  const state: BeansState = emptyState(load.settings!);
  return { ...ctx, state };
}

describe("signed_up", () => {
  it("fires once, when the account's settings are created, with its email", async () => {
    const { t, alice } = await signedUp();
    await alice.mutation(api.planner.init, { timeZone: "UTC" });
    expect(await captures(t)).toEqual([["signed_up", "alice", { product: "beans", $set: { email: "alice@example.com" } }]]);
  });

  it("carries where the visitor came from, as event properties and $set_once", async () => {
    const { t, alice } = await setup();
    const firstTouch = {
      first_touch_referrer: "https://www.google.com/",
      first_touch_referring_domain: "www.google.com",
      first_touch_landing_path: "/pricing",
      first_touch_utm_source: "newsletter",
      first_touch_utm_campaign: "x".repeat(400),
      first_touch_utm_term: "",
    };
    await alice.mutation(api.planner.init, { timeZone: "UTC", firstTouch });
    const expected = {
      first_touch_referrer: "https://www.google.com/",
      first_touch_referring_domain: "www.google.com",
      first_touch_landing_path: "/pricing",
      first_touch_utm_source: "newsletter",
      first_touch_utm_campaign: "x".repeat(300),
    };
    expect(await captures(t)).toEqual([["signed_up", "alice", { product: "beans", ...expected, $set: { email: "alice@example.com" }, $set_once: expected }]]);
  });
});

describe("day_planned", () => {
  const dayPlanned = async (t: Awaited<ReturnType<typeof setup>>["t"]) => (await captures(t)).filter(([e]) => e === "day_planned");

  it("fires once per local day, with the day planned and how far ahead it is", async () => {
    const { t, alice, state } = await signedUp();
    const today = todayIn("UTC");
    await alice.mutation(api.planner.apply, { ops: createTask(state, { title: "Someday" }).ops as never });
    expect(await dayPlanned(t)).toEqual([]);

    await alice.mutation(api.planner.apply, { ops: createTask(state, { title: "Friday", date: addDays(today, 3) }).ops as never });
    await alice.mutation(api.planner.apply, { ops: createTask(state, { title: "Today too", date: today }).ops as never });
    // Fires on the activation day too.
    expect((await captures(t)).map(([e]) => e)).toEqual(["signed_up", "activated", "day_planned"]);
    expect(await dayPlanned(t)).toEqual([["day_planned", "alice", { product: "beans", planned_for: addDays(today, 3), source: "app", days_ahead: 3 }]]);

    // The next day it fires again, once.
    await t.run(async (ctx) => {
      const settings = await ctx.db.query("userSettings").first();
      await ctx.db.patch(settings!._id, { lastDayPlannedOn: addDays(today, -1) });
    });
    await alice.mutation(api.planner.apply, { ops: createTask(state, { title: "Tomorrow", date: addDays(today, 1) }).ops as never });
    await alice.mutation(api.planner.apply, { ops: createTask(state, { title: "And one more", date: today }).ops as never });
    expect((await dayPlanned(t)).map(([, , p]) => p.days_ahead)).toEqual([3, 1]);
    expect((await captures(t)).filter(([e]) => e === "activated")).toHaveLength(1);
    // The guard stays on the server.
    const load = await alice.query(api.planner.load, { from: "2026-01-01" });
    expect(load.settings).not.toHaveProperty("lastDayPlannedOn");
  });

  it("counts the day in the user's time zone", async () => {
    const zone = "Pacific/Kiritimati";
    const { t, alice, state } = await signedUp(zone);
    const today = todayIn(zone);
    await alice.mutation(api.planner.apply, { ops: createTask(state, { title: "Here", date: today }).ops as never });
    const settings = await t.run(async (ctx) => await ctx.db.query("userSettings").first());
    expect(settings!.lastDayPlannedOn).toBe(today);
    expect((await dayPlanned(t))[0]![2]).toMatchObject({ planned_for: today, days_ahead: 0 });
  });

  it("counts moving a task onto a day, and plans from a connected AI app", async () => {
    const { t, alice, state } = await signedUp();
    const made = createTask(state, { title: "Undated" });
    await alice.mutation(api.planner.apply, { ops: made.ops as never });
    const moved = moveTask(applyOps(state, made.ops, Date.now()), made.id, { date: todayIn("UTC"), listId: null });
    await alice.mutation(api.planner.apply, { ops: moved as never });
    expect(await dayPlanned(t)).toHaveLength(1);

    await t.run(async (ctx) => {
      const settings = await ctx.db.query("userSettings").first();
      await ctx.db.patch(settings!._id, { lastDayPlannedOn: "2026-01-01" });
    });
    const as = { secret: MCP_SECRET, userId: "alice", client: { id: "https://ai.example/client.json", name: "Example AI" } };
    await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "From the AI app", date: todayIn("UTC") }] });
    await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Second from the AI app", date: todayIn("UTC") }] });
    expect((await dayPlanned(t)).map(([, , p]) => p.source)).toEqual(["app", "mcp"]);
  });

  it("leaves out repeat instances the server makes", async () => {
    const { t, alice, state } = await signedUp();
    const today = todayIn("UTC");
    const made = createTask(state, { title: "Stretch", date: today });
    const ops = [...made.ops, ...makeRepeating(applyOps(state, made.ops), made.id, "FREQ=DAILY", today)];
    await alice.mutation(api.planner.apply, { ops: ops as never });
    expect(await dayPlanned(t)).toHaveLength(1);
    await t.run(async (ctx) => {
      const settings = await ctx.db.query("userSettings").first();
      await ctx.db.patch(settings!._id, { lastDayPlannedOn: addDays(today, -1) });
    });
    await alice.mutation(api.planner.ensureInstances, { from: today, to: addDays(today, 6) });
    const instances = await t.run(async (ctx) => await ctx.db.query("tasks").collect());
    expect(instances.length).toBeGreaterThan(1);
    expect(await dayPlanned(t)).toHaveLength(1);
  });
});

describe("activated", () => {
  it("waits for a task on a day, then fires once", async () => {
    const { t, alice, state } = await signedUp();
    const undated = createTask(state, { title: "Someday" });
    await alice.mutation(api.planner.apply, { ops: undated.ops as never });
    expect((await captures(t)).map(([e]) => e)).toEqual(["signed_up"]);

    const first = createTask(state, { title: "Plan today", date: TODAY });
    await alice.mutation(api.planner.apply, { ops: first.ops as never });
    const second = createTask(state, { title: "And another", date: TODAY });
    await alice.mutation(api.planner.apply, { ops: second.ops as never });
    expect((await captures(t)).filter(([e]) => e === "activated")).toEqual([["activated", "alice", { product: "beans", source: "app" }]]);
    // The flag stays on the server.
    const load = await alice.query(api.planner.load, { from: "2026-01-01" });
    expect(load.settings).not.toHaveProperty("activatedAt");
  });

  it("counts moving a Brain Dump task onto a day", async () => {
    const { t, alice, state } = await signedUp();
    const made = createTask(state, { title: "Undated" });
    await alice.mutation(api.planner.apply, { ops: made.ops as never });
    const moved = moveTask(applyOps(state, made.ops, Date.now()), made.id, { date: TODAY, listId: null });
    await alice.mutation(api.planner.apply, { ops: moved as never });
    expect((await captures(t)).filter(([e]) => e === "activated")).toHaveLength(1);
  });

  it("counts a task planned by a connected AI app", async () => {
    const { t } = await signedUp();
    const as = { secret: MCP_SECRET, userId: "alice", client: { id: "https://ai.example/client.json", name: "Example AI" } };
    await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "From the AI app", date: TODAY }] });
    expect((await captures(t)).filter(([e]) => e === "activated")).toEqual([["activated", "alice", { product: "beans", source: "mcp" }]]);
  });

  it("marks accounts that planned days before it shipped without an event", async () => {
    const { t, alice, state } = await signedUp();
    const old = createTask(state, { title: "Planned last month", date: "2026-10-01" });
    await t.run(async (ctx) => {
      const { id, ...fields } = (old.ops[0] as unknown as { record: { id: string } & Record<string, unknown> }).record;
      await ctx.db.insert("tasks", { ...fields, userId: "alice", clientId: id } as never);
    });
    await alice.mutation(api.planner.apply, { ops: createTask(state, { title: "New", date: TODAY }).ops as never });
    expect((await captures(t)).filter(([e]) => e === "activated")).toEqual([]);
    const settings = await t.run(async (ctx) => await ctx.db.query("userSettings").first());
    expect(settings!.activatedAt).toBeTypeOf("number");
  });
});

describe("paid", () => {
  const invoice = (fields: Record<string, unknown> = {}) => ({
    id: "in_1",
    object: "invoice",
    status: "paid",
    customer: "cus_alice",
    amount_paid: 600,
    currency: "usd",
    subscription: "sub_1",
    subscription_details: { metadata: { app: "beans", user_id: "alice", plan: "monthly" } },
    lines: { data: [{ price: { id: STRIPE_IDS.test.prices.monthly } }] },
    ...fields,
  });

  async function deliver(t: Awaited<ReturnType<typeof setup>>["t"], object: unknown) {
    const body = JSON.stringify({ id: "evt_1", type: "invoice.paid", data: { object } });
    const res = await t.fetch("/stripe/webhook", {
      method: "POST",
      body,
      headers: { "Stripe-Signature": await signWebhook(body, SECRET, Math.floor(Date.now() / 1000)) },
    });
    return await res.text();
  }

  async function withCustomer() {
    const ctx = await setup();
    await ctx.t.mutation(internal.billing.setCustomer, { userId: "alice", customerId: "cus_alice" });
    return ctx;
  }

  it("fires on the first charged invoice only, in major units", async () => {
    const { t } = await withCustomer();
    expect(await deliver(t, invoice({ amount_paid: 0 }))).toBe("Ignored");
    expect(await deliver(t, invoice())).toBe("paid");
    expect(await deliver(t, invoice({ id: "in_2" }))).toBe("already paid");
    expect(await captures(t)).toEqual([["paid", "alice", { product: "beans", plan: "monthly", amount: 6, currency: "usd" }]]);
  });

  it("reads the newer invoice shape and finds the account by its customer", async () => {
    const { t } = await withCustomer();
    const newer = invoice({
      subscription: undefined,
      subscription_details: undefined,
      parent: { subscription_details: { subscription: "sub_1", metadata: {} } },
      lines: { data: [{ pricing: { price_details: { price: STRIPE_IDS.test.prices.yearly } } }] },
      amount_paid: 4800,
    });
    expect(await deliver(t, newer)).toBe("paid");
    expect(await captures(t)).toEqual([["paid", "alice", { product: "beans", plan: "yearly", amount: 48, currency: "usd" }]]);
  });

  it("ignores other products' invoices", async () => {
    const { t } = await withCustomer();
    const other = invoice({ subscription_details: { metadata: { app: "vidzilla" } }, lines: { data: [{ price: { id: "price_other" } }] } });
    expect(await deliver(t, other)).toBe("Ignored");
    expect(await captures(t)).toEqual([]);
  });
});

/** A fake Stripe for checkouts and subscription reads. */
function fakeStripe(subscriptions: Map<string, Record<string, unknown>>, promos: Record<string, unknown>[] = []) {
  return vi.fn(async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const ok = (json: unknown) => new Response(JSON.stringify(json), { status: 200 });
    const [, , kind, id] = url.pathname.split("/");
    if (kind === "subscriptions" && subscriptions.has(id!)) return ok(subscriptions.get(id!));
    if (kind === "customers") return ok({ id: "cus_alice" });
    if (kind === "promotion_codes") return ok({ data: promos.filter((p) => p.code === url.searchParams.get("code")) });
    if (url.pathname === "/v1/checkout/sessions" && init.method === "POST") return ok({ id: "cs_test_new", url: "https://checkout.stripe.com/c/pay/cs_test_new" });
    return new Response("{}", { status: 404 });
  });
}

async function deliverEvent(t: Awaited<ReturnType<typeof setup>>["t"], type: string, object: unknown) {
  const body = JSON.stringify({ id: "evt_1", type, data: { object } });
  const res = await t.fetch("/stripe/webhook", {
    method: "POST",
    body,
    headers: { "Stripe-Signature": await signWebhook(body, SECRET, Math.floor(Date.now() / 1000)) },
  });
  return await res.text();
}

describe("checkout_started", () => {
  const origin = "http://localhost:3100";
  beforeEach(() => clearPromoCache());

  it("fires once Stripe makes the session, with the plan, price and launch code", async () => {
    vi.stubEnv("STRIPE_PROMO_CODES", "BEANS100");
    const promo = { id: "promo_100", code: "BEANS100", active: true, times_redeemed: 3, max_redemptions: 100, coupon: { percent_off: 100, duration: "repeating", duration_in_months: 3, valid: true } };
    vi.stubGlobal("fetch", fakeStripe(new Map(), [promo]));
    const { t, alice } = await setup();
    await alice.action(api.billing.checkout, { plan: "monthly", origin });
    await alice.action(api.billing.checkout, { plan: "yearly", origin });
    expect(await captures(t)).toEqual([
      ["checkout_started", "alice", { product: "beans", plan: "monthly", promo_code: "BEANS100", price: 6, amount: 0, currency: "usd", trial: true }],
      ["checkout_started", "alice", { product: "beans", plan: "yearly", promo_code: null, price: 48, amount: 48, currency: "usd", trial: true }],
    ]);
  });

  /** One monthly checkout with a launch code on `coupon` running, and its `checkout_started` properties. */
  async function monthlyWith(coupon: Record<string, unknown>) {
    clearPromoCache();
    vi.stubEnv("STRIPE_PROMO_CODES", "BEANSX");
    const promo = { id: "promo_x", code: "BEANSX", active: true, times_redeemed: 3, max_redemptions: 250, coupon: { duration: "repeating", duration_in_months: 3, valid: true, ...coupon } };
    vi.stubGlobal("fetch", fakeStripe(new Map(), [promo]));
    const { t, alice } = await setup();
    await alice.action(api.billing.checkout, { plan: "monthly", origin });
    return (await captures(t))[0]![2];
  }

  it("sends amount as the first charge after the trial: the full price without a code", async () => {
    vi.stubGlobal("fetch", fakeStripe(new Map()));
    const { t, alice, bob } = await setupWithBob();
    await alice.action(api.billing.checkout, { plan: "monthly", origin });
    await bob.action(api.billing.checkout, { plan: "yearly", origin });
    expect((await captures(t)).map(([, , p]) => [p.plan, p.price, p.amount, p.promo_code])).toEqual([
      ["monthly", 6, 6, null],
      ["yearly", 48, 48, null],
    ]);
  });

  it("takes a launch code's discount off the first charge", async () => {
    expect(await monthlyWith({ percent_off: 50 })).toEqual({ product: "beans", plan: "monthly", promo_code: "BEANSX", price: 6, amount: 3, currency: "usd", trial: true });
    expect(await monthlyWith({ amount_off: 200, currency: "usd", duration: "once" })).toMatchObject({ price: 6, amount: 4 });
    expect(await monthlyWith({ amount_off: 1000, currency: "usd", duration: "forever" })).toMatchObject({ amount: 0 });
    expect(await monthlyWith({ percent_off: 100 })).toMatchObject({ price: 6, amount: 0 });
  });

  it("leaves amount out when the first charge can't be known", async () => {
    // A coupon with no percent or amount off, and an amount off in another currency.
    const unknown = await monthlyWith({});
    expect(unknown).toMatchObject({ promo_code: "BEANSX", price: 6 });
    expect(unknown).not.toHaveProperty("amount");
    const otherCurrency = await monthlyWith({ amount_off: 200, currency: "eur" });
    expect(otherCurrency).not.toHaveProperty("amount");
    // Never Stripe's amount due today, which is 0 during the trial.
    expect(otherCurrency).not.toHaveProperty("amount_total");
  });

  it("charges the full price when the code can't be looked up", async () => {
    vi.stubEnv("STRIPE_PROMO_CODES", "BEANSX");
    const failing = fakeStripe(new Map());
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit) =>
        new URL(input).pathname === "/v1/promotion_codes" ? new Response("{}", { status: 500 }) : failing(input, init),
      ),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { t, alice } = await setup();
    await alice.action(api.billing.checkout, { plan: "monthly", origin });
    error.mockRestore();
    // No code is applied (the buyer gets Stripe's code box), so the first charge is the list price.
    expect((await captures(t))[0]![2]).toMatchObject({ promo_code: null, price: 6, amount: 6 });
  });

  it("sends nothing when the checkout fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "down" } }), { status: 500 })));
    const { t, alice } = await setup();
    await expect(alice.action(api.billing.checkout, { plan: "monthly", origin })).rejects.toThrow();
    expect(await captures(t)).toEqual([]);
  });
});

describe("subscription_cancelled", () => {
  const DAY = 86_400;
  const start = Math.floor(Date.now() / 1000) - 40 * DAY;
  const sub = (id: string, fields: Record<string, unknown> = {}) => ({
    id,
    object: "subscription",
    customer: "cus_alice",
    status: "canceled",
    start_date: start,
    trial_end: start + 7 * DAY,
    ended_at: start + 40 * DAY,
    cancel_at_period_end: false,
    cancellation_details: { reason: "cancellation_requested", feedback: "too_expensive", comment: "Private words" },
    metadata: { app: "beans", user_id: "alice", plan: "monthly" },
    items: { data: [{ price: { id: STRIPE_IDS.test.prices.monthly } }] },
    ...fields,
  });

  async function withSubscriptions(...subs: Record<string, unknown>[]) {
    const map = new Map(subs.map((s) => [String(s.id), s]));
    vi.stubGlobal("fetch", fakeStripe(map));
    const ctx = await setup();
    await ctx.t.mutation(internal.billing.setCustomer, { userId: "alice", customerId: "cus_alice" });
    return { ...ctx, map };
  }

  it("fires once per subscription when Stripe deletes it, with the plan, reason and length", async () => {
    const { t } = await withSubscriptions(sub("sub_1"));
    await deliverEvent(t, "customer.subscription.deleted", { id: "sub_1" });
    await deliverEvent(t, "customer.subscription.deleted", { id: "sub_1" });
    expect(await captures(t)).toEqual([
      [
        "subscription_cancelled",
        "alice",
        { product: "beans", plan: "monthly", cancellation_reason: "too_expensive", stripe_cancellation_reason: "cancellation_requested", days_subscribed: 40, ended_in_trial: false },
      ],
    ]);
  });

  it("counts a later subscription's end separately, and a trial that ended", async () => {
    const trial = sub("sub_2", { start_date: start, ended_at: start + 5 * DAY, cancellation_details: { reason: "cancellation_requested", feedback: null } });
    const { t } = await withSubscriptions(sub("sub_1"), trial);
    await deliverEvent(t, "customer.subscription.deleted", { id: "sub_1" });
    await deliverEvent(t, "customer.subscription.deleted", { id: "sub_2" });
    const ended = (await captures(t)).map(([, , p]) => [p.cancellation_reason, p.days_subscribed, p.ended_in_trial]);
    expect(ended).toEqual([
      ["too_expensive", 40, false],
      ["cancellation_requested", 5, true],
    ]);
  });

  it("waits for the end: cancelling at period end or an update sends nothing", async () => {
    const { t, map } = await withSubscriptions(sub("sub_1", { status: "active", ended_at: null, cancel_at_period_end: true }));
    await deliverEvent(t, "customer.subscription.updated", { id: "sub_1" });
    // A deleted event for a subscription Stripe still reports as running is not an end either.
    await deliverEvent(t, "customer.subscription.deleted", { id: "sub_1" });
    expect(await captures(t)).toEqual([]);
    map.set("sub_1", sub("sub_1"));
    await deliverEvent(t, "customer.subscription.updated", { id: "sub_1" });
    expect(await captures(t)).toEqual([]);
  });

  it("ignores other products' subscriptions", async () => {
    const other = sub("sub_9", { metadata: { app: "vidzilla" }, items: { data: [{ price: { id: "price_other" } }] } });
    const { t } = await withSubscriptions(other);
    expect(await deliverEvent(t, "customer.subscription.deleted", { id: "sub_9" })).toBe("ignored");
    expect(await captures(t)).toEqual([]);
  });
});

describe("capture", () => {
  const args = { event: "signed_up", distinctId: "alice", properties: { product: "beans" }, set: { email: "alice@example.com" }, setOnce: { first_touch_referrer: "https://www.google.com/" } };

  it("posts to PostHog from a hosted deployment", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CONVEX_CLOUD_URL", "https://happy-bean-123.convex.cloud");
    const { t } = await setup();
    await t.action(internal.analytics.capture, args);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(JSON.parse(String(init.body))).toMatchObject({ api_key: expect.stringMatching(/^phc_/), event: "signed_up", distinct_id: "alice", properties: { product: "beans", $set: { email: "alice@example.com" }, $set_once: { first_touch_referrer: "https://www.google.com/" } } });
  });

  it("sends nothing from a local backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CONVEX_CLOUD_URL", "http://127.0.0.1:3210");
    const { t } = await setup();
    await t.action(internal.analytics.capture, args);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
