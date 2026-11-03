import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { stableUserId } from "./lib";

const CLIENT_TABLES = ["tasks", "subtasks", "lists", "labels", "templates", "recurringSeries", "timeEntries", "attachments"] as const;
const TABLES = [...CLIENT_TABLES, "userSettings", "billing"] as const;
const PAGE = 100;

const isLegacy = (userId: string) => userId !== stableUserId(userId);

/** Of two billing rows for one account, the one to keep: a subscription beats a customer beats nothing, then the older row. */
function billingWinner(a: Doc<"billing">, b: Doc<"billing">) {
  const rank = (r: Doc<"billing">) => (r.subscriptionId ? 2 : r.customerId ? 1 : 0);
  if (rank(a) !== rank(b)) return rank(a) > rank(b) ? a : b;
  return a._creationTime <= b._creationTime ? a : b;
}

/**
 * Moves every row stored under `from` to `to`, in one transaction, so a
 * user's data never sits half under each id. Running it again moves nothing.
 * A record saved under both ids keeps its later edit; two settings rows keep
 * the older one (the account's own); two billing rows keep the one with the
 * subscription, and the trial and free days stay used if either row used them.
 */
export async function moveUser(ctx: MutationCtx, from: string, to: string): Promise<number> {
  if (from === to) return 0;
  let moved = 0;
  for (const table of CLIENT_TABLES) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_user_client", (q) => q.eq("userId", from))
      .collect();
    for (const row of rows) {
      const twin = await ctx.db
        .query(table)
        .withIndex("by_user_client", (q) => q.eq("userId", to).eq("clientId", row.clientId))
        .unique();
      if (twin && twin.updatedAt >= row.updatedAt) {
        await ctx.db.delete(row._id);
        continue;
      }
      if (twin) await ctx.db.delete(twin._id);
      await ctx.db.patch(row._id, { userId: to });
      moved++;
    }
  }

  const oldSettings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q) => q.eq("userId", from))
    .unique();
  if (oldSettings) {
    const twin = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", to))
      .unique();
    if (twin && twin._creationTime < oldSettings._creationTime) await ctx.db.delete(oldSettings._id);
    else {
      if (twin) await ctx.db.delete(twin._id);
      await ctx.db.patch(oldSettings._id, { userId: to });
      moved++;
    }
  }

  const oldBilling = await ctx.db
    .query("billing")
    .withIndex("by_user", (q) => q.eq("userId", from))
    .unique();
  if (oldBilling) {
    const twin = await ctx.db
      .query("billing")
      .withIndex("by_user", (q) => q.eq("userId", to))
      .unique();
    const keep = twin ? billingWinner(oldBilling, twin) : oldBilling;
    const drop = keep === oldBilling ? twin : oldBilling;
    if (drop) await ctx.db.delete(drop._id);
    await ctx.db.patch(keep._id, {
      userId: to,
      trialUsed: oldBilling.trialUsed || Boolean(twin?.trialUsed),
      passEnd: keep.passEnd ?? drop?.passEnd ?? null,
    });
    moved++;
  }
  return moved;
}

/**
 * Rewrites `userId` from the old `<issuer>|<subject>` form to the Clerk user
 * id on every table, one user per transaction. Each run reads a page, moves
 * the first old-form user it finds (all their tables at once), and schedules
 * the next run. Safe to start again at any time. Start it with
 * `npx convex run migrations:toStableUserIds`, then check with
 * `npx convex run migrations:userIdForms`.
 */
export const toStableUserIds = internalMutation({
  args: { table: v.optional(v.number()), cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { table = 0, cursor = null }) => {
    const name = TABLES[table];
    if (!name) return { done: true };
    const page = await ctx.db.query(name).paginate({ cursor, numItems: PAGE });
    const legacy = page.page.find((row) => isLegacy(row.userId));
    if (legacy) {
      const moved = await moveUser(ctx, legacy.userId, stableUserId(legacy.userId));
      console.log(`moved ${moved} rows to ${stableUserId(legacy.userId)}`);
      await ctx.scheduler.runAfter(0, internal.migrations.toStableUserIds, { table, cursor });
    } else if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.toStableUserIds, { table, cursor: page.continueCursor });
    } else {
      await ctx.scheduler.runAfter(0, internal.migrations.toStableUserIds, { table: table + 1, cursor: null });
    }
    return { done: false };
  },
});

/** Rows per table, and how many still use the old id form. Reads whole tables, so it's for checking a migration while tables are small. */
export const userIdForms = internalQuery({
  args: {},
  handler: async (ctx) => {
    const counts: Record<string, { rows: number; legacy: number; users: number }> = {};
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect();
      counts[table] = {
        rows: rows.length,
        legacy: rows.filter((r) => isLegacy(r.userId)).length,
        users: new Set(rows.map((r) => stableUserId(r.userId))).size,
      };
    }
    return counts;
  },
});
