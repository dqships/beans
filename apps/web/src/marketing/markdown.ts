import { absoluteUrl } from "../lib/site";

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

A to-do list won't tell you when anything gets done. Drag a task onto the Timebox to give it a start time, and drag its edge to change how long it takes. A leaf marks the current time, so you can see what's next.

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
- [Contact](${absoluteUrl("/contact")})
- [Privacy (draft)](${absoluteUrl("/privacy")})
- [Terms (draft)](${absoluteUrl("/terms")})
`;

const about = `# About Beans

Beans is a daily planner. It keeps your to-do list, your week and your schedule for the day in one place.

It works in three steps: write down everything you need to do, decide which day each task belongs to, then give it a time. The Brain Dump, the board and the Timebox are those three steps.

Beans looks a bit like a small garden: your days are rows, your hours run up a beanstalk, and a finished task grows a sprout. The feature names stay plain, so you always know what a thing does.

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

There's no page at this address. Try one of these instead:

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
