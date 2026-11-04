import { v } from "convex/values";
import { internalAction, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { diffDays, todayIn } from "../packages/core/src/dates";
import { getSettings } from "./lib";
import type { OpInput } from "./validators";

/**
 * Product analytics events sent to PostHog from the server, so ad blockers
 * can't drop them: `signed_up` (planner.init), `activated` and `day_planned`
 * (notePlanning, from the app's and the MCP server's writes),
 * `checkout_started` (billing.checkout), and `paid` and
 * `subscription_cancelled` (the Stripe webhook, billing.recordPayment and
 * billing.recordCancellation). Each uses the Clerk user id as `distinct_id`,
 * the same id the web app passes to `posthog.identify`.
 *
 * Mutations can't call out, so they schedule `capture`, which runs only once
 * the mutation commits. Actions schedule it the same way.
 */

/** The Beans PostHog project's key. Project keys are public; POSTHOG_KEY on the deployment overrides it. */
const POSTHOG_KEY = "phc_oTVJqqGLymrJWnYEoP7DhsXuzJfChFjckndhGicuPtir";
const POSTHOG_CAPTURE_URL = "https://us.i.posthog.com/i/v0/e/";

/** Hosted deployments only: local backends and tests have no https Convex URL, so they send nothing. */
function postHogKey(): string | null {
  if (!/^https:\/\//.test(process.env.CONVEX_CLOUD_URL ?? "")) return null;
  return process.env.POSTHOG_KEY ?? POSTHOG_KEY;
}

export type AnalyticsEvent = "signed_up" | "activated" | "day_planned" | "checkout_started" | "paid" | "subscription_cancelled";

/** Person properties for an event: PostHog's `$set` and `$set_once` (Convex values can't hold `$` keys). */
export type PersonProperties = { set?: Record<string, string>; setOnce?: Record<string, string> };

/** Schedules an event, from a mutation or an action. */
export async function track(
  ctx: Pick<MutationCtx, "scheduler">,
  event: AnalyticsEvent,
  distinctId: string,
  properties: Record<string, unknown> = {},
  person: PersonProperties = {},
) {
  await ctx.scheduler.runAfter(0, internal.analytics.capture, { event, distinctId, properties: { product: "beans", ...properties }, ...person });
}

const personFields = v.optional(v.record(v.string(), v.string()));

export const capture = internalAction({
  args: { event: v.string(), distinctId: v.string(), properties: v.any(), set: personFields, setOnce: personFields },
  handler: async (_ctx, { event, distinctId, properties, set, setOnce }) => {
    const key = postHogKey();
    if (!key) return;
    const res = await fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, ...(set ? { $set: set } : {}), ...(setOnce ? { $set_once: setOnce } : {}) },
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

/** The day a planning write puts its task on. */
function plannedDate(op: OpInput): string {
  const fields = op.kind === "put" ? op.record : op.kind === "patch" ? op.fields : {};
  return String((fields as { date?: string }).date);
}

/** Today in the user's time zone, falling back to UTC so a bad zone can't fail a write. */
function todayFor(settings: Doc<"userSettings">, now: number): string {
  try {
    return todayIn(settings.timeZone, now);
  } catch {
    return todayIn("UTC", now);
  }
}

/**
 * Notes a write that plans a day: adding a task to a day, or moving one
 * there from the Brain Dump, a list or another day, in the app or through a
 * connected AI app. Rollover and repeat instances are made on the server
 * and don't come through here. Call it before applying `ops`.
 *
 * - `activated`: the first time a user plans a day. The time is kept on the
 *   user's settings (`activatedAt`) so it fires once. Accounts that planned
 *   days before this shipped are marked without an event.
 * - `day_planned`: at most once per calendar day in the user's time zone,
 *   guarded by `lastDayPlannedOn`. It fires on the activation day too.
 *   `planned_for` is the task's day and `days_ahead` its distance from today.
 */
export async function notePlanning(ctx: MutationCtx, userId: string, ops: OpInput[], source: "app" | "mcp", now: number) {
  const planning = ops.find(plansDay);
  if (!planning) return;
  const settings = await getSettings(ctx, userId);
  if (!settings) return;
  const today = todayFor(settings, now);
  const firstTime = !settings.activatedAt;
  const newDay = settings.lastDayPlannedOn !== today;
  if (!firstTime && !newDay) return;
  await ctx.db.patch(settings._id, { ...(firstTime ? { activatedAt: now } : {}), ...(newDay ? { lastDayPlannedOn: today } : {}) });
  if (firstTime) {
    const earlier = await ctx.db
      .query("tasks")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gt("date", ""))
      .filter((q) => q.eq(q.field("seriesId"), null))
      .first();
    if (!earlier) await track(ctx, "activated", userId, { source });
  }
  if (newDay) {
    const plannedFor = plannedDate(planning);
    await track(ctx, "day_planned", userId, { planned_for: plannedFor, source, days_ahead: diffDays(plannedFor, today) });
  }
}
