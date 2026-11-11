import type { ToolDef } from "../types";

export const hoursInAWeek: ToolDef = {
  slug: "hours-in-a-week",
  group: "plan",
  name: "Hours in a week",
  blurb: "A week has 168 hours. See where yours go with a weekly time budget.",
  title: "How Many Hours in a Week? 168, and where they go",
  description:
    "There are 168 hours in a week: 7 days of 24 hours. Add sleep, work and the rest to this free weekly time budget and see how many hours you have left.",
  h1: "How many hours are in a week?",
  lede: "A week has 168 hours. Fill in what your week already holds, such as sleep, work and meals, and see how many hours are left.",
  steps: [
    "Check the starting rows: sleep, work, commute, meals, chores and exercise. Change each number to match your week.",
    "Choose a day or a week for each row. 8 hours of sleep a day counts as 56 hours a week.",
    "Add a row for anything else that takes regular time, and remove the rows you don't need.",
    "Read what's spoken for and what's left. The bar shows the whole week, with one color for each row.",
  ],
  sections: [
    {
      heading: "How many hours are in a week, a month and a year?",
      body: [
        "A week is 7 days of 24 hours, which is 168 hours, or 10,080 minutes. A month isn't a fixed length: a 30-day month has 720 hours, a 31-day month has 744, and February has 672, or 696 in a leap year. Averaged over a year, a month is about 730 hours.",
        "A year has 8,760 hours, or 8,784 in a leap year. If you sleep 8 hours a night, you're awake for 112 of the week's 168 hours.",
      ],
    },
    {
      heading: "How many work hours are in a year?",
      body: [
        "At 40 hours a week for 52 weeks, a year has 2,080 work hours. That's the figure usually used to turn a yearly salary into an hourly rate. It counts every week, so paid holidays and vacation are inside it. A 40-hour week is a little under a quarter of the 168 hours: 23.8%.",
      ],
    },
    {
      heading: "How to do a weekly time audit",
      body: [
        "A time audit is a look at where your hours go. Start with the fixed things: sleep, work, travel, meals. What's left is the time you get to choose how to spend, and it's often less than it feels like. With the starting numbers here, 121.5 hours are spoken for and 46.5 are left, about 6 and a half hours a day.",
        "If your weekly time budget comes to more than 168 hours, the week doesn't fit and something has to shrink. It's better to see that on a bar than to find it out on Thursday.",
      ],
    },
  ],
  faq: [
    { q: "How many hours are in a week?", a: "168. There are 7 days in a week and 24 hours in a day, and 7 times 24 is 168." },
    { q: "How many minutes are in a week?", a: "10,080. That's 168 hours times 60 minutes." },
    {
      q: "How many waking hours are in a week?",
      a: "112 if you sleep 8 hours a night, because sleep takes 56 of the 168. At 7 hours a night it's 119.",
    },
    {
      q: "How many work hours are in a year?",
      a: "2,080 at 40 hours a week for 52 weeks. A year has 8,760 hours in all, or 8,784 in a leap year.",
    },
    { q: "Is my time budget saved?", a: "The rows are saved in this browser, so they're here when you come back. Nothing is sent to Beans." },
  ],
  beans: {
    heading: "Give the hours you have left a plan",
    body: "Beans is a daily planner. Give each task an estimate, drag it onto a day, then drag it onto the Timebox to give it a start time. Analytics shows where your time went by label, with a table view.",
    pose: "analytics",
  },
  related: ["time-blocking-planner", "daily-planner-template", "weekly-schedule-maker", "sleep-calculator"],
  saves: true,
  lastModified: "2026-11-11",
};
