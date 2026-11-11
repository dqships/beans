import type { ToolDef } from "../types";

export const timeBlockingPlanner: ToolDef = {
  slug: "time-blocking-planner",
  group: "plan",
  name: "Time blocking planner",
  blurb: "List today's tasks, guess how long each takes, then give every one a block of time.",
  title: "Time Blocking Planner: free daily schedule maker",
  description:
    "Plan your day in time blocks. List your tasks, give each a length, then drag them onto the hours. A free time blocking planner you can print.",
  h1: "Time blocking planner",
  lede: "List what you need to do today and how long each task takes. Then put every task on the hours, so your to-do list becomes a schedule you can follow.",
  steps: [
    "Add each task with a guess at how long it takes. Round up.",
    "Press Schedule to drop a task into the next gap, or drag it onto the hour you want.",
    "Drag a block to move it, and drag its lower edge to make it longer or shorter.",
    "Leave some gaps. Meetings run over and lunch takes time.",
    "Print the day or copy it, and check tasks off as you finish them.",
  ],
  sections: [
    {
      heading: "What is time blocking?",
      body: [
        "Time blocking means giving every task a start time and a length, the way a meeting has them. In place of a list you pick from all day, you have a schedule that says what you're doing at 10:00 and what comes after it.",
        "It works because a list hides how long things take. Eight tasks look fine on paper. Put them on the hours and you can see that they add up to eleven hours of work in a nine-hour day, while there's still time to move something to tomorrow.",
      ],
    },
    {
      heading: "A time blocking template for one day",
      body: [
        "A good day has three kinds of block. First, one or two long blocks for the work that needs your full attention, placed where your energy is best. Second, a short block or two for small things together: email, messages, quick calls. Third, real breaks, lunch included.",
        "Load the example day above to see the shape, then replace its tasks with yours. Change the hours shown if your day starts earlier or ends later, and print the result if you like a paper schedule on your desk.",
      ],
    },
    {
      heading: "Time blocking and timeboxing",
      body: [
        "The two words are often used for the same thing. Where people draw a line, time blocking is about reserving time for a task, and timeboxing adds a limit: when the box ends, you stop and move on, finished or not. This planner does both. The block reserves the time, and its end is your limit.",
      ],
    },
  ],
  faq: [
    {
      q: "What if a task takes longer than its block?",
      a: "Stop when the block ends and decide: stretch the block and move what follows, or give the rest a new block later. Do that on purpose and your day stays a plan. Let it slide and the schedule stops meaning anything.",
    },
    { q: "How long should a time block be?", a: "Long enough to finish something. 30 to 90 minutes suits most tasks. Group anything under 15 minutes into one shared block." },
    { q: "Can two blocks overlap?", a: "Yes. Overlapping blocks sit side by side, so you can see the clash and fix it. The total above the schedule counts overlapping time once." },
    { q: "Is my schedule saved?", a: "Yes, in this browser on this device. Nothing is sent to Beans. It will be here when you come back, unless you clear your browser's site data." },
    { q: "Does it work on a phone?", a: "Yes. On a phone, press Schedule to place a task in the next gap, or set its start time in the time field. Dragging is for a mouse or pen." },
  ],
  beans: {
    heading: "This is the Timebox in Beans",
    body: "Beans is a daily planner built around this idea. Your tasks live on a board with a column for every day, and you drag them onto the Timebox to give each a start time. A bean marks the current time, and anything you don't finish moves to the next day at midnight.",
    pose: "timebox",
  },
  related: ["daily-planner-template", "weekly-schedule-maker", "to-do-list", "pomodoro-timer"],
  saves: true,
  lastModified: "2026-11-11",
};
