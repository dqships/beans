import type { Metadata } from "next";
import { NotFoundScene } from "@/marketing/not-found-scene";

export const metadata: Metadata = {
  title: "Page not found: nothing is planted at this address",
  description:
    "There is nothing planted at this address. Head back to the Beans home page to read about the daily planner, or sign in to open your own planner.",
};

/**
 * With an app/ directory, the App Router answers unmatched URLs, even when
 * pages/404 exists. This route loads no Clerk or Convex.
 */
export default function NotFound() {
  return <NotFoundScene />;
}
