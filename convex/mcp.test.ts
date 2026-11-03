import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { MCP_LIMITS } from "./mcp";
import { analyticsFor, applyOps, createTask, emptyState, type BeansState } from "../packages/core/src";

const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob("./**/*.ts");
const TODAY = "2026-10-31";
const NOW = Date.UTC(2026, 9, 31, 12);
const SECRET = "s".repeat(40);
const CLIENT = { id: "https://ai.example/oauth/client.json", name: "Example AI" };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("MCP_SERVER_SECRET", SECRET);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** Alice signs in to the app as Clerk user `user_alice`; the MCP server calls with that same id. */
async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "user_alice", tokenIdentifier: "https://clerk.beans.followusai.com|user_alice" });
  await alice.mutation(api.planner.init, { timeZone: "UTC" });
  await alice.mutation(api.planner.apply, { ops: [{ kind: "settings", fields: { onboarding: { status: "finished", at: 1 } } }] });
  const as = { secret: SECRET, userId: "user_alice", client: CLIENT };
  return { t, alice, as };
}

async function appState(alice: Awaited<ReturnType<typeof setup>>["alice"]): Promise<BeansState> {
  const load = await alice.query(api.planner.load, { from: "2026-01-01" });
  const byId = <T extends { id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.id, r]));
  return {
    ...emptyState(load.settings!),
    tasks: byId(load.tasks),
    subtasks: byId(load.subtasks),
    lists: byId(load.lists),
    labels: byId(load.labels),
    series: byId(load.series),
  } as BeansState;
}

/** The error code a call failed with. */
async function code(call: Promise<unknown>): Promise<string> {
  try {
    await call;
  } catch (e) {
    return (e as { data?: { code?: string } }).data?.code ?? String(e);
  }
  return "no error";
}

describe("MCP session checks", () => {
  it("refuses calls without the server secret", async () => {
    const { t, as } = await setup();
    expect(await code(t.mutation(api.mcp.getOverview, { ...as, secret: "x".repeat(40) }))).toBe("forbidden");
    vi.stubEnv("MCP_SERVER_SECRET", "");
    expect(await code(t.mutation(api.mcp.getOverview, as))).toBe("not_configured");
  });

  it("reads the same planner the app writes, by Clerk user id", async () => {
    const { t, alice, as } = await setup();
    const made = createTask(await appState(alice), { title: "Water the beans", date: TODAY, estimate: 15 });
    await alice.mutation(api.planner.apply, { ops: made.ops as never });
    const day = await t.mutation(api.mcp.getDay, { ...as, date: TODAY });
    expect(day.tasks).toEqual([{ id: made.id, title: "Water the beans", done: false, estimate: 15 }]);
    // Another Clerk user sees nothing of Alice's.
    const bob = t.withIdentity({ subject: "user_bob" });
    await bob.mutation(api.planner.init, { timeZone: "UTC" });
    expect((await t.mutation(api.mcp.getDay, { ...as, userId: "user_bob", date: TODAY })).tasks).toEqual([]);
  });

  it("asks people who never opened Beans to set it up first", async () => {
    const { t, as } = await setup();
    expect(await code(t.mutation(api.mcp.getOverview, { ...as, userId: "user_new" }))).toBe("no_planner");
  });

  it("needs a subscription, the trial or the no-card pass", async () => {
    const { t, as } = await setup();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    expect(await code(t.mutation(api.mcp.getOverview, as))).toBe("no_access");
    const billing = await t.run(async (ctx) =>
      ctx.db.insert("billing", {
        userId: "user_alice",
        customerId: null,
        subscriptionId: null,
        status: null,
        priceId: null,
        trialEnd: null,
        periodEnd: null,
        cancelAtPeriodEnd: false,
        trialUsed: false,
        passEnd: NOW + 86_400_000,
        updatedAt: NOW,
      }),
    );
    expect((await t.mutation(api.mcp.getOverview, as)).today).toBe(TODAY);
    await t.run(async (ctx) => ctx.db.patch(billing, { passEnd: NOW - 1, status: "trialing" }));
    expect((await t.mutation(api.mcp.getOverview, as)).today).toBe(TODAY);
    await t.run(async (ctx) => ctx.db.patch(billing, { status: "canceled" }));
    expect(await code(t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Nope" }] }))).toBe("no_access");
  });

  it("allows 60 calls a minute", async () => {
    const { t, as } = await setup();
    for (let i = 0; i < MCP_LIMITS.callsPerMinute; i++) await t.mutation(api.mcp.getOverview, as);
    expect(await code(t.mutation(api.mcp.getOverview, as))).toBe("rate_limited");
    vi.setSystemTime(NOW + 60_000);
    expect((await t.mutation(api.mcp.getOverview, as)).today).toBe(TODAY);
  });

  it("allows 1,000 changes a day and changes nothing past that", async () => {
    const { t, as } = await setup();
    await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "One" }] });
    await t.run(async (ctx) => {
      const usage = (await ctx.db.query("mcpUsage").first())!;
      await ctx.db.patch(usage._id, { changes: MCP_LIMITS.changesPerDay - 1 });
    });
    expect(await code(t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Two" }, { title: "Three" }] }))).toBe("daily_limit");
    expect((await t.mutation(api.mcp.listTasks, { ...as, brainDump: true })).tasks!.map((x) => x.title)).toEqual(["One"]);
    // Midnight UTC starts a new day.
    vi.setSystemTime(Date.UTC(2026, 10, 1, 0, 5));
    await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Two" }, { title: "Three" }] });
  });

  it("lists connected apps, and keeps a disconnected one out until Reconnect", async () => {
    const { t, alice, as } = await setup();
    await t.mutation(api.mcp.getOverview, as);
    const row = { clientId: CLIENT.id, name: "Example AI", firstUsedAt: expect.any(Number), lastUsedAt: expect.any(Number) };
    expect(await alice.query(api.mcp.connections, {})).toEqual([{ ...row, disconnected: false }]);
    await alice.mutation(api.mcp.disconnect, { clientId: CLIENT.id });
    expect(await alice.query(api.mcp.connections, {})).toEqual([{ ...row, disconnected: true }]);
    // Refused whatever token it brings, including ones refreshed after the disconnect.
    expect(await code(t.mutation(api.mcp.getOverview, as))).toBe("disconnected");
    vi.setSystemTime(NOW + 86_400_000);
    expect(await code(t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Sneaky" }] }))).toBe("disconnected");
    // Another person can't reconnect it for Alice.
    const bob = t.withIdentity({ subject: "user_bob" });
    await bob.mutation(api.mcp.reconnect, { clientId: CLIENT.id });
    expect(await code(t.mutation(api.mcp.getOverview, as))).toBe("disconnected");
    await alice.mutation(api.mcp.reconnect, { clientId: CLIENT.id });
    expect((await t.mutation(api.mcp.getOverview, as)).today).toBe("2026-11-01");
    expect((await alice.query(api.mcp.connections, {}))[0]!.disconnected).toBe(false);
  });
});

describe("MCP reading tools", () => {
  it("gives an overview with lists, labels and today's load", async () => {
    const { t, as } = await setup();
    await t.mutation(api.mcp.createLabel, { ...as, name: "Work", color: "rain" });
    await t.mutation(api.mcp.createList, { ...as, name: "Half marathon", icon: "🏃", label: "work" });
    await t.mutation(api.mcp.createTasks, {
      ...as,
      tasks: [{ title: "Long run", date: TODAY, estimate: 90 }, { title: "Buy gels", list: "Half marathon" }, { title: "Someday idea" }, { title: "Old", date: "2026-10-29" }],
    });
    const o = await t.mutation(api.mcp.getOverview, as);
    expect(o).toMatchObject({ today: TODAY, weekday: "Saturday", time: "12:00", workdayLimit: 480, brainDump: 1, overdue: 1 });
    expect(o.lists).toEqual([expect.objectContaining({ name: "Half marathon", icon: "🏃", label: "Work", open: 1 })]);
    expect(o.labels).toEqual([expect.objectContaining({ name: "Work", color: "rain" })]);
    expect(o.todaySummary).toMatchObject({ count: 1, estimate: 90, left: 90 });
  });

  it("reads a week in one call, with repeating tasks made for it", async () => {
    const { t, as } = await setup();
    const { created } = await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Stretch", date: "2026-11-02", estimate: 10 }] });
    const repeat = await t.mutation(api.mcp.setRepeat, { ...as, id: created[0]!.id!, repeat: { every: "week", weekdays: ["mon", "wed", "fri"] } });
    expect(repeat.repeat).toBe("Every week on Mon, Wed, Fri");
    expect(repeat.next).toBe("2026-11-04");
    const week = await t.mutation(api.mcp.getWeek, { ...as, date: "2026-11-03" });
    expect(week.from).toBe("2026-11-01");
    expect(week.days.map((d) => d.count)).toEqual([0, 1, 0, 1, 0, 1, 0]);
    expect(week.days[1]!.tasks![0]).toMatchObject({ title: "Stretch", repeats: true });
    expect(week.estimate).toBe(30);
  });

  it("filters tasks by place, label, done and due date", async () => {
    const { t, as } = await setup();
    await t.mutation(api.mcp.createLabel, { ...as, name: "Home", color: "pumpkin" });
    await t.mutation(api.mcp.createTasks, {
      ...as,
      tasks: [
        { title: "Fix the gate", label: "Home", due: "2026-11-05" },
        { title: "Pay rent", date: TODAY, label: "Home" },
        { title: "Write report", date: "2026-11-02" },
      ],
    });
    const home = await t.mutation(api.mcp.listTasks, { ...as, label: "home" });
    expect(home.tasks!.map((x) => x.title).sort()).toEqual(["Fix the gate", "Pay rent"]);
    const days = await t.mutation(api.mcp.listTasks, { ...as, from: TODAY, to: "2026-11-02" });
    expect(days.tasks!.map((x) => x.title)).toEqual(["Pay rent", "Write report"]);
    expect((await t.mutation(api.mcp.listTasks, { ...as, dueBy: "2026-11-06" })).tasks!.map((x) => x.title)).toEqual(["Fix the gate"]);
    expect((await t.mutation(api.mcp.listTasks, { ...as, done: true })).count).toBe(0);
    expect(await code(t.mutation(api.mcp.listTasks, { ...as, from: TODAY, to: "2027-06-01" }))).toBe("invalid");
  });

  it("searches titles and shows one task in full", async () => {
    const { t, as } = await setup();
    await t.mutation(api.mcp.createTasks, {
      ...as,
      tasks: [{ title: "Plan the garden beds", notes: "Measure first\n- North bed\n- South bed", subtasks: ["Measure", "Buy soil"] }, { title: "Call mum" }],
    });
    const found = await t.mutation(api.mcp.searchTasks, { ...as, query: "garden" });
    expect(found.tasks.map((x) => x.title)).toEqual(["Plan the garden beds"]);
    expect(found.tasks[0]!.subtasks).toBe("0/2 done");
    const task = await t.mutation(api.mcp.getTask, { ...as, id: found.tasks[0]!.id! });
    expect(task.notes).toBe("Measure first\n- North bed\n- South bed");
    expect(task.subtasks!.map((s) => s.title)).toEqual(["Measure", "Buy soil"]);
    expect(await code(t.mutation(api.mcp.getTask, { ...as, id: "missing" }))).toBe("not_found");
  });

  it("reports analytics the way the analytics screen counts them", async () => {
    const { t, alice, as } = await setup();
    await t.mutation(api.mcp.createLabel, { ...as, name: "Work", color: "rain" });
    const { created } = await t.mutation(api.mcp.createTasks, {
      ...as,
      tasks: [{ title: "Report", date: TODAY, label: "Work", estimate: 60 }, { title: "Inbox", date: TODAY, estimate: 20 }, { title: "Later", date: "2026-11-02" }],
    });
    await t.mutation(api.mcp.setDone, { ...as, ids: [created[0]!.id!, created[1]!.id!], done: true });
    await t.mutation(api.mcp.logTime, { ...as, id: created[0]!.id!, minutes: 30 });
    const a = await t.mutation(api.mcp.getAnalytics, { ...as, from: "2026-10-25", to: TODAY });
    const screen = analyticsFor(Object.values((await appState(alice)).tasks), "2026-10-25", TODAY, "UTC");
    expect(a.finished).toBe(screen.total.tasks);
    expect(a.minutes).toBe(screen.total.minutes);
    expect(a.byLabel).toEqual([
      { label: "Work", minutes: 90, tasks: 1, share: 82 },
      { label: "No label", minutes: 20, tasks: 1, share: 18 },
    ]);
    expect(a.estimates).toEqual({ tasks: 2, estimated: 80, actual: 110, ratio: 1.38 });
    expect(a.perDay).toEqual([{ date: TODAY, minutes: 110, tasks: 2 }]);
  });
});

describe("MCP changing tools", () => {
  it("creates tasks in the Brain Dump, a list and a day, with the list's label", async () => {
    const { t, alice, as } = await setup();
    await t.mutation(api.mcp.createLabel, { ...as, name: "Training", color: "sprout" });
    const list = await t.mutation(api.mcp.createList, { ...as, name: "Half marathon", label: "Training" });
    const res = await t.mutation(api.mcp.createTasks, {
      ...as,
      tasks: [
        { title: "Brain dump thing" },
        { title: "Buy shoes", list: list.id, estimate: 45 },
        { title: "Tempo run", date: TODAY, start: "07:00", estimate: 40, priority: "high" },
        { title: "Second", date: TODAY },
      ],
    });
    expect(res.created.map((c) => [c.title, c.list ?? c.date, c.label])).toEqual([
      ["Brain dump thing", "Brain Dump", undefined],
      ["Buy shoes", "Half marathon", "Training"],
      ["Tempo run", TODAY, undefined],
      ["Second", TODAY, undefined],
    ]);
    expect(res.days).toEqual([expect.objectContaining({ date: TODAY, count: 2, estimate: 40, workdayLimit: 480 })]);
    // The app sees them, in the order they were given.
    const state = await appState(alice);
    const today = Object.values(state.tasks).filter((x) => x.date === TODAY).sort((a, b) => a.order - b.order);
    expect(today.map((x) => [x.title, x.start])).toEqual([["Tempo run", "07:00"], ["Second", null]]);
  });

  it("explains bad input instead of guessing", async () => {
    const { t, as } = await setup();
    const err = (call: Promise<unknown>) => call.then(() => "", (e) => (e as { data: { message: string } }).data.message);
    expect(await err(t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "X", label: "Nope" }] }))).toBe(
      'No label "Nope". Labels: none yet. Make a new one with create_label.',
    );
    expect(await err(t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "X", start: "09:00" }] }))).toMatch(/a start time needs a date/);
    expect(await err(t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "X", date: "2026-02-30" }] }))).toMatch(/isn't a valid date/);
    expect(await err(t.mutation(api.mcp.createTasks, { ...as, tasks: Array.from({ length: 51 }, () => ({ title: "X" })) }))).toMatch(/At most 50/);
    expect(await err(t.mutation(api.mcp.createLabel, { ...as, name: "X", color: "purple" }))).toMatch(/Choose one of: soil, tomato/);
  });

  it("updates fields, and checks off with the checkbox's rules", async () => {
    const { t, as } = await setup();
    const { created } = await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Draft", date: TODAY, estimate: 25 }] });
    const id = created[0]!.id!;
    const updated = await t.mutation(api.mcp.updateTask, { ...as, id, title: "Draft the essay", notes: "Two pages", due: "2026-11-03", estimate: null });
    expect(updated).toMatchObject({ title: "Draft the essay", due: "2026-11-03" });
    expect(updated.estimate).toBeUndefined();
    await t.mutation(api.mcp.updateTask, { ...as, id, estimate: 30 });
    const done = await t.mutation(api.mcp.setDone, { ...as, ids: [id], done: true });
    // Actual time is filled from the estimate, as the checkbox does.
    expect(done.tasks[0]).toMatchObject({ done: true, actual: 30 });
    expect((await t.mutation(api.mcp.setDone, { ...as, ids: [id], done: false })).tasks[0]!.done).toBe(false);
  });

  it("edits subtasks, and checks the task off when the last one is done", async () => {
    const { t, as } = await setup();
    const { created } = await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Move house", subtasks: ["Pack"] }] });
    const id = created[0]!.id!;
    const first = await t.mutation(api.mcp.updateSubtasks, {
      ...as,
      taskId: id,
      changes: [{ action: "add", title: "Book van" }, { action: "add", title: "Measure sofa", index: 0 }],
    });
    expect(first.subtasks.map((s) => s.title)).toEqual(["Measure sofa", "Pack", "Book van"]);
    const [measure, pack, van] = first.subtasks;
    const second = await t.mutation(api.mcp.updateSubtasks, {
      ...as,
      taskId: id,
      changes: [
        { action: "rename", id: van!.id, title: "Book a van" },
        { action: "remove", id: measure!.id },
        { action: "done", id: pack!.id },
        { action: "done", id: van!.id },
      ],
    });
    expect(second.subtasks).toEqual([
      { id: pack!.id, title: "Pack", done: true },
      { id: van!.id, title: "Book a van", done: true },
    ]);
    expect(second.task.done).toBe(true);
    expect(second.finished).toMatch(/checked off/);
  });

  it("moves tasks and timeboxes them, warning about overlaps", async () => {
    const { t, as } = await setup();
    const { created } = await t.mutation(api.mcp.createTasks, {
      ...as,
      tasks: [{ title: "Meeting", date: TODAY, start: "13:00", estimate: 60 }, { title: "Deep work", estimate: 90 }, { title: "Late", date: TODAY }],
    });
    const [meeting, deep, late] = created.map((c) => c.id!);
    expect(await code(t.mutation(api.mcp.timeboxTask, { ...as, id: deep!, start: "13:30" }))).toBe("invalid");
    const boxed = await t.mutation(api.mcp.timeboxTask, { ...as, id: deep!, start: "12:30", date: TODAY });
    expect(boxed).toMatchObject({ task: { date: TODAY, start: "12:30" }, ends: "14:00", warnings: ['It overlaps "Meeting" at 13:00.'] });
    const lateBox = await t.mutation(api.mcp.timeboxTask, { ...as, id: late!, start: "23:45" });
    expect(lateBox.warnings).toEqual(["It has no estimate, so its block is 30 minutes.", "Its block runs past midnight."]);
    const moved = await t.mutation(api.mcp.moveTasks, { ...as, ids: [meeting!], date: "2026-11-02" });
    expect(moved.moved[0]).toMatchObject({ date: "2026-11-02" });
    expect(moved.moved[0]!.start).toBeUndefined();
    expect(moved.days.map((d) => d.date)).toEqual([TODAY, "2026-11-02"]);
    const back = await t.mutation(api.mcp.moveTasks, { ...as, ids: [meeting!] });
    expect(back.moved[0]!.list).toBe("Brain Dump");
  });

  it("logs time, and stops a repeat", async () => {
    const { t, as } = await setup();
    const { created } = await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Read", date: TODAY }] });
    const id = created[0]!.id!;
    expect((await t.mutation(api.mcp.logTime, { ...as, id, minutes: 40 })).actual).toBe(40);
    expect((await t.mutation(api.mcp.logTime, { ...as, id, minutes: 20 })).actual).toBe(60);
    await t.mutation(api.mcp.setRepeat, { ...as, id, repeat: { every: "day" } });
    expect((await t.mutation(api.mcp.getDay, { ...as, date: "2026-11-01" })).count).toBe(1);
    const stopped = await t.mutation(api.mcp.setRepeat, { ...as, id, repeat: null });
    expect(stopped.task.repeats).toBeUndefined();
    expect((await t.mutation(api.mcp.getDay, { ...as, date: "2026-11-01" })).count).toBe(0);
    expect(await code(t.mutation(api.mcp.setRepeat, { ...as, id, repeat: null }))).toBe("invalid");
  });

  it("moves tasks to Trash and brings them back on today", async () => {
    const { t, alice, as } = await setup();
    const { created } = await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Oops" }, { title: "Keep", date: "2026-11-05" }] });
    const ids = created.map((c) => c.id!);
    const trashed = await t.mutation(api.mcp.deleteTasks, { ...as, ids });
    expect(trashed.trashed.map((x) => x.was)).toEqual(["Brain Dump", "2026-11-05"]);
    const state = await appState(alice);
    expect(ids.every((id) => state.tasks[id]!.deletedAt !== null)).toBe(true);
    expect(await code(t.mutation(api.mcp.getTask, { ...as, id: ids[0]! }))).toBe("not_found");
    const restored = await t.mutation(api.mcp.restoreTasks, { ...as, ids });
    expect(restored.restored.map((x) => x.date)).toEqual([TODAY, TODAY]);
    expect(await code(t.mutation(api.mcp.restoreTasks, { ...as, ids }))).toBe("not_found");
  });

  it("refuses duplicate list and label names", async () => {
    const { t, as } = await setup();
    await t.mutation(api.mcp.createList, { ...as, name: "Reading" });
    expect(await code(t.mutation(api.mcp.createList, { ...as, name: "reading" }))).toBe("invalid");
    await t.mutation(api.mcp.createLabel, { ...as, name: "Health", color: "Sprout" });
    expect(await code(t.mutation(api.mcp.createLabel, { ...as, name: "health", color: "beet" }))).toBe("invalid");
  });

  it("ends up where the app's own functions would", async () => {
    const { t, alice, as } = await setup();
    const before = await appState(alice);
    const { created } = await t.mutation(api.mcp.createTasks, { ...as, tasks: [{ title: "Same path", date: TODAY, estimate: 20 }] });
    const server = (await appState(alice)).tasks[created[0]!.id!]!;
    const local = applyOps(before, createTask(before, { title: "Same path", date: TODAY, estimate: 20, position: "bottom", id: server.id }, NOW).ops, NOW);
    const { updatedAt, createdAt, ...rest } = local.tasks[server.id]!;
    void updatedAt;
    void createdAt;
    expect(server).toMatchObject(rest);
  });
});
