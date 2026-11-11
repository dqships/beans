import type { ToolDef } from "../types";

export const eisenhowerMatrix: ToolDef = {
  slug: "eisenhower-matrix",
  group: "tasks",
  name: "Eisenhower matrix",
  blurb: "Sort tasks by urgent and important into four quadrants: do first, schedule, delegate, drop.",
  title: "Eisenhower Matrix: a free online template to print",
  description:
    "A free Eisenhower matrix in your browser. Sort tasks by urgent and important into four quadrants: do first, schedule, delegate or drop. Print it.",
  h1: "Eisenhower matrix",
  lede: "Sort your tasks with two questions: is it urgent, and is it important? The answers put each task in one of four quadrants and tell you what to do with it.",
  steps: [
    "Take one task and ask if it's important: does it move something you care about?",
    "Ask if it's urgent: does it have to happen today or tomorrow?",
    "Add it to the quadrant that matches. If you change your mind, use the menu beside a task to move it.",
    "Work through Do first, give each task in Schedule a day, hand off what's in Delegate, and cross out Drop.",
  ],
  sections: [
    {
      heading: "What is the Eisenhower matrix?",
      body: [
        "The Eisenhower matrix is a priority matrix with two axes, urgent and important, which make four quadrants. Tasks that are urgent and important, you do first. Important tasks that aren't urgent, you schedule. Urgent tasks that aren't important, you delegate. Tasks that are neither, you drop.",
        "It's named after Dwight D. Eisenhower, the 34th president of the United States. In a 1954 speech he quoted a former college president who said that \"the urgent are not important, and the important are never urgent.\" Stephen Covey popularized the four-quadrant form in his 1989 book The 7 Habits of Highly Effective People. It's also called the Eisenhower box and the urgent-important matrix.",
      ],
    },
    {
      heading: "How to use the urgent-important matrix",
      body: [
        "Urgent means there's a deadline close enough to feel, or someone is waiting on you. Important means it moves a goal you'd still care about a year from now. The two get mixed up because urgent things are loud. A ringing phone is urgent. Whether it's important depends on who is calling.",
        "Do first tends to fill up without any help. The quadrant worth protecting is Schedule: important work with no deadline, which gets pushed aside until it turns urgent. Give each task there a day and a time. If you have no one to delegate to, treat Delegate as a batch: do those tasks quickly, together, at a set time.",
      ],
    },
    {
      heading: "An Eisenhower matrix template to print",
      body: [
        "Press Print and the four quadrants come out as a two-by-two grid on one page, with an empty bean beside each task to check off by hand. A quadrant with no tasks prints with blank lines, so an empty matrix works as a printable Eisenhower matrix template.",
      ],
    },
  ],
  faq: [
    { q: "What are the four quadrants of the Eisenhower matrix?", a: "Do first (urgent and important), Schedule (important, not urgent), Delegate (urgent, not important) and Drop (not urgent, not important)." },
    { q: "What's the difference between urgent and important?", a: "Urgent is about time: it needs attention soon. Important is about results: it matters to a goal of yours. A task can be one, both or neither." },
    {
      q: "Did Eisenhower invent the matrix?",
      a: "He supplied the idea, not the grid. In a 1954 speech he quoted a former college president on the difference between urgent and important problems. Stephen Covey popularized the four-quadrant form in 1989.",
    },
    { q: "How many tasks should go in each quadrant?", a: "Keep Do first short enough to finish today. If it holds more than a handful, some of those tasks belong in Schedule. Each quadrant here holds up to 50." },
    { q: "Where is my matrix saved?", a: "In this browser, on this device. Nothing is sent to Beans, and no account is needed." },
  ],
  beans: {
    heading: "After the matrix, give the important tasks a time",
    body: "Beans is a daily planner. Tasks have a priority and a due date, and the Timebox shows the day's hours, so you can drag each task you chose to schedule onto a time. Whatever you don't finish moves to the next day at midnight.",
    pose: "planning",
  },
  related: ["to-do-list", "brain-dump", "time-blocking-planner", "daily-planner-template"],
  wide: true,
  saves: true,
  lastModified: "2026-11-11",
};
