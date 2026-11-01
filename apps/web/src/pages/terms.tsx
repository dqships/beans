/* eslint-disable @next/next/no-html-link-for-pages -- no client runtime here, so links are plain anchors. */
import type { PageConfig } from "next";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Terms() {
  return (
    <ProsePage page={publicPages.terms} title="Terms" draft>
      <h2>What Beans is</h2>
      <p>Beans is a daily planner that runs in the browser. You need an account to use the planner, and sign-in is handled by Clerk.</p>
      <h2>Your tasks</h2>
      <p>
        What you put in Beans is yours. It&apos;s stored with Convex so the planner can show it to you and sync it between windows.
        The <a href="/privacy">privacy page</a> says more.
      </p>
      <h2>What&apos;s still open</h2>
      <p>The full terms, including anything about pricing, aren&apos;t decided. They&apos;ll appear on this page after review.</p>
    </ProsePage>
  );
}
