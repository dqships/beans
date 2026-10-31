import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { applyOps, createTask, deleteTask, emptyState, makeRepeating, moveTask, setDone, type BeansState, type Op } from "../packages/core/src";

// Vitest provides import.meta.glob.
const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob("./**/*.ts");
const TODAY = "2026-10-31";

function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice", tokenIdentifier: "test|alice", name: "Alice" });
  const bob = t.withIdentity({ subject: "bob", tokenIdentifier: "test|bob", name: "Bob" });
  return { t, alice, bob };
}

type Load = Awaited<ReturnType<ReturnType<typeof setup>["alice"]["query"]>>;

function toState(load: NonNullable<Load>): BeansState {
  const s = emptyState(load.settings!);
  const byId = <T extends { id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.id, r]));
  return {
    ...s,
    tasks: byId(load.tasks),
    subtasks: byId(load.subtasks),
    lists: byId(load.lists),
    labels: byId(load.labels),
    templates: byId(load.templates),
    series: byId(load.series),
    timeEntries: byId(load.timeEntries),
  } as BeansState;
}

/** Drops server-set timestamps so the client's optimistic copy can be compared. */
function stable(state: BeansState) {
  const strip = (rows: Record<string, { updatedAt?: number }>) =>
    Object.fromEntries(Object.entries(rows).map(([k, { updatedAt, ...rest }]) => (void updatedAt, [k, rest])));
  return { tasks: strip(state.tasks), subtasks: strip(state.subtasks), series: strip(state.series) };
}

async function signedInWithSettings() {
  const ctx = setup();
  await ctx.alice.mutation(api.planner.init, { timeZone: "UTC" });
  return ctx;
}

describe("planner functions", () => {
  it("refuses signed-out callers", async () => {
    const { t } = setup();
    await expect(t.query(api.planner.load, { from: TODAY })).rejects.toThrow("Not signed in");
    await expect(t.mutation(api.planner.apply, { ops: [] })).rejects.toThrow("Not signed in");
  });

  it("creates settings once, in the user's zone", async () => {
    const { alice } = setup();
    expect((await alice.query(api.planner.load, { from: TODAY })).settings).toBeNull();
    await alice.mutation(api.planner.init, { timeZone: "Europe/Paris" });
    await alice.mutation(api.planner.init, { timeZone: "Asia/Tokyo" });
    const load = await alice.query(api.planner.load, { from: TODAY });
    expect(load.settings?.timeZone).toBe("Europe/Paris");
    expect(load.settings?.features.dailyPlanning).toBe(true);
  });

  it("applies ops and ends up where the client's optimistic copy did", async () => {
    const { alice } = await signedInWithSettings();
    let state = toState(await alice.query(api.planner.load, { from: TODAY }));
    const batches: Op[][] = [];
    const a = createTask(state, { title: "Plant beans", date: TODAY, estimate: 30, subtasks: ["Dig", "Water"] });
    batches.push(a.ops);
    state = applyOps(state, a.ops);
    const b = createTask(state, { title: "Buy seeds", date: null });
    batches.push(b.ops);
    state = applyOps(state, b.ops);
    batches.push(moveTask(state, b.id, { date: TODAY, index: 0 }));
    state = applyOps(state, batches.at(-1)!);
    batches.push(setDone(state, a.id, true));
    state = applyOps(state, batches.at(-1)!);
    batches.push(deleteTask(b.id, 1));
    state = applyOps(state, batches.at(-1)!);

    for (const ops of batches) await alice.mutation(api.planner.apply, { ops: ops as never });
    const server = toState(await alice.query(api.planner.load, { from: TODAY }));
    expect(stable(server)).toEqual(stable(state));
    expect(server.tasks[a.id]!.actual).toBe(30);
    expect(server.tasks[b.id]!.deletedAt).toBe(1);
  });

  it("keeps each user's data to themselves", async () => {
    const { alice, bob } = await signedInWithSettings();
    await bob.mutation(api.planner.init, { timeZone: "UTC" });
    const state = toState(await alice.query(api.planner.load, { from: TODAY }));
    const a = createTask(state, { title: "Alice's secret", date: TODAY });
    await alice.mutation(api.planner.apply, { ops: a.ops as never });
    // Bob can't see it, and his patch with the same id touches nothing of Alice's.
    expect((await bob.query(api.planner.load, { from: TODAY })).tasks).toHaveLength(0);
    await bob.mutation(api.planner.apply, { ops: [{ kind: "patch", table: "tasks", id: a.id, fields: { title: "Hacked" } }] as never });
    const after = await alice.query(api.planner.load, { from: TODAY });
    expect(after.tasks[0]!.title).toBe("Alice's secret");
  });

  it("rejects records that don't match the schema", async () => {
    const { alice } = await signedInWithSettings();
    await expect(
      alice.mutation(api.planner.apply, { ops: [{ kind: "patch", table: "tasks", id: "x", fields: { done: "yes" } }] as never }),
    ).rejects.toThrow();
  });

  it("settings ops update the user's settings", async () => {
    const { alice } = await signedInWithSettings();
    await alice.mutation(api.planner.apply, { ops: [{ kind: "settings", fields: { theme: "dark", workloadLimit: 360 } }] });
    const load = await alice.query(api.planner.load, { from: TODAY });
    expect(load.settings?.theme).toBe("dark");
    expect(load.settings?.workloadLimit).toBe(360);
  });

  it("makes repeat instances once per series and day", async () => {
    const { alice } = await signedInWithSettings();
    let state = toState(await alice.query(api.planner.load, { from: TODAY }));
    const a = createTask(state, { title: "Stretch", date: TODAY });
    state = applyOps(state, a.ops);
    const ops = [...a.ops, ...makeRepeating(state, a.id, "FREQ=DAILY", TODAY)];
    await alice.mutation(api.planner.apply, { ops: ops as never });
    await alice.mutation(api.planner.ensureInstances, { from: TODAY, to: "2026-11-04" });
    await alice.mutation(api.planner.ensureInstances, { from: TODAY, to: "2026-11-04" });
    const load = await alice.query(api.planner.load, { from: TODAY });
    const dates = load.tasks.filter((t) => t.title === "Stretch").map((t) => t.date).sort();
    expect(dates).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
  });

  it("loads undated tasks and Trash, and dated tasks from the window", async () => {
    const { alice } = await signedInWithSettings();
    const state = toState(await alice.query(api.planner.load, { from: TODAY }));
    const old = createTask(state, { title: "Old", date: "2026-01-01" });
    const dump = createTask(state, { title: "Someday", date: null });
    await alice.mutation(api.planner.apply, { ops: [...old.ops, ...dump.ops] as never });
    const recent = await alice.query(api.planner.load, { from: TODAY });
    expect(recent.tasks.map((t) => t.title)).toEqual(["Someday"]);
    const wide = await alice.query(api.planner.load, { from: "2025-12-01" });
    expect(wide.tasks.map((t) => t.title).sort()).toEqual(["Old", "Someday"]);
  });
});
