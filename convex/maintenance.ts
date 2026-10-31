import { v } from "convex/values";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { addDays, todayIn } from "../packages/core/src/dates";
import { rolloverOps, ROLLOVER_MAX_DAYS } from "../packages/core/src/rollover";
import { TRASH_DAYS } from "../packages/core/src/trash";
import { getSettings, requireUser, stateWith, toRecord, toSettings } from "./lib";
import { applyOne } from "./planner";
import type { OpInput } from "./validators";

const DAY_MS = 86_400_000;
const BATCH = 50;

/**
 * Once per local day for each user: roll unfinished tasks onto today and
 * remove Trash older than 30 days. Records the day in `lastRollover`, so
 * running it again the same day does nothing.
 */
export async function dailyForUser(ctx: MutationCtx, settings: Doc<"userSettings">, now: number): Promise<boolean> {
  const today = todayIn(settings.timeZone, now);
  if (settings.lastRollover === today) return false;
  const userId = settings.userId;

  const state = stateWith(toSettings(settings));
  const recent = await ctx.db
    .query("tasks")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", addDays(today, -ROLLOVER_MAX_DAYS)).lte("date", today))
    .collect();
  for (const t of recent) state.tasks[t.clientId] = toRecord(t);
  for (const op of rolloverOps(state, today)) await applyOne(ctx, userId, op as OpInput, now);

  const cutoff = now - TRASH_DAYS * DAY_MS;
  const expired = await ctx.db
    .query("tasks")
    .withIndex("by_user_deleted", (q) => q.eq("userId", userId).gt("deletedAt", 0).lte("deletedAt", cutoff))
    .collect();
  for (const t of expired) {
    const subs = await ctx.db.query("subtasks").withIndex("by_user_task", (q) => q.eq("userId", userId).eq("taskId", t.clientId)).collect();
    for (const s of subs) await ctx.db.delete(s._id);
    await ctx.db.delete(t._id);
  }
  for (const table of ["lists", "templates", "recurringSeries"] as const) {
    const rows = await ctx.db.query(table).withIndex("by_user_client", (q) => q.eq("userId", userId)).collect();
    for (const r of rows) if (r.deletedAt !== null && r.deletedAt <= cutoff) await ctx.db.delete(r._id);
  }
  return true;
}

/** Runs today's rollover for the signed-in user, if it hasn't run yet. Called when the app opens. */
export const rolloverNow = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const settings = await getSettings(ctx, userId);
    if (!settings) return false;
    return await dailyForUser(ctx, settings, Date.now());
  },
});

/** Walks every user in batches. The cron starts it; each batch schedules the next. */
export const dailyBatch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const now = Date.now();
    const page = await ctx.db.query("userSettings").paginate({ cursor, numItems: BATCH });
    let ran = 0;
    for (const settings of page.page) if (await dailyForUser(ctx, settings, now)) ran++;
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.maintenance.dailyBatch, { cursor: page.continueCursor });
    return { ran, done: page.isDone };
  },
});
