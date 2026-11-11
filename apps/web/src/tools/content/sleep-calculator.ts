import type { ToolDef } from "../types";

export const sleepCalculator: ToolDef = {
  slug: "sleep-calculator",
  group: "plan",
  name: "Sleep calculator",
  blurb: "Work out when to go to bed or when to wake up, counting in 90-minute sleep cycles.",
  title: "Sleep Calculator: bedtime and wake-up times by cycle",
  description:
    "A free sleep calculator. Enter when you need to wake up or when you're going to bed, and get times that fit whole 90-minute sleep cycles.",
  h1: "Sleep calculator",
  lede: "Tell it when you need to wake up and it gives you bedtimes that fit whole sleep cycles. Or give it a bedtime, or use the time right now, and get wake-up times.",
  steps: [
    "Choose what you know: when you need to wake up, when you're going to bed, or that you're going to sleep now.",
    "Set the time. For going to sleep now, the calculator reads the time from your device.",
    "Change the minutes it takes you to fall asleep if 15 isn't right for you.",
    "Pick one of the four times. The two with a sprouted bean give 7.5 or 9 hours of sleep.",
  ],
  sections: [
    {
      heading: "What time should I go to bed?",
      body: [
        "Count back from when you need to be up. This bedtime calculator takes your wake-up time, subtracts whole sleep cycles of 90 minutes, then subtracts the time it takes you to fall asleep. To wake at 7:00 am with 15 minutes to fall asleep, get into bed at 9:45 pm for six cycles or 11:15 pm for five.",
        "It also shows four and three cycles, for the nights that are going to be short whatever you do. Those give 6 and 4.5 hours of sleep. They're marked as shorter than 7.5 hours, and they aren't meant as a habit.",
      ],
    },
    {
      heading: "How a sleep cycle calculator works",
      body: [
        "Sleep runs in cycles that move through lighter sleep, deep sleep and REM sleep. A cycle averages about 90 minutes in adults, though it varies between people and through the night. The idea behind a sleep cycle calculator is that waking near the end of a cycle, in lighter sleep, tends to feel better than being pulled out of deep sleep.",
        "Real cycles aren't exactly 90 minutes, so treat the times as a rule of thumb. If a suggested time doesn't feel right after a few nights, shift it by 15 minutes and try again. This tool is not medical advice. If you're often tired after a full night, talk to a doctor.",
      ],
    },
    {
      heading: "Wake up time calculator: how much sleep is enough?",
      body: [
        "Health guidance for adults is at least 7 hours a night, and the range most often given is 7 to 9. Five cycles of 90 minutes is 7.5 hours and six is 9, which is why those two wake-up times are marked. Teenagers and children need more.",
      ],
    },
  ],
  faq: [
    {
      q: "How long is a sleep cycle?",
      a: "About 90 minutes on average for adults. It varies from person to person and from one cycle to the next, so the calculator's times are estimates.",
    },
    {
      q: "Why does it add 15 minutes?",
      a: "That's the time allowed to fall asleep after getting into bed. Change it to match how long it usually takes you, from 0 to 120 minutes.",
    },
    {
      q: "Is 6 hours of sleep enough?",
      a: "It's four cycles, and it's less than the 7 or more hours that health guidance gives for adults. It's shown for short nights, not as a target.",
    },
    {
      q: "Is this medical advice?",
      a: "No. It's arithmetic on an average. If you have trouble sleeping or feel tired most days, a doctor is the right person to ask.",
    },
    { q: "Does the calculator save my times?", a: "Your times and settings are kept in this browser. Nothing is sent to Beans." },
  ],
  beans: {
    heading: "Close out the day before you go to bed",
    body: "Beans is a daily planner. Its daily wrap-up is an optional ritual for ending the day, and anything you didn't finish rolls to today at your local midnight with a Rolled over tag, so the list is waiting for you in the morning.",
    pose: "rollover",
  },
  related: ["time-blocking-planner", "daily-planner-template", "hours-in-a-week"],
  saves: true,
  lastModified: "2026-11-11",
};
