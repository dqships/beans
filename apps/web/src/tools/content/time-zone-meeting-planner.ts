import type { ToolDef } from "../types";

export const timeZoneMeetingPlanner: ToolDef = {
  slug: "time-zone-meeting-planner",
  group: "time",
  name: "Time zone meeting planner",
  blurb: "Pick up to five places and see what a time is in each, with the hours when everyone is at work.",
  title: "Time Zone Meeting Planner: find a time that works",
  description:
    "A free time zone converter and meeting planner. Pick two to five places, set a date and time, and see the hours when everyone is in working hours.",
  h1: "Time zone meeting planner",
  lede: "Choose the places people are in, set a date and a time, and see what that moment is in each place. The strips show when working hours overlap.",
  steps: [
    "The first place starts as your own time zone. Change the second place to where the other person is, and add up to three more.",
    "Set the date of the meeting. Daylight saving is worked out for that date, so use the real day.",
    "Set a time in the first place, or click an hour on the top strip.",
    "Read each place's local time and date. A note shows where it's already the next day or still the previous one.",
    "Look for the green hours on the strips. Those are the hours when every place is between 9:00 and 17:00.",
  ],
  sections: [
    {
      heading: "How to find the best time to meet across time zones",
      body: [
        "Start from working hours. Each strip marks 9:00 to 17:00 in that place, and the hours where every strip is marked turn green. For New York and London that's 9:00 to 12:00 in New York, which is 14:00 to 17:00 in London, for most of the year.",
        "Sometimes there's no shared hour. New York and Tokyo never overlap inside a 9:00 to 17:00 day. Then pick the least bad hour, early morning for one side and evening for the other, and take turns on who gets the awkward end.",
      ],
    },
    {
      heading: "Time zone converter: why the date matters",
      body: [
        "The gap between two places isn't fixed. Many countries move their clocks an hour for part of the year, and they don't all change on the same day. The United States changes on the second Sunday of March and the first Sunday of November. Most of Europe changes on the last Sunday of March and the last Sunday of October. In the weeks between those dates, New York and London are 4 hours apart, not 5.",
        "Places south of the equator, such as Sydney, shift the other way round. Others, such as India, Japan and most of Arizona, don't change at all. This time zone calculator uses your browser's time zone data for the date you pick, so those weeks come out right.",
      ],
    },
    {
      heading: "Reading the world clock strips",
      body: [
        "Each column is one hour of the day in the first place, and one moment everywhere. Read down a column to see what that hour is in the other places. Yellow hours are inside 9:00 to 17:00 local time, green hours are when everyone is, and the outlined column is the time you set. A short day name marks where a place crosses midnight.",
        "Places with half-hour offsets, such as India at UTC+5:30, show times like 14:30. An hour only counts as working time when all of it falls inside 9:00 to 17:00.",
      ],
    },
  ],
  faq: [
    {
      q: "Which place is the time set in?",
      a: "The first one on the list. It starts as your own time zone. Pick a different first place to set the time somewhere else.",
    },
    {
      q: "Does it handle daylight saving time?",
      a: "Yes. Offsets are worked out for the date you choose, from the time zone data in your browser. Use the date of the meeting itself, because the gap between two places can change during the year.",
    },
    {
      q: "What do next day and previous day mean?",
      a: "At the moment you picked, that place's calendar is a day ahead of or behind the first place. 20:00 on Tuesday in New York is already Wednesday in Tokyo.",
    },
    {
      q: "Can I change the working hours?",
      a: "No. The strips always mark 9:00 to 17:00 in each place. You can still read any hour on the strips and set a time outside that range.",
    },
    {
      q: "Are my places saved?",
      a: "Yes, in this browser, along with the 12-hour or 24-hour choice. The date and time start fresh each visit. Nothing is sent to Beans.",
    },
  ],
  beans: {
    heading: "Once the time is set, block it out",
    body: "Beans is a daily planner. The Timebox shows the day's hours as a beanstalk. Drag a task onto it to give it a start time, resize the block to fit, and a checked-off bean marks the current time.",
    pose: "timebox",
  },
  related: ["date-calculator", "time-duration-calculator", "time-calculator", "weekly-schedule-maker"],
  wide: true,
  saves: true,
  lastModified: "2026-11-11",
};
