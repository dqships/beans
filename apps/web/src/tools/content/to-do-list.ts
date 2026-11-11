import type { ToolDef } from "../types";

export const toDoList: ToolDef = {
  slug: "to-do-list",
  group: "tasks",
  name: "To-do list",
  blurb: "A plain to-do list that saves in your browser. Add tasks, check them off, print it.",
  title: "To-Do List: a free online list maker you can print",
  description:
    "Make a to-do list in your browser with no account. Add tasks, put them in order, check them off, then print the list or copy it. It saves as you type.",
  h1: "To-do list",
  lede: "Write down what you need to do, put it in order and check things off as you go. The list stays in this browser, so it's here when you come back.",
  steps: [
    "Name the list if you like: a day, a project, a trip.",
    "Type a task and press Enter. Keep going until your head is empty.",
    "Use the arrows to put the list in the order you'll do it.",
    "Click a bean to check a task off. Print the list or copy it when you need it somewhere else.",
  ],
  sections: [
    {
      heading: "How to write a to-do list that gets done",
      body: [
        "Start each task with a verb and make it small enough to finish in one sitting. \"Email Sam the budget\" gets done. \"Budget\" sits there for a week. If a task would take more than an hour or two, it's really a few tasks, so write those down instead.",
        "Then put the list in order and stop adding to today. Three to five real tasks is a full day for most jobs once meetings and messages are counted. Everything else can wait on the list without being today's problem.",
      ],
    },
    {
      heading: "A printable to-do list",
      body: [
        "Press Print and only the list goes on the paper: the name, each task and an empty bean to check off by hand. The buttons and the rest of this page are left out. Finished tasks print with a line through them, so clear them first if you want a clean sheet.",
      ],
    },
    {
      heading: "When a list stops being enough",
      body: [
        "A to-do list tells you what to do. It doesn't tell you when. If you end most days with half the list left, the list isn't the problem: nothing on it had a time. Giving each task a slot in the day is called time blocking, and the time blocking planner on this site does that part.",
      ],
    },
  ],
  faq: [
    { q: "Where is my list saved?", a: "In this browser, on this device. It isn't sent to Beans or anywhere else. It will be here when you come back, unless you clear your browser's site data." },
    { q: "Can I open my list on another device?", a: "Not from this tool, because the list never leaves your browser. Use Copy to paste it into a message or a note, or print it." },
    { q: "How many tasks can I add?", a: "Up to 200 on one list. If you have that many, it's worth sorting them first. The brain dump tool is made for that." },
    { q: "Can I edit a task after adding it?", a: "Yes. Click its text, change it and press Enter. Empty the text to delete the task." },
    { q: "Do I need to sign up?", a: "No. The list works without an account." },
  ],
  beans: {
    heading: "Turn the list into a plan for today",
    body: "Beans is a daily planner. Keep your whole to-do list in it, drag tasks onto the days you'll do them, then drag each one onto the Timebox to give it a time. Whatever you don't finish moves to the next day at midnight.",
    pose: "planning",
  },
  related: ["brain-dump", "eisenhower-matrix", "time-blocking-planner", "daily-planner-template"],
  saves: true,
  lastModified: "2026-11-11",
};
