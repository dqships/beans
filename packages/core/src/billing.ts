/**
 * Beans plans and launch offers. Stripe holds the prices, coupons and
 * promotion codes; this file names them and turns them into words. Convex
 * (checkout, the webhook) and the web app (the pricing page, the paywall)
 * both read it. See docs/BILLING.md.
 */

export type PlanId = "monthly" | "yearly";
export type StripeMode = "test" | "live";

export type Plan = {
  id: PlanId;
  /** Smallest currency unit: 600 is $6. */
  amount: number;
  currency: string;
  interval: "month" | "year";
};

export const PLANS: Record<PlanId, Plan> = {
  monthly: { id: "monthly", amount: 600, currency: "usd", interval: "month" },
  yearly: { id: "yearly", amount: 4800, currency: "usd", interval: "year" },
};

export const TRIAL_DAYS = 7;

/**
 * Free days with no card, once per account, for a new account that isn't
 * ready to start the trial. When they end the planner locks to the paywall
 * and keeps every task. The card trial stays available afterwards.
 */
export const PASS_DAYS = 3;

/**
 * Launch offer codes, oldest first, from the `STRIPE_PROMO_CODES` setting on
 * the Convex deployment: "BEANS100,BEANS50". The last one still running is
 * applied at checkout and advertised with its count; earlier ones that were
 * used stay listed as finished rounds. Codes Stripe doesn't know are skipped.
 * They discount the monthly plan only: the coupons apply to the monthly
 * product, so yearly checkouts never use them.
 */
export function promoCodes(setting: string | undefined): string[] {
  return (setting ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}
export const PROMO_PLAN: PlanId = "monthly";

/** Stripe IDs per mode. The mode follows the secret key (`sk_test_`, `rk_live_`...). Not secret. */
export const STRIPE_IDS: Record<StripeMode, { prices: Record<PlanId, string>; portalConfiguration: string }> = {
  test: {
    prices: { monthly: "price_1UXOuBDyfH6JDnExdLFn4NRD", yearly: "price_1UXP2qDyfH6JDnExV04uvxl0" },
    portalConfiguration: "bpc_1UXOx4DyfH6JDnExOjVGxgv8",
  },
  live: {
    prices: { monthly: "price_1UXQBoDyfH6JDnExCMcFrOqj", yearly: "price_1UXQOLDyfH6JDnExGPJCdM8E" },
    portalConfiguration: "bpc_1UXSNWDyfH6JDnExI20FeQYC",
  },
};

export function stripeMode(secretKey: string): StripeMode {
  return /^(sk|rk)_live_/.test(secretKey) ? "live" : "test";
}

export function planForPrice(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const ids of Object.values(STRIPE_IDS)) {
    for (const [plan, id] of Object.entries(ids.prices)) if (id && id === priceId) return plan as PlanId;
  }
  return null;
}

/** Stripe subscription statuses that keep the planner open. Stripe retries a failed card while `past_due`. */
const LIVE_STATUSES = new Set(["trialing", "active", "past_due"]);

export function grantsAccess(status: string | null | undefined): boolean {
  return Boolean(status && LIVE_STATUSES.has(status));
}

/** True while the planner is open: no Stripe, a live subscription, or free days that haven't ended. */
export function openAt(s: Pick<BillingStatus, "enforced" | "status" | "passEnd">, now: number): boolean {
  return !s.enforced || grantsAccess(s.status) || (s.passEnd !== null && now < s.passEnd);
}

/** "$6", "$0.50" */
export function money(amount: number, currency = "usd"): string {
  const value = amount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

/** "$6 a month" */
export function priceLine(plan: Plan, amount = plan.amount): string {
  return `${money(amount, plan.currency)} a ${plan.interval}`;
}

/** What the yearly plan saves against twelve months: 33. */
export function yearlySavingPercent(): number {
  const twelve = PLANS.monthly.amount * 12;
  return Math.round(((twelve - PLANS.yearly.amount) / twelve) * 100);
}

// Launch offers. The pattern follows the Vidzilla reference implementation
// (dqships/vidzilla api/_promos.js) and the "Launch offers with Stripe and
// RevenueCat" playbook.

export type Promo = {
  id: string;
  code: string;
  name: string | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: "forever" | "once" | "repeating";
  months: number | null;
  redeemed: number;
  max: number | null;
  /** ms since epoch */
  endsAt: number | null;
  running: boolean;
};

/** A Stripe promotion code (API version 2024-06-20, coupon embedded), reduced to what the pages need. */
export function readPromo(p: StripePromotionCode, now: number): Promo {
  const c = p.coupon ?? {};
  const caps = [p.max_redemptions, c.max_redemptions].filter((n): n is number => typeof n === "number");
  const ends = [p.expires_at, c.redeem_by].filter((n): n is number => typeof n === "number");
  const max = caps.length ? Math.min(...caps) : null;
  const endsAt = ends.length ? Math.min(...ends) * 1000 : null;
  const redeemed = p.times_redeemed ?? 0;
  return {
    id: p.id,
    code: p.code,
    name: c.name || null,
    percentOff: c.percent_off ?? null,
    amountOff: c.amount_off ?? null,
    currency: c.currency ?? null,
    duration: c.duration ?? "once",
    months: c.duration_in_months ?? null,
    redeemed,
    max,
    endsAt,
    running: Boolean(p.active && c.valid !== false && (max === null || redeemed < max) && (endsAt === null || now < endsAt)),
  };
}

export type StripePromotionCode = {
  id: string;
  code: string;
  active?: boolean;
  times_redeemed?: number;
  max_redemptions?: number | null;
  expires_at?: number | null;
  coupon?: {
    name?: string | null;
    percent_off?: number | null;
    amount_off?: number | null;
    currency?: string | null;
    duration?: "forever" | "once" | "repeating";
    duration_in_months?: number | null;
    valid?: boolean;
    max_redemptions?: number | null;
    redeem_by?: number | null;
  };
};

/** The offer running now (the last running code) and the finished rounds people used. */
export function pickPromos(found: (Promo | null)[]): { current: Promo | null; past: Promo[] } {
  const promos = found.filter((p): p is Promo => Boolean(p));
  return { current: promos.filter((p) => p.running).at(-1) ?? null, past: promos.filter((p) => !p.running && p.redeemed > 0) };
}

function discounted(promo: Promo, plan: Plan): number {
  if (promo.percentOff !== null) return Math.round((plan.amount * (100 - promo.percentOff)) / 100);
  if (promo.amountOff !== null && promo.currency === plan.currency) return Math.max(0, plan.amount - promo.amountOff);
  return plan.amount;
}

/**
 * The first real charge on a plan, after the trial, in the smallest currency
 * unit: the list price, less the code applied at checkout. Stripe discounts
 * the first paid invoice under any coupon duration (`once`, `repeating` from
 * the trial's start, `forever`). Null when it can't be known: a coupon with
 * no percent or amount off, an unknown duration, or an amount off in another
 * currency.
 */
export function firstCharge(plan: Plan, promo: Promo | null): number | null {
  if (!promo) return plan.amount;
  if (!["once", "repeating", "forever"].includes(promo.duration)) return null;
  if (typeof promo.percentOff === "number" && promo.percentOff >= 0 && promo.percentOff <= 100) {
    return Math.round((plan.amount * (100 - promo.percentOff)) / 100);
  }
  if (typeof promo.amountOff === "number" && promo.currency?.toLowerCase() === plan.currency) return Math.max(0, plan.amount - promo.amountOff);
  return null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * How long the discount lasts on the monthly plan: null for "for as long as
 * you stay subscribed", else "your first 3 months". Stripe discounts every
 * invoice that starts within a repeating coupon's months, counted from the
 * start of the trial, so a 3-month coupon covers the first 3 paid months.
 */
function term(promo: Promo): string | null {
  if (promo.duration === "forever") return null;
  if (promo.duration === "once" || !promo.months || promo.months === 1) return "your first month";
  return `your first ${plural(promo.months, "month", "months")}`;
}

/** "63 of 100 claimed", "100 available" before anyone has, or "63 claimed" with no cap. */
function claimedLine(promo: Promo): string {
  if (promo.max !== null) return promo.redeemed ? `${promo.redeemed} of ${promo.max} claimed` : `${promo.max} available`;
  return promo.redeemed ? `${promo.redeemed} claimed` : "";
}

export type OfferWords = {
  /** The coupon's name: "Launch offer" */
  label: string;
  code: string;
  /** "Your first 3 months free on the monthly plan." */
  headline: string;
  /** "63 of 100 claimed" */
  claimed: string;
  endsAt: number | null;
  /** What the monthly plan costs with the code, trial included. */
  monthlyLine: string;
};

/** The words for the offer running now. Beans offers apply to the monthly plan only. */
export function describePromo(promo: Promo): OfferWords {
  const plan = PLANS[PROMO_PLAN];
  const now = discounted(promo, plan);
  const free = now === 0;
  const off = promo.percentOff !== null ? `${promo.percentOff}% off` : `${money(promo.amountOff ?? 0, promo.currency ?? "usd")} off`;
  const covers = term(promo);
  const regular = priceLine(plan);
  let headline: string;
  let monthlyLine: string;
  if (!covers) {
    headline = `${free ? "Free" : capitalize(off)} for as long as you stay subscribed, on the monthly plan.`;
    monthlyLine = free
      ? "Free for as long as you stay subscribed."
      : `${TRIAL_DAYS} days free, then ${priceLine(plan, now)} instead of ${money(plan.amount, plan.currency)}, for as long as you stay subscribed.`;
  } else {
    headline = free ? `${capitalize(covers)} free on the monthly plan.` : `${capitalize(off)} ${covers} on the monthly plan.`;
    monthlyLine = free
      ? `${TRIAL_DAYS} days free, then free for ${covers}, then ${regular}.`
      : `${TRIAL_DAYS} days free, then ${priceLine(plan, now)} for ${covers}, then ${regular}.`;
  }
  return { label: promo.name || "Offer", code: promo.code, headline, claimed: claimedLine(promo), endsAt: promo.endsAt, monthlyLine };
}

/** A finished round: "Launch offer: 100 people got 3 months of Beans free." */
export function describePastPromo(promo: Promo): string {
  const who = plural(promo.redeemed, "person", "people");
  let what: string;
  if (promo.percentOff === 100) what = promo.duration === "repeating" && promo.months ? `${plural(promo.months, "month", "months")} of Beans free` : "Beans free";
  else what = promo.percentOff !== null ? `${promo.percentOff}% off` : `${money(promo.amountOff ?? 0, promo.currency ?? "usd")} off`;
  return `${promo.name || `Code ${promo.code}`}: ${who} got ${what}.`;
}

/** Everything the pricing page and the paywall show. */
export type Offer = {
  plans: { id: PlanId; price: string; amount: number; currency: string; interval: Plan["interval"] }[];
  trialDays: number;
  yearlySaving: number;
  promo: OfferWords | null;
  pastPromos: string[];
};

export function describeOffer(promos: { current: Promo | null; past: Promo[] }): Offer {
  return {
    plans: (Object.values(PLANS) as Plan[]).map((p) => ({ id: p.id, price: priceLine(p), amount: p.amount, currency: p.currency, interval: p.interval })),
    trialDays: TRIAL_DAYS,
    yearlySaving: yearlySavingPercent(),
    promo: promos.current ? describePromo(promos.current) : null,
    pastPromos: promos.past.map(describePastPromo),
  };
}

/** The offer with no Stripe to ask: full prices, no launch code. */
export const BASE_OFFER: Offer = describeOffer({ current: null, past: [] });

const DATE = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", timeZone: "UTC" });

/** "30 November" style dates for offer end lines, in UTC so server and browser agree. */
export function offerDate(ms: number): string {
  const parts = DATE.formatToParts(new Date(ms));
  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${day} ${month}`;
}

/** "63 of 100 claimed · ends 30 November" */
export function countLine(words: OfferWords): string {
  return [words.claimed, words.endsAt ? `ends ${offerDate(words.endsAt)}` : ""].filter(Boolean).join(" · ");
}

/** The subscription as the app shows it. */
export type BillingStatus = {
  /** False when Stripe isn't set up on this deployment: the planner stays open. */
  enforced: boolean;
  access: boolean;
  status: string | null;
  plan: PlanId | null;
  trialEnd: number | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  /** A launch offer on the subscription, until `discountEnd`. */
  discountPercent: number | null;
  discountEnd: number | null;
  /** A first subscription starts with the free trial. */
  trialAvailable: boolean;
  /** When the no-card free days end, or null if they were never started. */
  passEnd: number | null;
  /** A new account can start the no-card free days once, before any subscription. */
  passAvailable: boolean;
  hasCustomer: boolean;
};

/** One line for Settings: "Free trial until 9 November, then free until 2 February, then $6 a month." */
export function statusLine(s: BillingStatus): string {
  const plan = s.plan ? PLANS[s.plan] : null;
  const price = plan ? priceLine(plan) : "your plan's price";
  const when = (ms: number | null) => (ms ? offerDate(ms) : "the end of the period");
  // What the next invoices cost while a launch offer lasts.
  const offer =
    plan && s.discountPercent && s.discountEnd
      ? s.discountPercent >= 100
        ? `free until ${offerDate(s.discountEnd)}, then `
        : `${priceLine(plan, Math.round((plan.amount * (100 - s.discountPercent)) / 100))} until ${offerDate(s.discountEnd)}, then `
      : "";
  if (!s.status && s.passEnd) return `Free days with no card until ${offerDate(s.passEnd)}.`;
  if (!s.status) return "No subscription yet.";
  if (s.status === "trialing") {
    if (s.cancelAtPeriodEnd) return `Free trial until ${when(s.trialEnd)}. Cancelled, so you won't be charged.`;
    return `Free trial until ${when(s.trialEnd)}, then ${offer}${price}.`;
  }
  if (s.status === "active") {
    if (s.cancelAtPeriodEnd) return `Cancelled. Beans stays open until ${when(s.periodEnd)}.`;
    if (offer) return `${capitalize(offer)}${price}.`;
    return `${capitalize(price)}. Renews ${when(s.periodEnd)}.`;
  }
  if (s.status === "past_due") return "Your last payment didn't go through. Stripe will try the card again; update it to keep Beans open.";
  return "Your subscription has ended.";
}
