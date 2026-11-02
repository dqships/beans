import { absoluteUrl } from "@/lib/site";
import { publicPages } from "@/marketing/pages";

export const dynamic = "force-static";

const links = [
  ["Pricing", publicPages.pricing.path, "Plans, the free trial and how to cancel"],
  ["About", publicPages.about.path, "What Beans is and how it works"],
  ["Contact", publicPages.contact.path, "Support email for help, billing, refunds and account requests"],
  ["Privacy", publicPages.privacy.path, "What Beans collects, why, and who handles it"],
  ["Terms", publicPages.terms.path, "Accounts, the free trial, billing, cancelling and refunds"],
] as const;

const body = `# Beans

> A daily planner. Write down everything you need to do in a Brain Dump, plan it on a board with one column per day, then drag tasks onto the Timebox to give each one a time.

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
