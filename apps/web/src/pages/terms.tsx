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
        Your tasks are stored with Convex so the planner can show them to you and sync them between windows. The{" "}
        <a href="/privacy">privacy page</a> says more.
      </p>
      <h2>What&apos;s still open</h2>
      <p>The full terms aren&apos;t written yet. They&apos;ll appear on this page after review.</p>
    </ProsePage>
  );
}
