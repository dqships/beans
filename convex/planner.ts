import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { TableNames } from "./_generated/dataModel";
import { addDays } from "../packages/core/src/dates";
import { ensureInstances as coreEnsureInstances } from "../packages/core/src/repeat";
import type { Op } from "../packages/core/src/ops";
import { defaultSettings } from "../packages/core/src/settings";
import type { RecordOf, TableName } from "../packages/core/src/model";
import { requireAccess } from "./billing";
import { findByClientId, getSettings, requireUser, stateWith, toRecord, toSettings } from "./lib";
import { moveUser } from "./migrations";
import { DB_TABLE, opValidator, settingsFields, type ClientTable, type OpInput } from "./validators";

/** How far back dated tasks load by default, in days. Older days load on request. */
export const DEFAULT_WINDOW = 120;

/**
 * Everything the planner shows: settings, lists, labels, templates, repeats,
 * undated tasks, Trash, and dated tasks from `from` onward.
 */
export const load = query({
  args: { from: v.string() },
  handler: async (ctx, { from }) => {
    const userId = await requireUser(ctx);
    const settings = await getSettings(ctx, userId);

    const [dated, undated, trashed, lists, labels, templates, series, subtasks, entries] = await Promise.all([
      ctx.db.query("tasks").withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from)).collect(),
      ctx.db.query("tasks").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", null)).collect(),
      ctx.db.query("tasks").withIndex("by_user_deleted", (q) => q.eq("userId", userId).gt("deletedAt", 0)).collect(),
      ctx.db.query("lists").withIndex("by_user_client", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("labels").withIndex("by_user_client", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("templates").withIndex("by_user_client", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("recurringSeries").withIndex("by_user_client", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("subtasks").withIndex("by_user_task", (q) => q.eq("userId", userId)).collect(),
      ctx.db
        .query("timeEntries")
        .withIndex("by_user_started", (q) => q.eq("userId", userId).gte("startedAt", Date.parse(`${from}T00:00:00Z`)))
        .collect(),
    ]);

    const tasks = new Map<string, RecordOf<"tasks">>();
    for (const doc of [...dated, ...undated, ...trashed]) tasks.set(doc.clientId, toRecord(doc));
    const taskIds = new Set(tasks.keys());

    const result: LoadResult = {
      settings: settings ? toSettings(settings) : null,
      tasks: [...tasks.values()],
      subtasks: subtasks.filter((s) => taskIds.has(s.taskId)).map((d) => toRecord(d)),
      lists: lists.map((d) => toRecord(d)),
      labels: labels.map((d) => toRecord(d)),
      templates: templates.map((d) => toRecord(d)),
      series: series.map((d) => toRecord(d)),
      timeEntries: entries.map((d) => toRecord(d)),
    };
    return result;
  },
});

/**
 * Creates the user's settings on first sign-in, in their time zone. An
 * account whose rows are still under the old token-identifier id is moved to
 * the stable id instead, so it keeps its data before the migration reaches it.
 */
export const init = mutation({
  args: { timeZone: v.string() },
  handler: async (ctx, { timeZone }) => {
    const userId = await requireUser(ctx);
    if (await getSettings(ctx, userId)) return;
    const identity = (await ctx.auth.getUserIdentity())!;
    await moveUser(ctx, identity.tokenIdentifier, userId);
    if (await getSettings(ctx, userId)) return;
    const { id, ...fields } = defaultSettings(timeZone, Date.now());
    void id;
    await ctx.db.insert("userSettings", { userId, ...fields });
  },
});

export async function applyOne(ctx: MutationCtx, userId: string, op: OpInput, now: number) {
  if (op.kind === "settings") {
    const existing = await getSettings(ctx, userId);
    if (!existing) throw new Error("Settings aren't set up yet");
    await ctx.db.patch(existing._id, { ...op.fields, updatedAt: now });
    return;
  }
  const table = op.table as ClientTable;
  const name = DB_TABLE[table] as Exclude<TableNames, "userSettings" | "attachments">;
  if (op.kind === "put") {
    const { id, ...fields } = op.record;
    const existing = await findByClientId(ctx, table, userId, id);
    const doc = { ...fields, userId, clientId: id, updatedAt: now };
    if (existing) await ctx.db.replace(existing._id, doc as never);
    else await ctx.db.insert(name, doc as never);
    return;
  }
  const existing = await findByClientId(ctx, table, userId, op.id);
  // Records that are gone are skipped, so a late retry or undo can't fail the batch.
  if (!existing) return;
  if (op.kind === "patch") await ctx.db.patch(existing._id, { ...op.fields, updatedAt: now } as never);
  else await ctx.db.delete(existing._id);
}

/**
 * Applies a batch of ops in one transaction. The client already applied the
 * same ops optimistically, so the screen and the database end up the same.
 */
export const apply = mutation({
  args: { ops: v.array(opValidator) },
  handler: async (ctx, { ops }) => {
    const userId = await requireUser(ctx);
    if (ops.length > 500) throw new Error("Too many changes at once");
    await requireAccess(ctx, userId);
    const now = Date.now();
    for (const op of ops) await applyOne(ctx, userId, op, now);
  },
});

/** Makes repeating-task instances for a range of days. Safe to call repeatedly. */
export const ensureInstances = mutation({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const userId = await requireUser(ctx);
    if (to < from || to > addDays(from, 62)) throw new Error("Range too large");
    await ensureForUser(ctx, userId, from, to);
  },
});

export async function ensureForUser(ctx: MutationCtx, userId: string, from: string, to: string) {
  const settingsDoc = await getSettings(ctx, userId);
  const state = stateWith(settingsDoc ? toSettings(settingsDoc) : null);
  const series = await ctx.db.query("recurringSeries").withIndex("by_user_client", (q) => q.eq("userId", userId)).collect();
  const live = series.filter((s) => s.deletedAt === null);
  if (!live.length) return 0;
  for (const s of live) state.series[s.clientId] = toRecord(s);
  for (const s of live) {
    const instances = await ctx.db
      .query("tasks")
      .withIndex("by_user_series_date", (q) => q.eq("userId", userId).eq("seriesId", s.clientId).gte("seriesDate", from))
      .collect();
    for (const t of instances) state.tasks[t.clientId] = toRecord(t);
  }
  const days = await ctx.db
    .query("tasks")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from).lte("date", to))
    .collect();
  for (const t of days) state.tasks[t.clientId] = toRecord(t);
  const ops = coreEnsureInstances(state, from, to, Date.now());
  const now = Date.now();
  for (const op of ops) await applyOne(ctx, userId, op as OpInput, now);
  return ops.length;
}

export type LoadResult = {
  settings: ReturnType<typeof toSettings> | null;
} & { [K in TableName]: RecordOf<K>[] };


export type { Op };
void settingsFields;
