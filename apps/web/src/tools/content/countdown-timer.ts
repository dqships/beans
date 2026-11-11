import type { ToolDef } from "../types";

export const countdownTimer: ToolDef = {
  slug: "countdown-timer",
  group: "timers",
  name: "Countdown timer",
  blurb: "Set hours, minutes and seconds, press Start, and hear a chime when the time is up.",
  title: "Countdown Timer: a free online timer with a visual ring",
  description: "A free online countdown timer. Set any length or pick a preset such as 5 or 10 minutes, then watch the ring fill. A chime plays when time is up.",
  h1: "Countdown timer",
  lede: "Set a timer for any length, from one second to 99 hours. The ring fills as the time runs down, and a chime plays when it reaches zero.",
  steps: [
    "Pick a quick length such as 10 min, or type hours, minutes and seconds in the fields under the timer.",
    "Press Start. The time left also shows in the browser tab, so you can work in another one.",
    "Press Pause to hold the time and Resume to carry on. Reset puts the full length back.",
    "When the chime plays and the timer says Time's up, press Start again to run the same length once more.",
  ],
  sections: [
    {
      heading: "How to set a timer for 10 minutes",
      body: [
        "Press the 10 min button above the timer, then press Start. The quick buttons cover 1, 5, 10, 15, 20, 30, 45 and 60 minutes.",
        "For any other length, use the Hours, Minutes and Seconds fields. A 90-second timer is 1 minute and 30 seconds. A 2-hour timer is 2 in the Hours field. The longest the timer runs is 99 hours, 59 minutes and 59 seconds.",
      ],
    },
    {
      heading: "A visual timer you can read at a glance",
      body: [
        "The ring around the leaf is the visual part. It starts empty and fills as time passes, and the leaf in the middle grows with it. You can see about how much time is gone without reading the numbers, which helps when the timer is across the room or on a shared screen.",
        "That makes it handy for classrooms, meetings, cooking and timed practice, where seeing time pass matters more than the exact figure.",
      ],
    },
    {
      heading: "An online timer that keeps going in the background",
      body: [
        "The timer keeps time by your device's clock instead of counting ticks, so it stays right when the tab is in the background or the browser slows the page down. Leave the tab open, though: closing it stops the timer.",
        "If you allow notifications when the browser asks, you'll get one when the time is up and you're looking at another tab.",
      ],
    },
  ],
  faq: [
    { q: "Is this timer free?", a: "Yes. It's a free online timer with no account and no download. Open the page and press Start." },
    {
      q: "Will the timer work if I switch tabs?",
      a: "Yes. It keeps time by your device's clock, so it stays right in a background tab, and the time left shows in the tab's title. Browsers slow hidden tabs down, so in a tab you haven't looked at for a while the chime can come up to a minute late.",
    },
    { q: "Can I turn the sound off?", a: "Yes. Untick Chime when time is up under the timer. Your choice is saved in this browser, along with the last length you set." },
    { q: "What's the longest timer I can set?", a: "99 hours, 59 minutes and 59 seconds. The shortest is 1 second." },
    { q: "Does the timer keep running if I close the page?", a: "No. Closing or reloading the page stops it. The length you set is remembered, so you can start it again." },
  ],
  beans: {
    heading: "A timer on every task in Beans",
    body: "Beans is a daily planner with a timer and a Pomodoro timer built in. Start one from any task on your list, and Beans can fill in how long the task really took.",
    pose: "focus",
  },
  related: ["pomodoro-timer", "break-timer", "stopwatch", "time-blocking-planner"],
  saves: true,
  lastModified: "2026-11-11",
};
