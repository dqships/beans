import { absoluteUrl } from "@/lib/site";
import { publicPages } from "@/marketing/pages";

export const dynamic = "force-static";

const links = [
  ["About", publicPages.about.path, "What Beans is and how it works"],
  ["Contact", publicPages.contact.path, "How to reach the people behind Beans"],
  ["Privacy (draft)", publicPages.privacy.path, "What Beans stores, waiting on legal review"],
  ["Terms (draft)", publicPages.terms.path, "An outline of the terms, waiting on legal review"],
] as const;

const body = `# Beans

> A daily planner. Capture tasks in a Brain Dump, plan them on a board with one column per day, then drag them onto the Timebox to give each one a time.

Every public page answers \`Accept: text/markdown\` with a markdown version at the same URL.

## Pages

- [Home](${absoluteUrl("/")}): The main workflow and how a day goes
${links.map(([name, path, about]) => `- [${name}](${absoluteUrl(path)}): ${about}`).join("\n")}

## Sign-in

- [Start planning](${absoluteUrl("/sign-up")}): Create an account
- [Sign in](${absoluteUrl("/sign-in")}): Open the planner
`;

export function GET() {
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
