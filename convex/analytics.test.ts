import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { STRIPE_IDS } from "../packages/core/src/billing";
import { applyOps, createTask, emptyState, moveTask, type BeansState } from "../packages/core/src";
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

/** Every PostHog capture scheduled so far, as [event, distinct id, properties]. */
async function captures(t: Awaited<ReturnType<typeof setup>>["t"]) {
  const jobs = await t.run(async (ctx) => await ctx.db.system.query("_scheduled_functions").collect());
  return jobs
    .filter((j) => j.name.startsWith("analytics"))
    .map((j) => {
      const { event, distinctId, properties, set } = j.args[0] as { event: string; distinctId: string; properties: Record<string, unknown>; set?: Record<string, string> };
      return [event, distinctId, set ? { ...properties, $set: set } : properties] as const;
    });
}

async function signedUp() {
  const ctx = await setup();
  await ctx.alice.mutation(api.planner.init, { timeZone: "UTC" });
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

describe("capture", () => {
  const args = { event: "signed_up", distinctId: "alice", properties: { product: "beans" }, set: { email: "alice@example.com" } };

  it("posts to PostHog from a hosted deployment", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CONVEX_CLOUD_URL", "https://happy-bean-123.convex.cloud");
    const { t } = await setup();
    await t.action(internal.analytics.capture, args);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(JSON.parse(String(init.body))).toMatchObject({ api_key: expect.stringMatching(/^phc_/), event: "signed_up", distinct_id: "alice", properties: { product: "beans", $set: { email: "alice@example.com" } } });
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
