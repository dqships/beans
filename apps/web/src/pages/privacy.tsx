/* eslint-disable @next/next/no-html-link-for-pages -- no client runtime here, so links are plain anchors. */
import type { PageConfig } from "next";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function Privacy() {
  return (
    <ProsePage page={publicPages.privacy} title="Privacy" draft>
      <h2>What Beans stores</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Sign-in is handled by Clerk, which holds your account details, such as your email address
          and how you sign in.
        </li>
        <li>
          <strong>Your planner.</strong> Tasks, lists, labels, notes, times and settings are stored with Convex, so they can sync
          between your windows.
        </li>
      </ul>
      <h2>This website</h2>
      <p>
        The public pages of this site load no third-party scripts and set no cookies of their own. Clerk sets the cookies that keep
        you signed in, on the sign-in pages and in the planner.
      </p>
      <h2>Deleted tasks</h2>
      <p>Tasks you delete stay in Trash for 30 days, so you can undo.</p>
      <h2>Questions</h2>
      <p>
        There&apos;s no contact address yet. It will go on the <a href="/contact">contact page</a>.
      </p>
    </ProsePage>
  );
}
