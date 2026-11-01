import { absoluteUrl } from "../lib/site";

/**
 * Markdown versions of the public pages, served by `proxy.ts` at the same URLs
 * when a client asks for `text/markdown`. Keep them in step with the pages.
 */
const home = `# Give every task a day and an hour.

Beans is a daily planner. Spill everything into the Brain Dump, spread it across the week, then drag tasks onto the Timebox.

- [Start planning](${absoluteUrl("/sign-up")})
- [Sign in](${absoluteUrl("/sign-in")})

## How a day goes

### 7:40am: Empty your head first

Anything without a date lives in the Brain Dump or a list. Open Quick Capture and type. Beans reads labels, dates and times as you go, such as \`#home\`, \`tomorrow\` and \`=30m\`.

### 8:15am: Lay out the week

The board has one column per day and keeps scrolling. Drag tasks into the days you'll do them. Daily planning walks you through it if you want the company. It's optional.

### 9:00am: Give each task a time

The Timebox shows your hours as a beanstalk. Drag a task on and it has a time. Pull a block's edge to resize it. A leaf marks the current time.

### 1:30pm: Stay with one thing

Run the timer or a Pomodoro on the task in front of you. Actual time can fill in from the timer, so you see what those 45 minutes really took. Tick the task off and its bean sprouts.

### 5:45pm: Close the day

Daily wrap-up looks back at what got done. It's optional too. Analytics shows your time by label, with a table view.

### 12:00am: The rest moves to today

At your local midnight, unfinished tasks roll to the new day and show a "Rolled over" tag. Nothing to copy by hand, and nothing to feel bad about.

## On the back of the packet

- **Tasks:** notes, subtasks, labels, priority, due dates, estimates and actual time.
- **Timer:** a timer and Pomodoro.
- **Repeats:** repeating tasks and templates.
- **Trash:** undo, and items stay 30 days.
- **Finding things:** search, filter and keyboard shortcuts.
- **Looks:** light and dark themes.
- **Sync:** changes sync live between open windows.
- **Phone:** a phone layout in the browser.

## Pages

- [About](${absoluteUrl("/about")})
- [Contact](${absoluteUrl("/contact")})
- [Privacy (draft)](${absoluteUrl("/privacy")})
- [Terms (draft)](${absoluteUrl("/terms")})
`;

const about = `# About Beans

Beans is a daily planner for one person and their day. It keeps your tasks, your week and your hours in one place.

It follows one loop: get everything out of your head, decide which day it belongs to, then give it a time. The Brain Dump, the board and the Timebox are those three steps.

Beans is built around a small garden. Your days are rows, your hours are a beanstalk, and a task you finish grows a sprout. The names stay plain, so you always know what a thing does.

Beans runs in the browser on a computer, with a phone layout too. Your account is handled by Clerk and your planner data is stored with Convex. The [privacy page](${absoluteUrl("/privacy")}) has the details.

[Start planning](${absoluteUrl("/sign-up")})
`;

const contact = `# Contact

Beans doesn't have a public contact address yet. When it does, it will be on this page.

For now, these pages answer the common questions:

- [About Beans](${absoluteUrl("/about")})
- [Privacy (draft)](${absoluteUrl("/privacy")})
- [Terms (draft)](${absoluteUrl("/terms")})
`;

const privacy = `# Privacy

**Draft.** This page is a placeholder waiting on legal review. It isn't a final privacy policy.

## What Beans stores

- **Your account.** Sign-in is handled by Clerk, which holds your account details, such as your email address and how you sign in.
- **Your planner.** Tasks, lists, labels, notes, times and settings are stored with Convex, so they can sync between your windows.

## This website

The public pages of this site load no third-party scripts and set no cookies of their own. Clerk sets the cookies that keep you signed in, on the sign-in pages and in the planner.

## Deleted tasks

Tasks you delete stay in Trash for 30 days, so you can undo.

## Questions

There's no contact address yet. It will go on the [contact page](${absoluteUrl("/contact")}).
`;

const terms = `# Terms

**Draft.** This page is a placeholder waiting on legal review. It isn't a final agreement.

## What Beans is

Beans is a daily planner that runs in the browser. You need an account to use the planner, and sign-in is handled by Clerk.

## Your tasks

Your tasks are stored with Convex so the planner can show them to you and sync them between windows. The [privacy page](${absoluteUrl("/privacy")}) says more.

## What's still open

The full terms aren't written yet. They'll appear on this page after review.
`;

const bodies: Record<string, string> = {
  "/": home,
  "/about": about,
  "/contact": contact,
  "/privacy": privacy,
  "/terms": terms,
};

export const notFoundMarkdown = `# Page not found

There's nothing planted at this address. Try one of these instead:

- [Home](${absoluteUrl("/")})
- [About](${absoluteUrl("/about")})
- [Contact](${absoluteUrl("/contact")})
- [Privacy (draft)](${absoluteUrl("/privacy")})
- [Terms (draft)](${absoluteUrl("/terms")})
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
