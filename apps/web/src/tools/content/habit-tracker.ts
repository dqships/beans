import type { ToolDef } from "../types";

export const habitTracker: ToolDef = {
  slug: "habit-tracker",
  group: "tasks",
  name: "Habit tracker",
  blurb: "A monthly grid for your habits. Click a bean each day you do one, and see your streak.",
  title: "Habit Tracker: a free monthly tracker, online or printed",
  description:
    "Track daily habits on a monthly grid in your browser. Click each day you do a habit, see your count and streak, or print a blank habit tracker. Free.",
  h1: "Habit tracker",
  lede: "Add the habits you want to keep and click a bean on each day you do one. Each row ends with how many days you've done this month and how many in a row.",
  steps: [
    "Add a habit and make it specific: Read 10 pages, not Read more.",
    "On each day you do it, click that day's bean in the habit's row.",
    "Look at the end of the row for the month's count and your current streak.",
    "Use the arrows to see other months, or print the month to keep on paper.",
  ],
  sections: [
    {
      heading: "How to use a habit tracker",
      body: [
        "A habit tracker is a grid with a row for each habit and a box for each day. You mark the box when you do the habit. The grid makes it plain whether you did the thing, and a row of marks is something you won't want to break.",
        "Track a few habits, not twelve. Pick ones you can answer yes or no to at the end of a day. Walk for 20 minutes works. Be healthier doesn't. If you miss a day, leave it empty and pick the habit up again the next day. One empty box doesn't undo the row.",
      ],
    },
    {
      heading: "A monthly habit tracker with counts and streaks",
      body: [
        "Done is the number of days this month you marked the habit. Streak is how many days in a row you've done it, counting back from today. If you haven't marked today yet, the streak counts up to yesterday, so it doesn't fall to zero while the day is still going. A streak carries over from one month to the next.",
      ],
    },
    {
      heading: "A habit tracker printable",
      body: [
        "Press Print for the month on one landscape page: your habits down the side, the days across the top and a bean for each day. Days you've done print filled in, and the rest print as outlines to fill in by hand. With no habits added, it prints as a blank habit tracker template with empty rows for writing in your own. Go to next month first if you want to print ahead.",
      ],
    },
  ],
  faq: [
    { q: "How many habits can I track?", a: "Up to 12. Start with three or four, and add more once those are steady." },
    { q: "How is the streak counted?", a: "It's the number of days in a row you've marked, counting back from today. An unmarked today doesn't break it. A missed yesterday does." },
    { q: "Can I fill in days I forgot to mark?", a: "Yes. Click any day in any month. Use the arrows to go back to an earlier month." },
    { q: "Does deleting a habit delete its history?", a: "Yes, in every month. The delete button needs a second click to confirm, so it's hard to do by accident." },
    { q: "Where is my tracker saved?", a: "In this browser, on this device. It isn't sent to Beans or anywhere else, so it won't show up on your other devices." },
  ],
  beans: {
    heading: "Put the habit on your day as well as on a chart",
    body: "Beans is a daily planner with repeating tasks. Set a task to repeat and it comes back on its own, ready to check off. Drag it onto the Timebox to give it a time of day.",
    pose: "planning",
  },
  related: ["daily-planner-template", "to-do-list", "weekly-schedule-maker", "time-blocking-planner"],
  wide: true,
  saves: true,
  lastModified: "2026-11-11",
};
