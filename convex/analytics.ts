import { v } from "convex/values";
import { internalAction, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getSettings } from "./lib";
import type { OpInput } from "./validators";

/**
 * Product analytics events sent to PostHog from the server, so ad blockers
 * can't drop them: `signed_up` (planner.init), `activated` (noteActivation,
 * from the app's and the MCP server's writes) and `paid` (the Stripe
 * webhook, billing.recordPayment). Each uses the Clerk user id as
 * `distinct_id`, the same id the web app passes to `posthog.identify`.
 *
 * Mutations can't call out, so they schedule `capture`, which runs only once
 * the mutation commits.
 */

/** The Beans PostHog project's key. Project keys are public; POSTHOG_KEY on the deployment overrides it. */
const POSTHOG_KEY = "phc_oTVJqqGLymrJWnYEoP7DhsXuzJfChFjckndhGicuPtir";
const POSTHOG_CAPTURE_URL = "https://us.i.posthog.com/i/v0/e/";

/** Hosted deployments only: local backends and tests have no https Convex URL, so they send nothing. */
function postHogKey(): string | null {
  if (!/^https:\/\//.test(process.env.CONVEX_CLOUD_URL ?? "")) return null;
  return process.env.POSTHOG_KEY ?? POSTHOG_KEY;
}

export type AnalyticsEvent = "signed_up" | "activated" | "paid";

/** Schedules an event. `set` becomes PostHog's `$set` person properties (Convex values can't hold `$` keys). */
export async function track(ctx: MutationCtx, event: AnalyticsEvent, distinctId: string, properties: Record<string, unknown> = {}, set?: Record<string, string>) {
  await ctx.scheduler.runAfter(0, internal.analytics.capture, { event, distinctId, properties: { product: "beans", ...properties }, set });
}

export const capture = internalAction({
  args: { event: v.string(), distinctId: v.string(), properties: v.any(), set: v.optional(v.record(v.string(), v.string())) },
  handler: async (_ctx, { event, distinctId, properties, set }) => {
    const key = postHogKey();
    if (!key) return;
    const res = await fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: set ? { ...properties, $set: set } : properties,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) console.error(`PostHog ${event} failed: ${res.status}`);
  },
});

/** True for a write that puts a live task on a day: a new or replaced task with a date, or a date set on one. */
export function plansDay(op: OpInput): boolean {
  if (op.kind === "put" && op.table === "tasks") {
    const task = op.record as { date?: string | null; deletedAt: number | null };
    return typeof task.date === "string" && task.deletedAt === null;
  }
  if (op.kind === "patch" && op.table === "tasks") return typeof (op.fields as { date?: string | null }).date === "string";
  return false;
}

/**
 * `activated`: the first time a user plans a day, by adding a task to a day
 * or moving one there from the Brain Dump or a list, in the app or through a
 * connected AI app. Call it before applying `ops`. The time is kept on the
 * user's settings so it fires once. Accounts that planned days before this
 * shipped are marked without an event.
 */
export async function noteActivation(ctx: MutationCtx, userId: string, ops: OpInput[], source: "app" | "mcp", now: number) {
  if (!ops.some(plansDay)) return;
  const settings = await getSettings(ctx, userId);
  if (!settings || settings.activatedAt) return;
  await ctx.db.patch(settings._id, { activatedAt: now });
  const earlier = await ctx.db
    .query("tasks")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).gt("date", ""))
    .filter((q) => q.eq(q.field("seriesId"), null))
    .first();
  if (!earlier) await track(ctx, "activated", userId, { source });
}
