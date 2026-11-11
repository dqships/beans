import type { ToolDef } from "../types";

export const dateCalculator: ToolDef = {
  slug: "date-calculator",
  group: "time",
  name: "Date calculator",
  blurb: "Count the days between two dates, add or subtract days, weeks or months, or count down to a date.",
  title: "Date Calculator: days between dates, add or subtract",
  description:
    "A free date calculator. Count the days and weekdays between two dates, add or subtract days, weeks or months, and see how many days until a date.",
  h1: "Date calculator",
  lede: "Count the days between two dates, add or take away days, weeks or months from a date, or see how many days are left until one. Weekdays are counted too.",
  steps: [
    "Pick what you want to work out: the days between two dates, a date plus or minus some time, or the days until a date.",
    "Choose the dates. The first date starts as today, and you can change it.",
    "For days between, check the box if the last day should count too, as it does for a trip or a stay.",
    "To add or subtract, type a number and choose days, weekdays, weeks or months.",
    "Read the answer on the top line. Under it is the same span in weeks, in months and in weekdays.",
  ],
  sections: [
    {
      heading: "How to count the days between two dates",
      body: [
        "The day counter takes the later date minus the earlier one. From November 9 to November 13 is 4 days: the 9th counts and the 13th doesn't, the same way a meeting from 9:00 to 13:00 lasts 4 hours. If both ends should count, as with a hire that runs through the last day, check Count the end date too and the answer is 5.",
        "The same span is also shown as weeks and days, and as calendar months and days. Months are counted first: January 15 to March 20 is 2 months and 5 days. Leap years are handled, so February 29 is counted in the years that have one.",
      ],
    },
    {
      heading: "Business days calculator: counting weekdays only",
      body: [
        "The weekday count is the number of Mondays to Fridays in the span, with Saturdays and Sundays left out. A full week has 5. To add days to a date in working days, choose weekdays as the unit: 10 weekdays after a Wednesday is the Wednesday two weeks later.",
        "The calculator doesn't know public holidays, because they differ by country, region and employer. If a holiday falls inside your span, take it off the weekday count yourself. For a deadline given in business days, move the answer one weekday later for each holiday in the way.",
      ],
    },
    {
      heading: "How many days until a date",
      body: [
        "Choose Days until and pick the date. You get the days from today, the same span in weeks, and the weekdays left. The weekday count includes today and stops before the date itself. Today is read from your device, so the count is right for your time zone and moves on at your local midnight. A date in the past shows how many days ago it was.",
      ],
    },
  ],
  faq: [
    {
      q: "Does the count include the end date?",
      a: "Not unless you ask. By default the first day counts and the last doesn't, so Monday to Friday is 4 days. Check Count the end date too to make it 5.",
    },
    {
      q: "Does the business days count skip public holidays?",
      a: "No. It skips Saturdays and Sundays only. Holidays differ from place to place, so subtract any that fall in your span.",
    },
    {
      q: "What happens when I add a month to the 31st?",
      a: "If the month you land in is shorter, you get its last day. January 31 plus 1 month is February 28, or February 29 in a leap year.",
    },
    {
      q: "How many weekdays are in a year?",
      a: "260 or 261 in a year of 365 days, depending on the day it starts on. 2026 has 261. A leap year has 260, 261 or 262.",
    },
    { q: "Is anything I enter saved?", a: "Your dates and settings are kept in this browser, so they're here next time. Nothing is sent to Beans." },
  ],
  beans: {
    heading: "Put the deadline on the day it's due",
    body: "Beans is a daily planner. Give a task a due date, then drag it onto the day you'll work on it. The board has one column per day and keeps scrolling, so you can plan weeks ahead. Anything you don't finish rolls to today at your local midnight.",
    pose: "planning",
  },
  related: ["time-duration-calculator", "time-zone-meeting-planner", "time-calculator", "countdown-timer"],
  saves: true,
  lastModified: "2026-11-11",
};
