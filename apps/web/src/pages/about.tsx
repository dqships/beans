/* eslint-disable @next/next/no-html-link-for-pages -- no client runtime here, so links are plain anchors. */
import type { PageConfig } from "next";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function About() {
  return (
    <ProsePage page={publicPages.about} title="About Beans">
      <p>Beans is a daily planner for one person and their day. It keeps your tasks, your week and your hours in one place.</p>
      <p>
        It follows one loop: get everything out of your head, decide which day it belongs to, then give it a time. The Brain Dump,
        the board and the Timebox are those three steps.
      </p>
      <p>
        Beans is built around a small garden. Your days are rows, your hours are a beanstalk, and a task you finish grows a sprout.
        The names stay plain, so you always know what a thing does.
      </p>
      <p>
        Beans runs in the browser on a computer, with a phone layout too. Your account is handled by Clerk and your planner data is
        stored with Convex. The <a href="/privacy">privacy page</a> has the details.
      </p>
      <p>
        <a href="/sign-up">Start planning</a>
      </p>
    </ProsePage>
  );
}
