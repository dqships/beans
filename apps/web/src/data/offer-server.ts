import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { BASE_OFFER, type Offer } from "@beans/core";

/**
 * The prices and the running launch offer, for the pricing page's server
 * render. Without a Convex URL, or when it can't be reached (a CI build), the
 * page shows full prices and no offer.
 */
export async function loadOffer(): Promise<Offer> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return BASE_OFFER;
  try {
    return await new ConvexHttpClient(url).action(api.billing.offer, {});
  } catch (err) {
    console.error("offer lookup failed", err);
    return BASE_OFFER;
  }
}
