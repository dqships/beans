import type { ToolDef } from "../types";

export const breakTimer: ToolDef = {
  slug: "break-timer",
  group: "timers",
  name: "Break timer",
  blurb: "Work, break, repeat. Pick 52/17, 50/10, 25/5 or the 20-20-20 rule and let it cycle.",
  title: "Break Timer: 20-20-20, 52/17 and custom work breaks",
  description: "A free break timer that repeats by itself. Choose 52/17, 50/10, 25/5 or the 20-20-20 rule, or set your own lengths, and get a chime at each change.",
  h1: "Break timer",
  lede: "Pick how long to work and how long to rest. The timer runs one after the other and keeps going until you stop it, with a chime each time you switch.",
  steps: [
    "Choose a pattern: 52 / 17, 50 / 10, 25 / 5 or 20-20-20. Choose Custom to type your own work and break minutes.",
    "Press Start and get to work. The time left shows in the browser tab.",
    "When the chime plays, take the break. The timer is already counting it.",
    "When the break ends, the next stretch of work starts by itself. A bean appears for each cycle you finish.",
    "Press Pause to hold the timer, or Reset to go back to the start.",
  ],
  sections: [
    {
      heading: "The 20-20-20 rule timer",
      body: [
        "The 20-20-20 rule is a habit for screen work: every 20 minutes, look at something 20 feet away for 20 seconds. Twenty feet is about 6 meters, so a window or the far side of the room does the job. Eye care groups such as the American Optometric Association suggest it as a way to rest your eyes from close focus.",
        "Choose 20-20-20 and this timer counts 20 minutes of work, chimes, counts the 20 seconds, then starts the next 20 minutes. It's a rule of thumb, not medical advice. If your eyes hurt or your sight changes, see an eye doctor.",
      ],
    },
    {
      heading: "The 52/17 rule and other work break timers",
      body: [
        "The 52/17 pattern is 52 minutes of work followed by a 17-minute break. It comes from DeskTime, a time-tracking app, which looked at its own most productive users in 2014 and reported that they tended to work and rest in about those amounts. That's one company's look at its own data, not a controlled study, so treat it as a starting point.",
        "50/10 is the same idea rounded to fit an hour, which is easy to line up with a calendar. 25/5 uses the lengths of the Pomodoro Technique. None of these is proven to be the best. Try one for a few days, notice when your attention drops, and use Custom to match it.",
      ],
    },
    {
      heading: "A reminder to take a break",
      body: [
        "A break you planned is easier to take than one you wait to feel like taking. Leave this tab open and the chime does the remembering. If you allow notifications when the browser asks, you'll also get one when the tab is hidden behind another.",
        "Many people find a break does more away from the screen: stand up, get some water, look out of a window.",
      ],
    },
  ],
  faq: [
    { q: "Does the timer repeat by itself?", a: "Yes. Work and break follow each other with no button press until you press Pause or Reset, or close the page." },
    {
      q: "What is the 20-20-20 rule?",
      a: "Every 20 minutes, look at something 20 feet (about 6 meters) away for 20 seconds. It's a rule of thumb for resting your eyes during screen work, not medical advice.",
    },
    {
      q: "What is the 52/17 rule?",
      a: "Work for 52 minutes, then take a 17-minute break. The numbers come from a 2014 look by the time-tracking app DeskTime at how its most productive users worked.",
    },
    {
      q: "Can I set my own work and break lengths?",
      a: "Yes. Choose Custom, then type the minutes: 1 to 180 for work and 1 to 60 for the break. Your pattern is saved in this browser.",
    },
    {
      q: "Will I hear it if I'm in another tab?",
      a: "Yes, as long as the page stays open and the chime is ticked. The count stays right because it follows your device's clock. Browsers slow hidden tabs down, so in a tab you haven't looked at for a while the chime can come up to a minute late.",
    },
  ],
  beans: {
    heading: "Plan the work between the breaks",
    body: "Beans is a daily planner. Drag today's tasks onto the Timebox to give each one a start time, then run the built-in timer or Pomodoro timer on the task you're doing.",
    pose: "focus",
  },
  related: ["pomodoro-timer", "countdown-timer", "time-blocking-planner", "stopwatch"],
  saves: true,
  lastModified: "2026-11-11",
};
