import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { createTask, deleteTask, emptyState, type BeansState } from "../packages/core/src";

const modules = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<unknown>> }).glob("./**/*.ts");

afterEach(() => vi.useRealTimers());

async function userWithTasks(timeZone: string, setup: (s: BeansState) => { ops: unknown[] }[]) {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject: "u", tokenIdentifier: "test|u" });
  await user.mutation(api.planner.init, { timeZone });
  const load = await user.query(api.planner.load, { from: "2026-01-01" });
  const state = emptyState(load.settings!);
  for (const { ops } of setup(state)) await user.mutation(api.planner.apply, { ops: ops as never });
  return { t, user };
}

describe("daily rollover and Trash cleanup", () => {
  it("moves yesterday's unfinished tasks to today, once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 31, 9));
    const { user } = await userWithTasks("UTC", (s) => [createTask(s, { title: "Late", date: "2026-10-30" })]);
    expect(await user.mutation(api.maintenance.rolloverNow, {})).toBe(true);
    expect(await user.mutation(api.maintenance.rolloverNow, {})).toBe(false);
    const load = await user.query(api.planner.load, { from: "2026-10-01" });
    expect(load.tasks[0]).toMatchObject({ title: "Late", date: "2026-10-31", rolledFrom: "2026-10-30" });
    expect(load.settings?.lastRollover).toBe("2026-10-31");
  });

  it("follows each user's own midnight", async () => {
    vi.useFakeTimers();
    // 16:30 UTC on Oct 31 is already Nov 1 in Tokyo, but still Oct 31 in Los Angeles.
    vi.setSystemTime(Date.UTC(2026, 9, 31, 16, 30));
    const tokyo = await userWithTasks("Asia/Tokyo", (s) => [createTask(s, { title: "Tokyo task", date: "2026-10-31" })]);
    await tokyo.t.mutation(internal.maintenance.dailyBatch, { cursor: null });
    const t1 = await tokyo.user.query(api.planner.load, { from: "2026-10-01" });
    expect(t1.tasks[0]!.date).toBe("2026-11-01");

    const la = await userWithTasks("America/Los_Angeles", (s) => [createTask(s, { title: "LA task", date: "2026-10-31" })]);
    await la.t.mutation(internal.maintenance.dailyBatch, { cursor: null });
    const l1 = await la.user.query(api.planner.load, { from: "2026-10-01" });
    expect(l1.tasks[0]!.date).toBe("2026-10-31");
  });

  it("removes Trash older than 30 days and keeps newer Trash", async () => {
    vi.useFakeTimers();
    const now = Date.UTC(2026, 9, 31, 9);
    vi.setSystemTime(now);
    const { user } = await userWithTasks("UTC", (s) => {
      const old = createTask(s, { title: "Old trash", date: null, subtasks: ["piece"] });
      const fresh = createTask(s, { title: "Fresh trash", date: null });
      return [old, fresh, { ops: deleteTask(old.id, now - 31 * 86_400_000) }, { ops: deleteTask(fresh.id, now - 2 * 86_400_000) }];
    });
    await user.mutation(api.maintenance.rolloverNow, {});
    const load = await user.query(api.planner.load, { from: "2026-10-01" });
    expect(load.tasks.map((t) => t.title)).toEqual(["Fresh trash"]);
    expect(load.subtasks).toHaveLength(0);
  });

  it("pages through many users", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 31, 9));
    const t = convexTest(schema, modules);
    for (let i = 0; i < 60; i++) {
      await t.withIdentity({ subject: `u${i}`, tokenIdentifier: `test|u${i}` }).mutation(api.planner.init, { timeZone: "UTC" });
    }
    await t.mutation(internal.maintenance.dailyBatch, { cursor: null });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const pending = await t.run(async (ctx) => (await ctx.db.query("userSettings").collect()).filter((s) => s.lastRollover !== "2026-10-31").length);
    expect(pending).toBe(0);
  });
});
