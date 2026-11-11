import type { ToolDef } from "../types";

export const brainDump: ToolDef = {
  slug: "brain-dump",
  group: "tasks",
  name: "Brain dump",
  blurb: "Empty your head into a pile, then sort it into today, this week, later and let go.",
  title: "Brain Dump: a free tool to empty your head and sort it",
  description:
    "Do a brain dump in your browser. Type everything on your mind, then sort each thought into today, this week, later or let go. Free, with no account.",
  h1: "Brain dump",
  lede: "Type everything that's on your mind, one thing at a time, without sorting it. When your head is empty, send each thought to today, this week, later or let go.",
  steps: [
    "Type one thought and press Enter. Don't judge it or put it in order.",
    "Keep going until nothing else comes. Tasks, worries, ideas and errands all count.",
    "Go down the pile and send each thought to Today, This week, Later or Let go.",
    "Copy the sorted list or print it, then start on Today.",
  ],
  sections: [
    {
      heading: "What is a brain dump?",
      body: [
        "A brain dump is writing down everything you're holding in your head, all at once, with no order and no editing. Tasks, half-formed ideas, things you're afraid you'll forget: all of it goes on the page. The aim is to stop using your memory as a to-do list.",
        "It has two parts, and it works best when you keep them apart. First you capture, as fast as you can. Only then do you sort. Sorting while you write slows you down, and the thoughts at the back of the line never make it out.",
      ],
    },
    {
      heading: "How to do a brain dump",
      body: [
        "Set aside ten minutes with no interruptions. Write one thought per line and keep each one short: a few words is enough to remember what you meant. When you run dry, look around for prompts. Your inbox, your calendar, the room you're in and the people you owe a reply will each shake a few more loose.",
        "Then sort. For each thought, ask when it needs you. Today means you'll do it before the day is over. This week means it has a place in the next few days. Later is for things worth keeping that have no date. Let go is for the ones you can now see you won't do.",
      ],
    },
    {
      heading: "A brain dump template you can print",
      body: [
        "Press Print with nothing typed and you get a brain dump worksheet: blank lines for the pile and for each of the four groups. Print after sorting and you get your brain dump list, grouped under Today, This week, Later and Let go.",
      ],
    },
  ],
  faq: [
    { q: "How long should a brain dump take?", a: "Set aside ten to fifteen minutes. Stop when a minute goes by with nothing new to add." },
    { q: "How often should I do a brain dump?", a: "Whenever your head feels full. A common routine is one at the start of the week and a short one at the end of each workday." },
    { q: "Can I paste a list in?", a: "Yes. Paste several lines into the box and each line becomes its own thought. Bullets and numbers at the start of a line are dropped." },
    { q: "What is Let go for?", a: "Things you've decided not to do. They stay on the list so you can see what you dropped, and you can move one back if you change your mind." },
    { q: "Where are my thoughts saved?", a: "In this browser, on this device. Nothing you type is sent to Beans or anywhere else. The pile holds up to 300 thoughts." },
  ],
  beans: {
    heading: "Beans has a Brain Dump of its own",
    body: "Beans is a daily planner. Its Brain Dump holds every task that has no date yet. When you know which day you'll do one, drag it onto that day. Whatever you don't finish moves to the next day at midnight.",
    pose: "brain-dump",
  },
  related: ["to-do-list", "eisenhower-matrix", "daily-planner-template", "time-blocking-planner"],
  saves: true,
  lastModified: "2026-11-11",
};
