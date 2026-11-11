import type { ToolDef } from "../types";

export const weeklyScheduleMaker: ToolDef = {
  slug: "weekly-schedule-maker",
  group: "plan",
  name: "Weekly schedule maker",
  blurb: "Build a week of classes, shifts or routines as colored blocks on a grid, then print it.",
  title: "Weekly Schedule Maker: a free schedule builder to print",
  description:
    "Make a weekly schedule in your browser. Add classes, shifts or routines as colored blocks on a seven-day grid, then print it. Free, with no account.",
  h1: "Weekly schedule maker",
  lede: "Lay out your week on a seven-day grid. Add a block once, tick the days it repeats on, and it appears at the right time on each of them.",
  steps: [
    "Name the schedule, such as Fall term or Work rota.",
    "Type a block's name, tick the days it happens on, and set when it starts and ends.",
    "Pick a color, so classes, work and time off are easy to tell apart. Then press Add block.",
    "Click any block in the grid to change or delete it.",
    "Set the hours the grid shows and the day the week starts on, then print it.",
  ],
  sections: [
    {
      heading: "How to make a weekly schedule",
      body: [
        "Start with what's fixed: classes, shifts, the school run, a standing meeting. These don't move, so they go on the grid first. Add each one once and tick every day it repeats on.",
        "Next add what you want to protect, such as study time, exercise or an evening off, in a different color. What's left blank is your free time. Seeing how much of it there is makes it easier to say yes or no to the next thing someone asks of you.",
      ],
    },
    {
      heading: "A class schedule maker for a new term",
      body: [
        "For a class schedule, make one block for each course's meeting pattern. A lecture on Monday, Wednesday and Friday at 9 is one block with three days ticked. A lab on Thursday afternoon is a second block. Put the room in the name, such as Biology 101, Hall B, and the printed copy has all you need.",
        "Use one color per course and the week reads at a glance. Blocks that overlap are drawn side by side, so a clash between two classes shows up before the term starts.",
      ],
    },
    {
      heading: "A weekly schedule template to print",
      body: [
        "Press Print for a landscape page with the whole week on it. Blocks keep their colors on paper and each has an outline, so the page also reads on a black and white printer. With no blocks added, it prints as a blank weekly schedule template, with the days across the top and the hours down the side, ready to fill in by hand.",
      ],
    },
  ],
  faq: [
    { q: "Can a block repeat on several days?", a: "Yes. Tick each day it happens on when you add it. Editing the block later changes it on all of those days." },
    { q: "Can I start the week on Sunday?", a: "Yes. Set Week starts on to Sunday and the columns change order. Your blocks stay on the same days." },
    { q: "What if two blocks overlap?", a: "They're drawn side by side in that day's column, sharing its width, so you can see both." },
    {
      q: "Can a block run past midnight?",
      a: "No. A block starts and ends on the same day. For a night shift, add one block that ends at 12:00 AM, then a second block for the hours after midnight on the next day.",
    },
    { q: "Where is my schedule saved?", a: "In this browser, on this device. Nothing is sent to Beans. It will be here when you come back, unless you clear your browser's site data." },
  ],
  beans: {
    heading: "From a week on a grid to a plan for each day",
    body: "Beans is a daily planner. Its board has a column for every day, repeating tasks come back on their own, and the Timebox shows each day's hours so you can drag a task onto the time you'll do it.",
    pose: "timebox",
  },
  related: ["time-blocking-planner", "daily-planner-template", "hours-in-a-week", "habit-tracker"],
  wide: true,
  saves: true,
  lastModified: "2026-11-11",
};
