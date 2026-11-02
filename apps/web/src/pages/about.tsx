/* eslint-disable @next/next/no-html-link-for-pages -- no client runtime here, so links are plain anchors. */
import type { PageConfig } from "next";
import { operator, supportEmail } from "@/marketing/legal";
import { publicPages } from "@/marketing/pages";
import { ProsePage } from "@/marketing/prose";

export const config: PageConfig = { unstable_runtimeJS: false };

export default function About() {
  return (
    <ProsePage page={publicPages.about} title="About Beans">
      <p>Beans is a daily planner. It keeps your to-do list, your week and your schedule for the day in one place.</p>
      <p>
        It works in three steps: write down everything you need to do, decide which day each task belongs to, then give it a time.
        The Brain Dump, the board and the Timebox are those three steps.
      </p>
      <p>
        Beans looks a bit like a small garden: your days are rows, your hours run up a beanstalk, and a finished task grows a
        sprout. The feature names stay plain, so you always know what a thing does.
      </p>
      <p>
        Beans runs in the browser on a computer, with a phone layout too. Your tasks sync between your devices as you work. The{" "}
        <a href="/privacy">privacy policy</a> says what Beans stores and who handles it.
      </p>
      <p>
        Beans is made by {operator}, a small software company in Michigan, USA. Questions, bugs and billing go to{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>
      <p>
        <a href="/sign-up">Start planning</a>
      </p>
    </ProsePage>
  );
}
