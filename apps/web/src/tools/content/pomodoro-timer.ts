import type { ToolDef } from "../types";

export const pomodoroTimer: ToolDef = {
  slug: "pomodoro-timer",
  group: "timers",
  name: "Pomodoro timer",
  blurb: "25 minutes of focus, then a 5-minute break, with a longer break after every fourth round.",
  title: "Pomodoro Timer: a free online 25-minute focus timer",
  description:
    "A free Pomodoro timer in your browser. Work for 25 minutes, take a 5-minute break, and get a longer break after four rounds. Change any length.",
  h1: "Pomodoro timer",
  lede: "Work on one thing for 25 minutes, then take 5 off. After four rounds, take a longer break. Press Start and the timer keeps track of where you are.",
  steps: [
    "Type what you're going to work on, so the round has one job.",
    "Press Start and work on only that until the chime.",
    "Take the 5-minute break when it comes. Stand up and look away from the screen.",
    "After four rounds, take the 15-minute break, then start again.",
  ],
  sections: [
    {
      heading: "What is the Pomodoro Technique?",
      body: [
        "The Pomodoro Technique is a way to work in short, timed rounds. Francesco Cirillo came up with it in the late 1980s as a student, using a kitchen timer shaped like a tomato. Pomodoro is Italian for tomato, and each 25-minute round is called a pomodoro.",
        "The method has five steps: pick one task, set a timer for 25 minutes, work until it rings, take a 5-minute break, and after four rounds take a longer break of 15 to 30 minutes.",
      ],
    },
    {
      heading: "Why 25 minutes?",
      body: [
        "Twenty-five minutes is short enough to start without dread and long enough to get somewhere. Nothing is special about the number, though. If 25 feels too short for the work in front of you, try 50 minutes with a 10-minute break. Open Settings under the timer to change any length.",
      ],
    },
    {
      heading: "What to do when you're interrupted",
      body: [
        "If something pulls at you mid-round, write it down and go back to the task. If you have to stop, the round doesn't count: reset it and start a fresh one later. A round belongs to one task from start to finish, and that's what makes it work.",
      ],
    },
  ],
  faq: [
    { q: "How long is a Pomodoro?", a: "25 minutes of work, followed by a 5-minute break. After four of them, the break is 15 to 30 minutes." },
    {
      q: "Does the timer keep running if I switch tabs?",
      a: "Yes. It keeps time by your computer's clock, so it stays right in a background tab. The time left shows in the tab's title, and a chime plays when a round ends. Browsers slow hidden tabs down, so the chime can come up to a minute late.",
    },
    {
      q: "Can I change the lengths?",
      a: "Yes. Open Settings to set the focus time, both breaks and how many rounds come before a long break. Your choices are saved in this browser.",
    },
    { q: "Do I need an account?", a: "No. The timer works without signing up, and nothing you type is sent anywhere." },
    {
      q: "How many Pomodoros fit in a day?",
      a: "Eight rounds is 3 hours 20 minutes of focused work, plus breaks. Sixteen is a very full day. Plan for fewer than you think, because meetings and email take their share.",
    },
  ],
  beans: {
    heading: "The same timer, on every task in Beans",
    body: "Beans is a daily planner with a Pomodoro timer built in. Start it from any task on your list, and Beans can log how long the task really took.",
    pose: "focus",
  },
  related: ["countdown-timer", "break-timer", "time-blocking-planner", "to-do-list"],
  saves: true,
  lastModified: "2026-11-11",
};
