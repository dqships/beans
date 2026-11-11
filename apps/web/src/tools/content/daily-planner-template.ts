import type { ToolDef } from "../types";

export const dailyPlannerTemplate: ToolDef = {
  slug: "daily-planner-template",
  group: "plan",
  name: "Daily planner template",
  blurb: "A one-page daily planner to fill in and print: top 3, an hourly schedule, to-dos and notes.",
  title: "Daily Planner Template: a free printable day planner",
  description:
    "A free daily planner template to fill in and print. Top 3 priorities, an hourly schedule, a to-do list and notes on one page. No account needed.",
  h1: "Daily planner template",
  lede: "Fill in a one-page plan for your day: three priorities, an hour-by-hour schedule, a to-do list and notes. Print it filled in, or print it blank and write on it.",
  steps: [
    "Pick the date, or press Today.",
    "Write your top 3: the three things that would make this a good day.",
    "Put the fixed things in the schedule first, such as meetings and appointments. Then give each priority an hour.",
    "List the smaller to-dos, and click a bean as you finish each one.",
    "Press Print for a paper copy. Press Clear first if you want a blank page.",
  ],
  sections: [
    {
      heading: "How to use a daily planner template",
      body: [
        "Start with the top 3, not the to-do list. Ask which three things matter most today and write only those. Then go to the schedule and fill in what's already fixed: meetings, appointments, the school run. The gaps that are left are the time you really have.",
        "Give each of the three priorities one of those gaps. What doesn't fit goes on the to-do list for spare minutes, or waits for tomorrow's page. A plan made this way takes a few minutes, and it tells you what to do at 2 PM instead of leaving you to decide then.",
      ],
    },
    {
      heading: "A free printable daily planner",
      body: [
        "Press Print and the page comes out in black on white, sized to fit one sheet. Lines you left empty print as blank lines to write on, so an empty page works as a printable daily planner. With no date picked, the date prints as a blank to fill in. The buttons and the rest of this site stay off the paper.",
        "Change the first and last hour before you print if your day runs early or late. The schedule can cover any stretch of the day, one line per hour.",
      ],
    },
    {
      heading: "A daily schedule template: by the hour or by the task?",
      body: [
        "An hourly schedule suits days with fixed points, such as classes, shifts and calls. A task list suits days that are open. Most days are a mix, which is why this day planner template has both: hours down one side, tasks down the other.",
        "If an hour is too coarse for your day, the time blocking planner on this site lets you size each block to the minute. If your weeks repeat, the weekly schedule maker shows all seven days at once.",
      ],
    },
  ],
  faq: [
    { q: "Is this daily planner template free?", a: "Yes. It works in your browser with no account, and you can print as many pages as you like." },
    { q: "Can I print a blank daily planner?", a: "Yes. Press Clear, then Print. Every empty line prints as a line to write on, and the date prints as a blank." },
    { q: "Where is my page saved?", a: "In this browser, on this device. It isn't sent to Beans or anywhere else. It stays until you press Clear or clear your browser's site data." },
    { q: "Can I keep a page for each day?", a: "This tool holds one page at a time. Print the day, or save it as a PDF from your browser's print window, before you clear it for the next one." },
    { q: "What hours does the schedule cover?", a: "7 AM to 9 PM to begin with, one line per hour. Change the first and last hour to cover any part of the day." },
  ],
  beans: {
    heading: "A planner that carries today's leftovers forward",
    body: "Beans is a daily planner. Each day has its own column of tasks, and the Timebox shows the day's hours so you can drag a task onto the time you'll do it. Whatever you don't finish moves to the next day at midnight.",
    pose: "planning",
  },
  related: ["time-blocking-planner", "to-do-list", "weekly-schedule-maker", "brain-dump"],
  wide: true,
  saves: true,
  lastModified: "2026-11-11",
};
