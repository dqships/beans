import type { ToolDef } from "../types";

export const stopwatch: ToolDef = {
  slug: "stopwatch",
  group: "timers",
  name: "Stopwatch",
  blurb: "Time anything to the hundredth of a second, with laps and the fastest and slowest marked.",
  title: "Online Stopwatch with Laps: free, runs in your browser",
  description: "A free online stopwatch with laps. Start, stop and reset, time to the hundredth of a second, and see each lap's time with the fastest and slowest marked.",
  h1: "Online stopwatch",
  lede: "Press Start to time anything, to the hundredth of a second. Press Lap to mark a lap without stopping the clock.",
  steps: [
    "Press Start. The stopwatch counts minutes, seconds and hundredths, and adds hours after 60 minutes.",
    "Press Lap each time a lap ends. The list shows that lap's own time and the total so far, newest first.",
    "Press Stop to hold the time. Press Start again to carry on from where it stopped.",
    "Press Reset to clear the time and the laps.",
  ],
  sections: [
    {
      heading: "How an online stopwatch stays accurate",
      body: [
        "This stopwatch doesn't count ticks. It notes the moment you press Start and works the time out from your device's clock each time it redraws. So when the tab sits in the background and the browser slows the page down, the time is still right when you come back.",
        "Laps and Stop work the same way: each reads the clock at the moment you press the button. How close that is to the real moment depends on your reactions and your device, as with any stopwatch you press by hand.",
      ],
    },
    {
      heading: "A stopwatch with laps: lap time and total",
      body: [
        "Each row in the lap list has two numbers. Lap time is how long that one lap took. Total is the time on the stopwatch when you pressed Lap, which some watches call the split.",
        "Once you have three laps, the quickest is marked Fastest and the longest Slowest, so you can see how your pace changed. If two laps tie, the earlier one gets the mark. The stopwatch holds up to 200 laps.",
      ],
    },
  ],
  faq: [
    { q: "Is this stopwatch free?", a: "Yes. It's a free online stopwatch that runs in your browser. No account, no download." },
    {
      q: "Does the stopwatch keep running in a background tab?",
      a: "Yes. It works the time out from your device's clock, so switching tabs or minimizing the window doesn't make it lose time. The running time also shows in the tab's title.",
    },
    {
      q: "What's the difference between a lap and a split?",
      a: "A lap time is the time for one lap on its own. A split is the total time from the start to that point. The list here shows both, as Lap time and Total.",
    },
    { q: "Are my times saved?", a: "No. The time and the laps are cleared when you press Reset, reload or close the page. Copy down anything you want to keep." },
    { q: "How precise is it?", a: "It shows hundredths of a second. The browser reads the clock in milliseconds, so the limits are the display and how fast you press the button." },
  ],
  beans: {
    heading: "Time your tasks as well as your laps",
    body: "Beans is a daily planner where every task can have an estimate and a timer. Run the timer while you work, and Beans can fill in how long the task really took, next to how long you guessed.",
    pose: "focus",
  },
  related: ["countdown-timer", "pomodoro-timer", "break-timer", "time-blocking-planner"],
  lastModified: "2026-11-11",
};
