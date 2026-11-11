import type { ToolDef } from "../types";

export const timeCardCalculator: ToolDef = {
  slug: "time-card-calculator",
  group: "time",
  name: "Time card calculator",
  blurb: "Add up a week of clock in and clock out times, take off breaks, and see total hours and gross pay.",
  title: "Time Card Calculator: weekly hours, breaks and pay",
  description:
    "A free time card calculator. Enter clock in, clock out and unpaid breaks for each day to get weekly hours, decimal hours, overtime and gross pay.",
  h1: "Time card calculator",
  lede: "Enter when you clocked in and out each day and how long your unpaid break was. You get each day's hours, the week's total, and gross pay if you add a rate.",
  steps: [
    "Enter Monday's clock in and clock out times. For a shift that ran past midnight, enter the times as they were: an out time earlier than the in time counts as the next day.",
    "Type the unpaid break in minutes, such as 30 for a half-hour lunch. Leave it empty for a paid break.",
    "Fill in the other days, or press Copy Monday to weekdays if Tuesday to Friday are the same.",
    "Read the week's total as hours and minutes and as decimal hours. Add an hourly rate to see gross pay, and check the overtime box if hours past 40 pay 1.5 times.",
    "Press Print for a clean time card with lines to sign.",
  ],
  sections: [
    {
      heading: "How a time card calculator with a lunch break works",
      body: [
        "For each day, the calculator takes the time from clock in to clock out and subtracts the unpaid break. A shift from 9:00 to 17:30 with a 30-minute lunch is 8 hours 30 minutes on the clock, less 30 minutes, which leaves 8 hours of paid time.",
        "If the out time is earlier than the in time, the shift is counted through midnight. Clock in at 22:00 and out at 6:00 and you get 8 hours. A break longer than the shift leaves 0 hours, never less.",
      ],
    },
    {
      heading: "How to work out hours worked as decimal hours",
      body: [
        "Payroll usually wants decimal hours, not hours and minutes. To convert, divide the minutes by 60 and add the result to the hours. 38 hours 45 minutes is 38.75 hours, because 45 divided by 60 is 0.75. This work hours calculator shows the week's total both ways, so you can copy whichever your timesheet asks for.",
        "Gross pay is decimal hours times the hourly rate. 38.75 hours at a rate of 20 is 775.00. Pay is shown as a plain number, in whatever currency your rate is in.",
      ],
    },
    {
      heading: "Overtime, taxes and what this timesheet calculator leaves out",
      body: [
        "With the overtime box checked, the first 40 hours of the week are paid at your rate and anything past 40 at 1.5 times. 45 hours at a rate of 20 is 800 of regular pay plus 150 of overtime pay, 950 in all.",
        "Overtime rules differ by place and by job. Some count overtime by the day, some use a different weekly limit or a different multiple, and some jobs are exempt. The calculator doesn't work out taxes or deductions either, so gross pay here is the amount before anything is taken off. Check your contract or your local labor office for the rules that apply to you.",
      ],
    },
  ],
  faq: [
    {
      q: "Does the time clock calculator handle night shifts?",
      a: "Yes. Enter the times as you worked them. When the clock out time is earlier than the clock in time, the shift is counted as ending the next day.",
    },
    { q: "How do I enter a lunch break?", a: "Type its length in minutes in the Break column. It's taken off that day's hours. Leave it empty for a paid break." },
    {
      q: "Does it work out taxes or deductions?",
      a: "No. Gross pay is your hours times your rate, with overtime if you check the box. Taxes, benefits and other deductions aren't included.",
    },
    {
      q: "How is overtime calculated?",
      a: "Only when you check the box. Then hours past 40 in the week are paid at 1.5 times the rate. Overtime rules differ by place, so check which ones apply to you.",
    },
    {
      q: "Is my time card saved?",
      a: "It's saved in this browser on this device, so it's still here when you come back. Nothing is sent to Beans. Clearing your browser's site data removes it.",
    },
  ],
  beans: {
    heading: "See where the hours went before the week ends",
    body: "Beans is a daily planner. Give each task an estimate, start the timer when you begin, and the actual time fills in from the timer. Analytics adds your time up by label, with a table view.",
    pose: "analytics",
  },
  related: ["time-duration-calculator", "hours-to-decimal", "time-calculator"],
  wide: true,
  saves: true,
  lastModified: "2026-11-11",
};
