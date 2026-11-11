import type { ToolDef } from "../types";

export const timeDurationCalculator: ToolDef = {
  slug: "time-duration-calculator",
  group: "time",
  name: "Time duration calculator",
  blurb: "Find the hours and minutes between two times, or between two dates and times.",
  title: "Time Duration Calculator: hours between two times",
  description: "Work out the time between two times or two dates. Handles overnight shifts and unpaid breaks, and gives hours and minutes, decimal hours and minutes.",
  h1: "Time duration calculator",
  lede: "Enter a start and an end and see how much time is between them. It handles overnight spans, takes off an unpaid break, and can count across days.",
  steps: [
    "Pick the start time and the end time. If the end is earlier than the start, it's counted as the next day.",
    "If there was an unpaid break, type its length in minutes and it comes off the answer.",
    "Read the time between as hours and minutes, as decimal hours and as total minutes.",
    "For a span longer than a day, switch to Between two dates and pick a date and a time for each end.",
  ],
  sections: [
    {
      heading: "How many hours between two times?",
      body: [
        "Subtract the start from the end. From 9:00 AM to 5:00 PM is 8 hours. When the end has fewer minutes than the start, borrow an hour: from 8:45 AM to 12:10 PM is 3 hours 25 minutes.",
        "It's easier on a 24-hour clock, where 5:00 PM is 17:00 and 17 minus 9 is 8. This hours calculator does that for you and also gives the answer as decimal hours, so 7 hours 30 minutes shows as 7.50.",
      ],
    },
    {
      heading: "Elapsed time overnight, and with a break",
      body: [
        "A night shift ends on a smaller clock time than it starts on. When the end is earlier than the start, the elapsed time calculator reads it as the next day and says so under the answer. From 10:00 PM to 6:00 AM is 8 hours.",
        "Type an unpaid break in minutes to take it off. From 9:00 AM to 5:30 PM is 8 hours 30 minutes, and with a 30-minute break it comes to 8 hours.",
      ],
    },
    {
      heading: "Time difference between two dates",
      body: [
        "The second mode counts from one date and time to another and gives days, hours and minutes, plus the total in hours. From Monday at 9:00 AM to Wednesday at 12:15 PM is 2 days 3 hours 15 minutes, or 51.25 hours.",
        "It counts by the calendar and the clock, so every day is 24 hours. It doesn't adjust for the hour gained or lost when clocks change for daylight saving time.",
      ],
    },
  ],
  faq: [
    { q: "How many hours is 9 to 5?", a: "8 hours. With an unpaid 30-minute lunch it's 7 hours 30 minutes, or 7.5 in decimal hours." },
    {
      q: "What if my end time is after midnight?",
      a: "Enter it as it is. An end time earlier than the start is counted as the next day, so 10:00 PM to 2:00 AM is 4 hours.",
    },
    {
      q: "What happens if the start and end are the same?",
      a: "The answer is 0 minutes. For a full 24 hours, use Between two dates and set the end to the next day.",
    },
    {
      q: "Does it count daylight saving time?",
      a: "No. Every day is counted as 24 hours. If the clocks change between your start and end, the real time is an hour more or less than the answer.",
    },
    { q: "Is what I enter saved?", a: "Yes, in this browser only, so your usual start and end times are here next time. Nothing is sent to Beans." },
  ],
  beans: {
    heading: "Give every task its own stretch of the day",
    body: "Beans is a daily planner. Drag a task onto the Timebox to give it a start time, then resize its block to the time it needs. Anything you don't finish moves to the next day at midnight.",
    pose: "timebox",
  },
  related: ["time-calculator", "time-card-calculator", "hours-to-decimal", "date-calculator"],
  saves: true,
  lastModified: "2026-11-11",
};
