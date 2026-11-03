import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { addSubtask, createLabel, createList, createTask, createTemplate, emptyState, makeRepeating } from "../packages/core/src";
import { stableUserId } from "./lib";

// Vitest provides import.meta.glob.
const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob("./**/*.ts");

const TODAY = "2026-10-31";
const OLD_ISSUER = "https://clerk.followusai.com";
const NEW_ISSUER = "https://clerk.beans.followusai.com";
const CLIENT_TABLES = ["tasks", "subtasks", "lists", "labels", "templates", "recurringSeries", "timeEntries", "attachments"] as const;
const TABLES = [...CLIENT_TABLES, "userSettings", "billing"] as const;

afterEach(() => vi.useRealTimers());

const signIn = (t: ReturnType<typeof convexTest>, subject: string, issuer = NEW_ISSUER) =>
  t.withIdentity({ subject, tokenIdentifier: `${issuer}|${subject}`, issuer });

/** An account with a row in every table, made through the API. */
async function fillAccount(t: ReturnType<typeof convexTest>, subject: string) {
  const user = signIn(t, subject);
  await user.mutation(api.planner.init, { timeZone: "UTC" });
  const load = await user.query(api.planner.load, { from: TODAY });
  const s = emptyState(load.settings!);
  const task = createTask(s, { title: `${subject}'s task`, date: TODAY });
  const ops = [
    ...task.ops,
    ...addSubtask(s, task.id, "A step").ops,
    ...createList(s, { name: "Work", icon: "briefcase" }).ops,
    ...createLabel(s, { name: "Deep", color: "green" }).ops,
    ...createTemplate(s, { title: "Weekly review" }).ops,
  ];
  await user.mutation(api.planner.apply, { ops: ops as never });
  const withTask = { ...s, tasks: { [task.id]: (await user.query(api.planner.load, { from: TODAY })).tasks[0] } } as never;
  await user.mutation(api.planner.apply, { ops: makeRepeating(withTask, task.id, "FREQ=WEEKLY", TODAY) as never });
  await user.mutation(api.planner.apply, { ops: [{ kind: "settings", fields: { theme: "dark" } }] });
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("timeEntries", { userId: subject, clientId: `te-${subject}`, createdAt: now, updatedAt: now, deletedAt: null, taskId: task.id, kind: "timer", startedAt: now, endedAt: now });
    await ctx.db.insert("attachments", { userId: subject, clientId: `att-${subject}`, createdAt: now, updatedAt: now, deletedAt: null, taskId: task.id, name: "notes.pdf", size: 1, storageId: null });
    await ctx.db.insert("billing", {
      userId: subject,
      customerId: `cus_${subject}`,
      subscriptionId: `sub_${subject}`,
      status: "active",
      priceId: null,
      trialEnd: null,
      periodEnd: null,
      cancelAtPeriodEnd: false,
      trialUsed: true,
      updatedAt: now,
    });
  });
  return { taskId: task.id };
}

/** Puts every row of `subject` back under the old `<issuer>|<subject>` id, as stored before the change. */
async function makeLegacy(t: ReturnType<typeof convexTest>, subject: string) {
  await t.run(async (ctx) => {
    for (const table of TABLES)
      for (const row of await ctx.db.query(table).collect()) if (row.userId === subject) await ctx.db.patch(row._id, { userId: `${OLD_ISSUER}|${subject}` });
  });
}

async function rows(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const out: Record<string, string[]> = {};
    for (const table of TABLES) out[table] = (await ctx.db.query(table).collect()).map((r) => r.userId).sort();
    return out;
  });
}

async function migrate(t: ReturnType<typeof convexTest>) {
  vi.useFakeTimers();
  await t.mutation(internal.migrations.toStableUserIds, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  vi.useRealTimers();
}

describe("stable user id", () => {
  it("reads the Clerk user id out of either id form", () => {
    expect(stableUserId(`${NEW_ISSUER}|user_2abc`)).toBe("user_2abc");
    expect(stableUserId("user_2abc")).toBe("user_2abc");
  });

  it("stores data under the Clerk user id, so a new Clerk domain keeps it", async () => {
    const t = convexTest(schema, modules);
    await fillAccount(t, "user_alice");
    expect(new Set(Object.values(await rows(t)).flat())).toEqual(new Set(["user_alice"]));

    const moved = signIn(t, "user_alice", "https://clerk.another-domain.com");
    const load = await moved.query(api.planner.load, { from: TODAY });
    expect(load.settings!.theme).toBe("dark");
    expect(load.tasks.map((x) => x.title)).toContain("user_alice's task");
    expect((await moved.query(api.billing.status, {})).status).toBe("active");
  });
});

describe("moving rows to the stable id", () => {
  it("moves an account's old rows when it signs in, before the migration reaches it", async () => {
    const t = convexTest(schema, modules);
    const { taskId } = await fillAccount(t, "user_alice");
    await makeLegacy(t, "user_alice");
    const before = await rows(t);

    // Signed in with the old domain, the account's token identifier is its old id.
    const alice = signIn(t, "user_alice", OLD_ISSUER);
    expect((await alice.query(api.planner.load, { from: TODAY })).settings).toBeNull();
    await alice.mutation(api.planner.init, { timeZone: "Asia/Tokyo" });

    const load = await alice.query(api.planner.load, { from: TODAY });
    expect(load.settings).toMatchObject({ theme: "dark", timeZone: "UTC" });
    expect(load.tasks.map((x) => x.id)).toContain(taskId);
    expect((await alice.query(api.billing.status, {})).status).toBe("active");
    const after = await rows(t);
    for (const table of TABLES) expect(after[table]).toEqual(before[table].map(stableUserId));
  });

  it("rewrites every table for every user, and does nothing the second time", async () => {
    const t = convexTest(schema, modules);
    await fillAccount(t, "user_alice");
    await fillAccount(t, "user_bob");
    await fillAccount(t, "user_new");
    await makeLegacy(t, "user_alice");
    await makeLegacy(t, "user_bob");
    const before = await rows(t);
    for (const table of TABLES) expect(before[table].some((id) => id.includes("|"))).toBe(true);

    await migrate(t);
    const after = await rows(t);
    for (const table of TABLES) expect(after[table]).toEqual(before[table].map(stableUserId).sort());
    const forms = await t.query(internal.migrations.userIdForms, {});
    for (const table of TABLES) expect(forms[table]).toMatchObject({ legacy: 0, users: 3 });

    await migrate(t);
    expect(await rows(t)).toEqual(after);
    const bob = signIn(t, "user_bob");
    expect((await bob.query(api.planner.load, { from: TODAY })).tasks.map((x) => x.title)).toContain("user_bob's task");
  });

  it("keeps one copy when a row exists under both ids", async () => {
    const t = convexTest(schema, modules);
    const { taskId } = await fillAccount(t, "user_alice");
    await makeLegacy(t, "user_alice");
    // The same task saved again under the new id, edited later than the old copy.
    await t.run(async (ctx) => {
      const old = (await ctx.db.query("tasks").collect()).find((r) => r.clientId === taskId)!;
      const { _id, _creationTime, ...fields } = old;
      void _id;
      void _creationTime;
      await ctx.db.insert("tasks", { ...fields, userId: "user_alice", title: "Newer edit", updatedAt: old.updatedAt + 1 });
      // A second settings row and a billing row with only the free days.
      const settings = (await ctx.db.query("userSettings").first())!;
      const { _id: sid, _creationTime: sct, ...s } = settings;
      void sid;
      void sct;
      await ctx.db.insert("userSettings", { ...s, userId: "user_alice", theme: "light" });
      const billing = (await ctx.db.query("billing").first())!;
      await ctx.db.patch(billing._id, { trialUsed: false });
      await ctx.db.insert("billing", { ...emptyBilling("user_alice"), trialUsed: true, passEnd: 123 });
    });

    await migrate(t);
    const alice = signIn(t, "user_alice");
    const load = await alice.query(api.planner.load, { from: TODAY });
    expect(load.tasks.filter((x) => x.id === taskId).map((x) => x.title)).toEqual(["Newer edit"]);
    expect(load.settings!.theme).toBe("dark");
    expect(await alice.query(api.billing.status, {})).toMatchObject({ status: "active", passEnd: 123, trialAvailable: false });
    const after = await rows(t);
    expect(after.tasks).toEqual(["user_alice"]);
    expect(after.userSettings).toEqual(["user_alice"]);
    expect(after.billing).toEqual(["user_alice"]);
  });
});

function emptyBilling(userId: string) {
  return { userId, customerId: null, subscriptionId: null, status: null, priceId: null, trialEnd: null, periodEnd: null, cancelAtPeriodEnd: false, trialUsed: false, updatedAt: Date.now() };
}
