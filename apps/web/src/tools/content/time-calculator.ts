import type { ToolDef } from "../types";

export const timeCalculator: ToolDef = {
  slug: "time-calculator",
  group: "time",
  name: "Time calculator",
  blurb: "Add and subtract hours, minutes and seconds, or add a length of time to a clock time.",
  title: "Time Calculator: add and subtract hours and minutes",
  description: "A free time calculator. Add and subtract hours, minutes and seconds row by row, and get the total as h:mm:ss, decimal hours and minutes. No sign-up.",
  h1: "Time calculator",
  lede: "Add up lengths of time, or take some away, and see the total in hours, minutes and seconds. You can also add a length to a clock time to find when something ends.",
  steps: [
    "Type hours, minutes and seconds in the first row. Leave blank any you don't need.",
    "Fill in the next row, and choose + to add it or − to subtract it. Press Add a row for more.",
    "Read the total under the rows as hours:minutes:seconds, as decimal hours and as minutes.",
    "To move a clock time, switch to Add to a clock time, pick the start time and type the length to add or subtract.",
  ],
  sections: [
    {
      heading: "How adding time works",
      body: [
        "Time is counted in sixties, so you can't add it like ordinary numbers. Add the seconds first: every 60 seconds becomes 1 minute. Then add the minutes: every 60 becomes 1 hour. Then add the hours.",
        "Take 1:45 plus 2:30. The minutes come to 75, which is 1 hour and 15 minutes. The hours come to 3, plus the 1 carried over. The answer is 4 hours 15 minutes, which this hours and minutes calculator shows as 4:15:00.",
      ],
    },
    {
      heading: "How to subtract time",
      body: [
        "Work the other way and borrow. For 8:00 minus 0:45, borrow 1 hour from the 8 to make 60 minutes, take away 45, and you have 7 hours 15 minutes. In the calculator, set the second row to − and type 45 in Minutes.",
        "If you subtract more than you added, the total is shown with a minus sign and a note. Taking 2:30 away from 1:00 gives −1:30:00.",
      ],
    },
    {
      heading: "Add time to a clock time",
      body: [
        "The second mode answers questions like what time it will be 3 hours 15 minutes after 10:00 PM. Pick the start time, choose Add or Subtract, and type the hours and minutes. The answer is 1:15 AM, marked next day because it crossed midnight. Going back past midnight is marked previous day.",
      ],
    },
  ],
  faq: [
    {
      q: "Can I type more than 59 minutes or seconds?",
      a: "Yes. A row can hold any amount, such as 90 minutes or 200 seconds. The time adder carries it into hours and minutes in the total.",
    },
    {
      q: "How do I add up hours and minutes for a timesheet?",
      a: "Put each day's time on its own row and read the total. The decimal hours figure is the one to multiply by an hourly rate.",
    },
    { q: "Can the total be negative?", a: "Yes. If the rows you subtract come to more than the rows you add, the total has a minus sign in front and a note saying so." },
    { q: "How many rows can I add?", a: "Up to 30. Remove a row with the x at its end, or press Clear to start over with two empty rows." },
    { q: "Is what I type saved?", a: "Yes, in this browser only, so the rows are still here if you reload. Nothing is sent to Beans." },
  ],
  beans: {
    heading: "Put the hours you added up into a day",
    body: "Beans is a daily planner. Give each task an estimate, drag it onto the Timebox to give it a start time, and resize the block if it needs longer.",
    pose: "timebox",
  },
  related: ["time-duration-calculator", "hours-to-decimal", "time-card-calculator", "date-calculator"],
  saves: true,
  lastModified: "2026-11-11",
};
