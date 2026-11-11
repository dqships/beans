import type { ToolDef } from "../types";

export const hoursToDecimal: ToolDef = {
  slug: "hours-to-decimal",
  group: "time",
  name: "Hours to decimal converter",
  blurb: "Turn hours and minutes into decimal hours for a timesheet, or decimal hours back into time.",
  title: "Hours to Decimal Calculator: convert minutes to hours",
  description: "Convert hours and minutes to decimal hours, or decimal hours back to hours and minutes. Includes a minutes to decimal chart: 15 minutes is 0.25 hours.",
  h1: "Hours and minutes to decimal hours",
  lede: "Type a time and get it as decimal hours, the way timesheets and invoices want it. Or type decimal hours and get hours and minutes back.",
  steps: [
    "To turn a time into a decimal, type the hours, minutes and seconds on the left. Leave blank any you don't need.",
    "Read the answer under Decimal hours. It's rounded to 2 decimal places, with the total minutes beside it.",
    "To go the other way, type decimal hours on the right, such as 7.75. The answer shows as hours and minutes.",
    "For a quick look-up, use the table under the converter.",
  ],
  sections: [
    {
      heading: "How to convert minutes to hours as a decimal",
      body: [
        "Divide the minutes by 60. 15 minutes is 15 ÷ 60 = 0.25 hours, 30 minutes is 0.5 and 45 minutes is 0.75. For a time with hours as well, keep the hours and add the minutes as a decimal: 7 hours 45 minutes is 7 + 0.75 = 7.75 hours.",
        "Seconds work the same way with 3,600, the number of seconds in an hour. 1 hour 30 minutes 36 seconds is 1 + 30 ÷ 60 + 36 ÷ 3,600 = 1.51 hours.",
      ],
    },
    {
      heading: "15 minutes in decimal, and other common values",
      body: [
        "15 minutes is 0.25 hours. 6 minutes is 0.1, 20 minutes is 0.33, 30 minutes is 0.5, 40 minutes is 0.67 and 45 minutes is 0.75. Values like 20 and 40 minutes don't divide evenly, so they're rounded to 2 decimal places.",
        "This is why 7:30 on a timesheet is 7.5 hours and not 7.3. The part after the colon counts minutes out of 60, and the part after the decimal point counts hundredths of an hour.",
      ],
    },
    {
      heading: "Time to decimal and back: decimal hours to minutes",
      body: [
        "Keep the whole number as the hours, then multiply the decimal part by 60 to get the minutes. 2.4 hours is 2 hours and 0.4 × 60 = 24 minutes. If that leaves a decimal part of a minute, multiply it by 60 again for the seconds.",
        "A decimal that was rounded won't always come back to a round number. 0.33 hours is 19 minutes 48 seconds, because 20 minutes is really 0.3333 and so on.",
      ],
    },
  ],
  faq: [
    { q: "What is 15 minutes in decimal hours?", a: "0.25. Fifteen minutes is a quarter of an hour, and 15 ÷ 60 = 0.25." },
    {
      q: "Why do timesheets use decimal hours?",
      a: "Because pay is hours multiplied by a rate, and 7:45 can't be multiplied as it stands. As a decimal it can: 7.75 hours at 20 an hour is 155.",
    },
    {
      q: "How many decimal places should I use?",
      a: "Two is the usual choice for timesheets and invoices, and it's what this decimal hours calculator shows. Two places is never more than 18 seconds off.",
    },
    { q: "What is 1 hour 30 minutes as a decimal?", a: "1.5 hours. The 30 minutes is half an hour, so it becomes 0.5." },
    { q: "Can I type more than 59 minutes?", a: "Yes. 90 minutes comes out as 1.5 hours, and 150 minutes as 2.5." },
  ],
  beans: {
    heading: "See where your hours go in Beans",
    body: "Beans is a daily planner that keeps an estimate and the actual time for each task. Run its timer while you work, then open Analytics to see your time by label.",
    pose: "analytics",
  },
  related: ["time-card-calculator", "time-calculator", "time-duration-calculator", "date-calculator"],
  lastModified: "2026-11-11",
};
