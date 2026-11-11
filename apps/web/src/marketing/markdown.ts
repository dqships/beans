import { absoluteUrl, SOURCE_URL } from "../lib/site";
import { toolMarkdownBodies } from "../tools/markdown";
import { connectBody } from "./connect";
import { contactBody, legalUpdated, operator, privacyBody, privacyUpdated, supportEmail, termsBody } from "./legal";

/**
 * Markdown versions of the public pages, served by `proxy.ts` at the same URLs
 * when a client asks for `text/markdown`. Keep them in step with the pages.
 */
const home = `# Turn your to-do list into a plan for today.

Beans is a daily planner. Write down everything you need to do, choose what you'll get to today, and block out the time to do it.

- [Start planning](${absoluteUrl("/sign-up")})
- [Sign in](${absoluteUrl("/sign-in")})

## How a day goes

### 7:40am: Write it all down

Spill the beans: put every task in the Brain Dump the moment you think of it, with no date and no order. Press Q to add one from anywhere, and Beans picks out the date, label and estimate as you type, such as \`#home\`, \`tomorrow\` and \`=30m\`.

### 8:15am: Plan your week

Every day gets its own column. Drag tasks onto the days you'll do them, and you can see at a glance how full each day is. Daily planning can walk you through it each morning, if you'd like.

### 9:00am: Block out time for each task

A to-do list won't tell you when anything gets done. Drag a task onto the Timebox to give it a start time, and drag its edge to change how long it takes. A bean marks the current time, so you can see what's next.

### 1:30pm: Focus on one task at a time

Start a timer or a Pomodoro when you begin a task. Beans can log the time for you, so you find out how long things really take. Check it off when it's finished and watch it sprout.

### 5:45pm: See where your time went

At the end of the day, the daily wrap-up shows what got done. Analytics adds up your time by label, in a chart or a table.

### 12:00am: Unfinished tasks move to the next day

At midnight, anything you didn't finish moves to the new day on its own, marked Rolled over. You don't have to copy anything across, and nothing gets lost.

## Also in Beans

- **Tasks:** notes, subtasks, labels, priority, due dates, estimates and actual time.
- **Timer:** a timer and Pomodoro.
- **Repeats:** repeating tasks, plus templates for the ones you add often.
- **Trash:** deleted tasks stay for 30 days, and you can undo right away.
- **Search:** search, filters and keyboard shortcuts.
- **Themes:** light and dark.
- **Sync:** changes show up right away in every open window.
- **Phone:** works in your phone's browser too.

## Pages

- [About](${absoluteUrl("/about")})
- [Free tools](${absoluteUrl("/tools")})
- [Connect your AI app](${absoluteUrl("/connect-ai")})
- [Contact](${absoluteUrl("/contact")})
- [Privacy](${absoluteUrl("/privacy")})
- [Terms](${absoluteUrl("/terms")})
- [Source code on GitHub](${SOURCE_URL})
`;

const about = `# About Beans

Beans is a daily planner. It keeps your to-do list, your week and your schedule for the day in one place.

It works in three steps: write down everything you need to do, decide which day each task belongs to, then give it a time. The Brain Dump, the board and the Timebox are those three steps.

Beans looks a bit like a small garden: your days are rows, your hours run up a beanstalk, and a finished task grows a sprout. The feature names stay plain, so you always know what a thing does.

Beans runs in the browser on a computer, with a phone layout too. Your tasks sync between your devices as you work. The [privacy policy](${absoluteUrl("/privacy")}) says what Beans stores and who handles it.

Every account starts with a 7-day free trial, then you choose a monthly or yearly plan. The [pricing page](${absoluteUrl("/pricing")}) has the details.

Beans is made by ${operator}, a small software company in Michigan, USA. Questions, bugs and billing go to [${supportEmail}](mailto:${supportEmail}).

[Start planning](${absoluteUrl("/sign-up")})
`;

/** Turns the shared copy's site-relative links into absolute ones. */
const absolute = (body: string) => body.replace(/\]\((\/[^)]*)\)/g, (_, path: string) => `](${absoluteUrl(path)})`);

const contact = `# Contact\n\n${absolute(contactBody)}\n`;

const connectAi = `# Connect your AI app to Beans\n\n${absolute(connectBody)}\n`;

const privacy = `# Privacy policy\n\nLast updated ${privacyUpdated}\n\n${absolute(privacyBody)}\n`;

const terms = `# Terms of service\n\nLast updated ${legalUpdated}\n\n${absolute(termsBody)}\n`;

const pricing = `# Try Beans free for 7 days

Then $6 a month, or $48 a year. Every part of the planner is included, and you can cancel any time.

- [Start your free trial](${absoluteUrl("/sign-up")})

## Plans

- **Monthly:** $6 a month, after 7 days free.
- **Yearly:** $48 a year, after 7 days free. That's 33% less than paying monthly.

When a launch offer is running, the [pricing page](${absoluteUrl("/pricing")}) shows its code, how many are left and when it ends. Checkout applies it for you.

## How the free trial works

1. Sign up and pick a plan. Stripe, our payment provider, asks for your card. Nothing is charged yet.
2. Plan your days for 7 days with everything in Beans.
3. Your plan starts on day 8, unless you cancel in Settings before then. Cancel during the trial and you're never charged.

## Questions

- **How do I cancel?** In Beans, open Settings, then Subscription, and press Manage subscription. Beans stays open until the end of the time you paid for.
- **Can I switch between monthly and yearly?** Yes, in the same place. Moving to yearly starts right away, with credit for unused time. Moving to monthly starts when your year ends.
- **What happens to my tasks if I stop paying?** They stay saved. The planner locks until you choose a plan again.
- **Can I get a refund?** Yes. Email support@followusai.com within 14 days of a charge and we'll refund it in full.
`;

const bodies: Record<string, string> = {
  "/": home,
  "/pricing": pricing,
  "/about": about,
  "/connect-ai": connectAi,
  "/contact": contact,
  "/privacy": privacy,
  "/terms": terms,
  ...toolMarkdownBodies,
};

export const notFoundMarkdown = `# Page not found

There's no page at this address. Try one of these instead:

- [Home](${absoluteUrl("/")})
- [Pricing](${absoluteUrl("/pricing")})
- [About](${absoluteUrl("/about")})
- [Free tools](${absoluteUrl("/tools")})
- [Connect your AI app](${absoluteUrl("/connect-ai")})
- [Contact](${absoluteUrl("/contact")})
- [Privacy](${absoluteUrl("/privacy")})
- [Terms](${absoluteUrl("/terms")})
- [Sign in](${absoluteUrl("/sign-in")})
`;

export function markdownFor(path: string): string | null {
  return bodies[path] ?? null;
}

/** The media range's quality, or 0 when the Accept header doesn't name it. */
function quality(accept: string, type: string): number {
  for (const part of accept.split(",")) {
    const [range, ...params] = part.split(";").map((s) => s.trim().toLowerCase());
    if (range !== type) continue;
    const q = params.find((p) => p.startsWith("q="));
    const value = q ? Number(q.slice(2)) : 1;
    return Number.isNaN(value) ? 1 : value;
  }
  return 0;
}

/** True only when the client names `text/markdown` and doesn't rank HTML above it. */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const markdown = quality(accept, "text/markdown");
  return markdown > 0 && markdown >= quality(accept, "text/html");
}
