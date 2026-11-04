import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { syncSubscription } from "./billing";
import { planForPrice } from "../packages/core/src/billing";
import { paidInvoice, stripeClient, verifyWebhook } from "./stripe";

const http = httpRouter();

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/**
 * Stripe's webhook. The signature is checked against STRIPE_WEBHOOK_SECRET,
 * then the subscription is read fresh from Stripe and stored. A paid
 * invoice records the account's first payment, for the `paid` event, and a
 * deleted subscription its end, for `subscription_cancelled`. Events
 * for other products on the same Stripe account (Vidzilla) are acknowledged
 * and ignored.
 */
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const key = process.env.STRIPE_SECRET_KEY;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!key || !secret) return new Response("Payments aren't set up", { status: 503 });
    const payload = await request.text();
    if (!(await verifyWebhook(payload, request.headers.get("stripe-signature"), secret))) return new Response("Bad signature", { status: 400 });

    const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> & { metadata?: Record<string, string> } } };
    const object = event.data.object;
    if (event.type === "invoice.paid") {
      const paid = paidInvoice(object);
      const plan = planForPrice(paid?.priceId);
      if (!paid || (paid.metadata.app !== "beans" && !plan)) return new Response("Ignored", { status: 200 });
      const result = await ctx.runMutation(internal.billing.recordPayment, {
        userId: paid.metadata.user_id ?? null,
        customerId: paid.customerId,
        plan: plan ?? paid.metadata.plan ?? null,
        amount: paid.amount,
        currency: paid.currency,
      });
      return new Response(result, { status: 200 });
    }
    let subscriptionId: string | null = null;
    let userId: string | null = null;
    if (event.type === "checkout.session.completed") {
      if (object.metadata?.app !== "beans" || typeof object.subscription !== "string") return new Response("Ignored", { status: 200 });
      subscriptionId = object.subscription;
      userId = object.metadata.user_id ?? null;
    } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
      subscriptionId = String(object.id);
    }
    if (!subscriptionId) return new Response("Ignored", { status: 200 });

    try {
      const result = await syncSubscription(ctx, stripeClient(key), subscriptionId, userId, { ended: event.type === "customer.subscription.deleted" });
      return new Response(result, { status: 200 });
    } catch (err) {
      // Stripe retries a failed delivery, so a passing error heals itself.
      console.error(`stripe ${event.type} failed`, err);
      return new Response("Failed", { status: 500 });
    }
  }),
});

export default http;
