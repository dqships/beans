import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query, type ActionCtx, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  BASE_OFFER,
  describeOffer,
  grantsAccess,
  openAt,
  PASS_DAYS,
  pickPromos,
  planForPrice,
  promoCodes,
  PROMO_PLAN,
  readPromo,
  STRIPE_IDS,
  stripeMode,
  type BillingStatus,
  type Offer,
  type PlanId,
  type Promo,
  type StripePromotionCode,
  TRIAL_DAYS,
} from "../packages/core/src/billing";
import { getSettings, requireUser, stableUserId } from "./lib";
import { stripeClient, subscriptionFields, type StripeCall, type StripeObject, type SubscriptionFields } from "./stripe";

/**
 * Subscriptions. Stripe Checkout starts one (with a 7-day trial, card up
 * front), the Stripe webhook keeps the `billing` row current, and the planner
 * stays open while the row's status is trialing, active or past_due.
 *
 * Billing is enforced only when STRIPE_SECRET_KEY is set on the deployment,
 * so local backends and tests without Stripe keep the planner open.
 */
export const billingEnforced = () => Boolean(process.env.STRIPE_SECRET_KEY);

function stripe(): { call: StripeCall; ids: (typeof STRIPE_IDS)["test"] } {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConvexError("Payments aren't set up yet");
  return { call: stripeClient(key), ids: STRIPE_IDS[stripeMode(key)] };
}

async function rowFor(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("billing")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** True while a subscription or the no-card free days keep the planner open. */
function rowOpen(row: Doc<"billing"> | null, now: number): boolean {
  return openAt({ enforced: billingEnforced(), status: row?.status ?? null, passEnd: row?.passEnd ?? null }, now);
}

/** True when this user may change their planner. */
export async function hasAccess(ctx: QueryCtx | MutationCtx, userId: string): Promise<boolean> {
  return rowOpen(await rowFor(ctx, userId), Date.now());
}

/**
 * Throws for a locked planner, so writes can't get round the paywall. An
 * account that has never subscribed can write while onboarding is active: it
 * plans its first day, then meets the paywall. Finishing or skipping
 * onboarding ends that, and a locked account can't set it active again.
 */
export async function requireAccess(ctx: QueryCtx | MutationCtx, userId: string) {
  const row = await rowFor(ctx, userId);
  if (rowOpen(row, Date.now())) return;
  if (!row?.status && (await getSettings(ctx, userId))?.onboarding?.status === "active") return;
  throw new ConvexError("A subscription is needed to change your planner");
}

function toStatus(row: Doc<"billing"> | null): BillingStatus {
  return {
    enforced: billingEnforced(),
    access: rowOpen(row, Date.now()),
    status: row?.status ?? null,
    plan: planForPrice(row?.priceId),
    trialEnd: row?.trialEnd ?? null,
    periodEnd: row?.periodEnd ?? null,
    cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
    discountPercent: row?.discountPercent ?? null,
    discountEnd: row?.discountEnd ?? null,
    trialAvailable: !row?.trialUsed,
    passEnd: row?.passEnd ?? null,
    passAvailable: !row?.passEnd && !row?.status && !row?.trialUsed,
    hasCustomer: Boolean(row?.customerId),
  };
}

export const status = query({
  args: {},
  handler: async (ctx): Promise<BillingStatus> => {
    const userId = await requireUser(ctx);
    return toStatus(await rowFor(ctx, userId));
  },
});

/** Starts the no-card free days. A new account gets them once, before any subscription. */
export const startPass = mutation({
  args: {},
  handler: async (ctx): Promise<BillingStatus> => {
    const userId = await requireUser(ctx);
    if (!billingEnforced()) throw new ConvexError("Payments aren't set up yet");
    const row = await rowFor(ctx, userId);
    if (row?.passEnd || row?.status || row?.trialUsed) throw new ConvexError("The free days are only for a new account");
    const now = Date.now();
    const passEnd = now + PASS_DAYS * 86_400_000;
    if (row) await ctx.db.patch(row._id, { passEnd, updatedAt: now });
    else await ctx.db.insert("billing", { ...emptyRow(userId, now), passEnd });
    return toStatus(await rowFor(ctx, userId));
  },
});

export const getRow = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => await rowFor(ctx, userId),
});

function emptyRow(userId: string, now: number) {
  return {
    userId,
    customerId: null,
    subscriptionId: null,
    status: null,
    priceId: null,
    trialEnd: null,
    periodEnd: null,
    cancelAtPeriodEnd: false,
    trialUsed: false,
    updatedAt: now,
  };
}

/** Keeps the first customer made for a user, so two checkouts at once can't split them. Returns the kept one. */
export const setCustomer = internalMutation({
  args: { userId: v.string(), customerId: v.string() },
  handler: async (ctx, { userId, customerId }) => {
    const row = await rowFor(ctx, userId);
    if (row?.customerId) return row.customerId;
    if (row) await ctx.db.patch(row._id, { customerId, updatedAt: Date.now() });
    else await ctx.db.insert("billing", { ...emptyRow(userId, Date.now()), customerId });
    return customerId;
  },
});

const subscriptionArgs = {
  subscriptionId: v.string(),
  customerId: v.string(),
  status: v.string(),
  priceId: v.union(v.string(), v.null()),
  trialEnd: v.union(v.number(), v.null()),
  periodEnd: v.union(v.number(), v.null()),
  cancelAtPeriodEnd: v.boolean(),
  discountPercent: v.union(v.number(), v.null()),
  discountEnd: v.union(v.number(), v.null()),
};

/**
 * Stores a subscription Stripe reported, found by the user it names or by its
 * customer. A subscription that has ended never replaces a different one that
 * still keeps the planner open. Checkouts from before the stable user id name
 * the user in the old `<issuer>|<subject>` form, which is read as the new one.
 */
export const saveSubscription = internalMutation({
  args: { userId: v.union(v.string(), v.null()), sub: v.object(subscriptionArgs) },
  handler: async (ctx, { userId: named, sub }) => {
    const userId = named === null ? null : stableUserId(named);
    const row =
      (userId ? await rowFor(ctx, userId) : null) ??
      (await ctx.db
        .query("billing")
        .withIndex("by_customer", (q) => q.eq("customerId", sub.customerId))
        .first());
    const now = Date.now();
    const fields = { ...sub, trialUsed: true, updatedAt: now };
    if (!row) {
      if (!userId) return "unknown";
      await ctx.db.insert("billing", { ...emptyRow(userId, now), ...fields });
      return "saved";
    }
    if (row.subscriptionId && row.subscriptionId !== sub.subscriptionId && grantsAccess(row.status) && !grantsAccess(sub.status)) return "kept";
    await ctx.db.patch(row._id, fields);
    return "saved";
  },
});

/** A subscription Beans sold: tagged at checkout, or on one of its prices. */
export function isBeansSubscription(sub: StripeObject): boolean {
  if (sub.metadata?.app === "beans") return true;
  return Boolean(planForPrice(sub.items?.data?.[0]?.price?.id));
}

/** Reads the subscription fresh from Stripe and stores it. Event order then doesn't matter. */
export async function syncSubscription(ctx: ActionCtx, call: StripeCall, subscriptionId: string, userId: string | null) {
  const sub = await call("GET", `/v1/subscriptions/${subscriptionId}`);
  if (!isBeansSubscription(sub)) return "ignored";
  const fields: SubscriptionFields = subscriptionFields(sub);
  return await ctx.runMutation(internal.billing.saveSubscription, { userId: userId ?? sub.metadata?.user_id ?? null, sub: fields });
}

/** Only our own pages may be the way back from Stripe. */
function checkOrigin(origin: string): string {
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) throw new ConvexError("Bad return address");
  return origin;
}

// Launch offers, cached briefly so the claimed count keeps up without asking Stripe on every page view.
const PROMO_CACHE_MS = 60_000;
const promoCache = new Map<string, { promo: Promo | null; at: number }>();

/** Forgets cached codes (tests). */
export const clearPromoCache = () => promoCache.clear();

async function loadPromos(call: StripeCall, now = Date.now()) {
  const found = await Promise.all(
    promoCodes(process.env.STRIPE_PROMO_CODES).map(async (code) => {
      const hit = promoCache.get(code);
      if (hit && now - hit.at < PROMO_CACHE_MS) return hit.promo;
      try {
        const list = await call("GET", "/v1/promotion_codes", { code, limit: 1 });
        const promo = list.data?.[0] ? readPromo(list.data[0] as StripePromotionCode, now) : null;
        promoCache.set(code, { promo, at: now });
        return promo;
      } catch (err) {
        console.error(`promotion code ${code} lookup failed`, err);
        return null;
      }
    }),
  );
  return pickPromos(found);
}

/** Prices, the launch offer running now and the finished rounds. Public: the pricing page reads it. */
export const offer = action({
  args: {},
  handler: async (): Promise<Offer> => {
    if (!billingEnforced()) return BASE_OFFER;
    return describeOffer(await loadPromos(stripe().call));
  },
});

/**
 * A Stripe Checkout Session for the signed-in user. The first subscription
 * gets the free trial; the card is always taken up front. On a first
 * monthly subscription a running launch code is applied for the buyer;
 * otherwise a first subscription gets a code box. Stripe allows one or the
 * other, not both. Coming back after cancelling gets neither.
 */
export const checkout = action({
  args: { plan: v.union(v.literal("monthly"), v.literal("yearly")), origin: v.string() },
  handler: async (ctx, { plan, origin }): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not signed in");
    const userId = identity.subject;
    const back = checkOrigin(origin);
    const { call, ids } = stripe();
    const row = await ctx.runQuery(internal.billing.getRow, { userId });
    if (grantsAccess(row?.status)) throw new ConvexError("You already have a subscription");

    let customerId = row?.customerId ?? null;
    if (!customerId) {
      const customer = await call("POST", "/v1/customers", {
        email: identity.email,
        name: identity.name,
        metadata: { app: "beans", user_id: userId, clerk_user_id: identity.subject },
      });
      customerId = await ctx.runMutation(internal.billing.setCustomer, { userId, customerId: String(customer.id) });
    }

    // Launch codes and the code box are for a first subscription only, like the trial.
    const first = !row?.trialUsed;
    const promo = first && plan === PROMO_PLAN ? (await loadPromos(call)).current : null;
    const params = checkoutParams({ plan, priceId: ids.prices[plan], customerId, userId, trial: first, origin: back });
    try {
      const session = await call("POST", "/v1/checkout/sessions", promo ? withPromo(params, promo.id) : first ? withCodeBox(params) : params);
      return { url: String(session.url) };
    } catch (err) {
      // The code ran out between the page loading and now: full price, with the code box.
      if (!promo) throw err;
      promoCache.clear();
      const session = await call("POST", "/v1/checkout/sessions", withCodeBox(params));
      return { url: String(session.url) };
    }
  },
});

export function checkoutParams({
  plan,
  priceId,
  customerId,
  userId,
  trial,
  origin,
}: {
  plan: PlanId;
  priceId: string;
  customerId: string;
  userId: string;
  trial: boolean;
  origin: string;
}) {
  const tags = { app: "beans", user_id: userId, plan };
  return {
    mode: "subscription",
    customer: customerId,
    line_items: { 0: { price: priceId, quantity: 1 } },
    payment_method_collection: "always",
    metadata: tags,
    subscription_data: {
      metadata: tags,
      ...(trial ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } } : {}),
    },
    success_url: `${origin}/app?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/app`,
  };
}

export const withPromo = (params: ReturnType<typeof checkoutParams>, promoId: string) => ({ ...params, discounts: { 0: { promotion_code: promoId } } });
export const withCodeBox = (params: ReturnType<typeof checkoutParams>) => ({ ...params, allow_promotion_codes: true });

/** After Checkout sends the buyer back: read the session so the planner opens without waiting for the webhook. */
export const confirm = action({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }): Promise<BillingStatus> => {
    const userId = await requireActionUser(ctx);
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) throw new ConvexError("Bad checkout session");
    const { call } = stripe();
    const session = await call("GET", `/v1/checkout/sessions/${sessionId}`);
    if (stableUserId(session.metadata?.user_id ?? "") !== userId) throw new ConvexError("This checkout belongs to another account");
    if (session.status === "complete" && typeof session.subscription === "string") await syncSubscription(ctx, call, session.subscription, userId);
    return toStatus(await ctx.runQuery(internal.billing.getRow, { userId }));
  },
});

/** The Stripe customer portal, where subscribers cancel, switch plans, update the card and see invoices. */
export const portal = action({
  args: { origin: v.string() },
  handler: async (ctx, { origin }): Promise<{ url: string }> => {
    const userId = await requireActionUser(ctx);
    const back = checkOrigin(origin);
    const { call, ids } = stripe();
    const row = await ctx.runQuery(internal.billing.getRow, { userId });
    if (!row?.customerId) throw new ConvexError("No subscription to manage yet");
    const session = await call("POST", "/v1/billing_portal/sessions", {
      customer: row.customerId,
      return_url: `${back}/app`,
      ...(ids.portalConfiguration ? { configuration: ids.portalConfiguration } : {}),
    });
    return { url: String(session.url) };
  },
});

async function requireActionUser(ctx: ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not signed in");
  return identity.subject;
}
