import { describe, expect, it } from "vitest";
import {
  BASE_OFFER,
  countLine,
  describeOffer,
  describePastPromo,
  describePromo,
  grantsAccess,
  openAt,
  promoCodes,
  pickPromos,
  planForPrice,
  readPromo,
  STRIPE_IDS,
  statusLine,
  stripeMode,
  type BillingStatus,
  type StripePromotionCode,
} from "./billing";

const NOW = Date.UTC(2026, 10, 2);
const DAY = 86_400;

/** A Stripe promotion code with its coupon. */
function code(code: string, coupon: StripePromotionCode["coupon"] = {}, extra: Partial<StripePromotionCode> = {}): StripePromotionCode {
  return {
    id: `promo_${code}`,
    code,
    active: true,
    times_redeemed: 0,
    max_redemptions: null,
    expires_at: null,
    coupon: { valid: true, duration: "repeating", duration_in_months: 3, percent_off: 100, name: "Launch offer", ...coupon },
    ...extra,
  };
}
const promo = (coupon: StripePromotionCode["coupon"] = {}, extra: Partial<StripePromotionCode> = {}) => readPromo(code("BEANS100", coupon, extra), NOW);

describe("plans", () => {
  it("prices the two plans and the yearly saving", () => {
    expect(BASE_OFFER.plans.map((p) => p.price)).toEqual(["$6 a month", "$48 a year"]);
    expect(BASE_OFFER.yearlySaving).toBe(33);
    expect(BASE_OFFER.trialDays).toBe(7);
    expect(BASE_OFFER.promo).toBeNull();
  });

  it("reads the mode from the secret key", () => {
    expect(stripeMode("sk_test_abc")).toBe("test");
    expect(stripeMode("rk_test_abc")).toBe("test");
    expect(stripeMode("sk_live_abc")).toBe("live");
    expect(stripeMode("rk_live_abc")).toBe("live");
  });

  it("knows which plan a price is", () => {
    expect(planForPrice(STRIPE_IDS.test.prices.monthly)).toBe("monthly");
    expect(planForPrice(STRIPE_IDS.test.prices.yearly)).toBe("yearly");
    expect(planForPrice(STRIPE_IDS.live.prices.monthly)).toBe("monthly");
    expect(planForPrice(STRIPE_IDS.live.prices.yearly)).toBe("yearly");
    expect(planForPrice("price_other")).toBeNull();
    expect(planForPrice(null)).toBeNull();
  });

  it("keeps the planner open while trialing, active or retrying a card", () => {
    expect(["trialing", "active", "past_due"].every(grantsAccess)).toBe(true);
    expect(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", null].some(grantsAccess)).toBe(false);
  });
});

describe("launch offers", () => {
  it("runs a code only while it's active, under its cap and before its end", () => {
    expect(promo().running).toBe(true);
    expect(promo({}, { max_redemptions: 100, times_redeemed: 100 }).running).toBe(false);
    expect(promo({ max_redemptions: 5 }, { max_redemptions: 100, times_redeemed: 5 }).running).toBe(false);
    expect(promo({}, { expires_at: NOW / 1000 - DAY }).running).toBe(false);
    expect(promo({ redeem_by: NOW / 1000 - DAY }).running).toBe(false);
    expect(promo({}, { active: false }).running).toBe(false);
    expect(promo({ valid: false }).running).toBe(false);
    expect(promo({ redeem_by: NOW / 1000 + 2 * DAY }, { expires_at: NOW / 1000 + DAY }).endsAt).toBe(NOW + DAY * 1000);
  });

  it("offers the last running code and keeps used, finished ones as rounds", () => {
    const { current, past } = pickPromos([
      readPromo(code("BEANS100", {}, { max_redemptions: 100, times_redeemed: 100 }), NOW),
      null,
      readPromo(code("UNUSED", {}, { active: false }), NOW),
      readPromo(code("BEANS50", { name: "Round 2", percent_off: 50 }, { max_redemptions: 250, times_redeemed: 12 }), NOW),
    ]);
    expect(current?.code).toBe("BEANS50");
    expect(past.map((p) => p.code)).toEqual(["BEANS100"]);
    expect(describePastPromo(past[0]!)).toBe("Launch offer: 100 people got 3 months of Beans free.");
  });

  it("words a free round, trial first, on the monthly plan", () => {
    expect(describePromo(promo({}, { max_redemptions: 100, times_redeemed: 63, expires_at: Date.UTC(2026, 10, 30) / 1000 }))).toEqual({
      label: "Launch offer",
      code: "BEANS100",
      headline: "Your first 3 months free on the monthly plan.",
      claimed: "63 of 100 claimed",
      endsAt: Date.UTC(2026, 10, 30),
      monthlyLine: "7 days free, then free for your first 3 months, then $6 a month.",
    });
  });

  it("words partial and other durations", () => {
    expect(describePromo(promo({ percent_off: 50, name: "Round 2" }))).toMatchObject({
      headline: "50% off your first 3 months on the monthly plan.",
      monthlyLine: "7 days free, then $3 a month for your first 3 months, then $6 a month.",
    });
    expect(describePromo(promo({ percent_off: 25 })).monthlyLine).toBe("7 days free, then $4.50 a month for your first 3 months, then $6 a month.");
    expect(describePromo(promo({ duration: "once" })).headline).toBe("Your first month free on the monthly plan.");
    expect(describePromo(promo({ duration: "repeating", duration_in_months: 1 })).headline).toBe("Your first month free on the monthly plan.");
    expect(describePromo(promo({ duration: "forever", percent_off: 50 })).monthlyLine).toBe(
      "7 days free, then $3 a month instead of $6, for as long as you stay subscribed.",
    );
    expect(describePromo(promo({ percent_off: null, amount_off: 200, currency: "usd" })).headline).toBe("$2 off your first 3 months on the monthly plan.");
  });

  it("counts what's claimed, or what's available before anyone has", () => {
    expect(describePromo(promo({}, { max_redemptions: 100, times_redeemed: 63 })).claimed).toBe("63 of 100 claimed");
    expect(describePromo(promo({}, { max_redemptions: 100 })).claimed).toBe("100 available");
    expect(describePromo(promo({}, { times_redeemed: 7 })).claimed).toBe("7 claimed");
    expect(describePromo(promo()).claimed).toBe("");
    expect(describePastPromo(promo({ percent_off: 50, name: "" }, { times_redeemed: 1 }))).toBe("Code BEANS100: 1 person got 50% off.");
  });

  it("puts the count and end date on one line", () => {
    const words = describePromo(promo({}, { max_redemptions: 100, expires_at: Date.UTC(2026, 10, 30, 12) / 1000 }));
    expect(countLine(words)).toBe("100 available · ends 30 November");
    expect(countLine(describePromo(promo()))).toBe("");
  });

  it("builds the whole offer", () => {
    const offer = describeOffer(pickPromos([promo({}, { max_redemptions: 100 })]));
    expect(offer.promo?.code).toBe("BEANS100");
    expect(offer.pastPromos).toEqual([]);
  });
});

describe("status line", () => {
  const base: BillingStatus = {
    enforced: true,
    access: true,
    status: "trialing",
    plan: "monthly",
    trialEnd: Date.UTC(2026, 10, 9),
    periodEnd: Date.UTC(2026, 10, 9),
    cancelAtPeriodEnd: false,
    discountPercent: null,
    discountEnd: null,
    trialAvailable: false,
    passEnd: null,
    passAvailable: false,
    hasCustomer: true,
  };

  it("says what happens next", () => {
    expect(statusLine(base)).toBe("Free trial until 9 November, then $6 a month.");
    expect(statusLine({ ...base, cancelAtPeriodEnd: true })).toBe("Free trial until 9 November. Cancelled, so you won't be charged.");
    expect(statusLine({ ...base, status: "active", plan: "yearly", periodEnd: Date.UTC(2027, 10, 9) })).toBe("$48 a year. Renews 9 November.");
    expect(statusLine({ ...base, status: "active", cancelAtPeriodEnd: true })).toBe("Cancelled. Beans stays open until 9 November.");
    expect(statusLine({ ...base, status: "canceled", access: false })).toBe("Your subscription has ended.");
    expect(statusLine({ ...base, status: null })).toBe("No subscription yet.");
    expect(statusLine({ ...base, status: null, passEnd: Date.UTC(2026, 10, 5) })).toBe("Free days with no card until 5 November.");
    const launch = { discountPercent: 100, discountEnd: Date.UTC(2027, 1, 2) };
    expect(statusLine({ ...base, ...launch })).toBe("Free trial until 9 November, then free until 2 February, then $6 a month.");
    expect(statusLine({ ...base, ...launch, status: "active" })).toBe("Free until 2 February, then $6 a month.");
    expect(statusLine({ ...base, discountPercent: 50, discountEnd: Date.UTC(2027, 1, 2) })).toBe(
      "Free trial until 9 November, then $3 a month until 2 February, then $6 a month.",
    );
  });
});

describe("open at", () => {
  const end = Date.UTC(2026, 10, 5, 18);
  it("opens for a live subscription or free days that haven't ended, and always without Stripe", () => {
    expect(openAt({ enforced: false, status: null, passEnd: null }, end)).toBe(true);
    expect(openAt({ enforced: true, status: null, passEnd: null }, end)).toBe(false);
    expect(openAt({ enforced: true, status: "trialing", passEnd: null }, end)).toBe(true);
    expect(openAt({ enforced: true, status: null, passEnd: end }, end - 1)).toBe(true);
    expect(openAt({ enforced: true, status: null, passEnd: end }, end)).toBe(false);
    expect(openAt({ enforced: true, status: "canceled", passEnd: end }, end + 1)).toBe(false);
  });
});

describe("promo codes setting", () => {
  it("reads a comma-separated list, oldest first, ignoring spaces and blanks", () => {
    expect(promoCodes("BEANS100, BEANS50,,BEANS25 ")).toEqual(["BEANS100", "BEANS50", "BEANS25"]);
    expect(promoCodes("")).toEqual([]);
    expect(promoCodes(undefined)).toEqual([]);
  });
});
