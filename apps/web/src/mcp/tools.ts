import { z } from "zod";
import { api } from "@convex/_generated/api";
import type { FunctionReference } from "convex/server";
import { labelColors } from "@beans/tokens";

/**
 * The Beans MCP tools: names, titles, hints, input schemas and descriptions.
 * Each one calls the matching function in `convex/mcp.ts`. Descriptions say
 * what a tool does and nothing else.
 */

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").describe("A day, YYYY-MM-DD, in the person's time zone");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Use 24-hour HH:mm").describe("Start time, 24-hour HH:mm, such as 09:30");
const id = z.string().min(1).max(100);
const ids = z.array(id).min(1).max(50).describe("Task ids, up to 50");
const label = z.string().min(1).max(100).describe("Label name or id");
const list = z.string().min(1).max(100).describe("List name or id");
const minutes = z.number().min(0).max(1440);
const priority = z.enum(["high", "medium", "low"]);

type Mutation = FunctionReference<"mutation", "public">;

export interface BeansTool<S extends z.ZodObject = z.ZodObject> {
  name: string;
  title: string;
  description: string;
  /** Reading tools change nothing in the planner. */
  readOnly: boolean;
  input: S;
  fn: Mutation;
  /** The tool's input in the shape the Convex function takes. */
  args: (input: z.infer<S>) => Record<string, unknown>;
}

function tool<S extends z.ZodObject>(t: BeansTool<S>): BeansTool {
  return t as unknown as BeansTool;
}

const same = (input: Record<string, unknown>) => input;

export const TOOLS: BeansTool[] = [
  // ---------- Reading ----------
  tool({
    name: "get_overview",
    title: "Get planner overview",
    description:
      "Today's date and time in the person's time zone, their workday limit and week start, all lists (with open task counts) and labels with ids, today's task totals, the Brain Dump count, and how many unfinished tasks from the last 14 days are overdue.",
    readOnly: true,
    input: z.object({}),
    fn: api.mcp.getOverview,
    args: same,
  }),
  tool({
    name: "get_day",
    title: "Get a day",
    description:
      "One day's tasks in board order, with Timebox start times, estimates and actual time in minutes, and the day's totals against the workday limit.",
    readOnly: true,
    input: z.object({ date }),
    fn: api.mcp.getDay,
    args: same,
  }),
  tool({
    name: "get_week",
    title: "Get a week",
    description:
      "The whole week containing a date (today if left out), starting on the person's week start: each day's tasks and totals against the workday limit, plus the week's total estimate.",
    readOnly: true,
    input: z.object({ date: date.optional() }),
    fn: api.mcp.getWeek,
    args: same,
  }),
  tool({
    name: "list_tasks",
    title: "List tasks",
    description:
      "Tasks matching filters, as compact rows with ids. Place filters: a date range (from/to, up to 92 days), a list, or the Brain Dump; with no place filter it covers every undated task plus the last 30 and next 60 days. Also filters by label, done or not, and due date. Trash is left out.",
    readOnly: true,
    input: z.object({
      from: date.optional().describe("First day of a date range"),
      to: date.optional().describe("Last day of a date range"),
      list: list.optional(),
      brain_dump: z.boolean().optional().describe("Tasks in the Brain Dump"),
      label: label.optional(),
      done: z.boolean().optional(),
      due_by: date.optional().describe("Tasks due on or before this day"),
      limit: z.number().int().min(1).max(200).optional().describe("Rows to return, 100 by default"),
    }),
    fn: api.mcp.listTasks,
    args: ({ brain_dump, due_by, ...rest }) => ({ ...rest, brainDump: brain_dump, dueBy: due_by }),
  }),
  tool({
    name: "search_tasks",
    title: "Search tasks",
    description: "Finds tasks whose titles match words, anywhere in the planner except Trash.",
    readOnly: true,
    input: z.object({
      query: z.string().min(2).max(200),
      include_done: z.boolean().optional().describe("Include finished tasks (true by default)"),
      limit: z.number().int().min(1).max(50).optional().describe("Rows to return, 20 by default"),
    }),
    fn: api.mcp.searchTasks,
    args: ({ include_done, ...rest }) => ({ ...rest, includeDone: include_done }),
  }),
  tool({
    name: "get_task",
    title: "Get a task",
    description: "One task in full: notes as plain text, subtasks with ids, Timebox time, estimate, actual time, repeat rule, due date and priority.",
    readOnly: true,
    input: z.object({ id }),
    fn: api.mcp.getTask,
    args: same,
  }),
  tool({
    name: "get_analytics",
    title: "Get analytics",
    description:
      "For a date range of up to 366 days: finished tasks and tracked minutes in total, by label and per day, estimates against actual time, the finished tasks (up to 100), and how long undated tasks have been waiting.",
    readOnly: true,
    input: z.object({ from: date, to: date }),
    fn: api.mcp.getAnalytics,
    args: same,
  }),

  // ---------- Changing ----------
  tool({
    name: "create_tasks",
    title: "Create tasks",
    description:
      "Creates up to 50 tasks. Each goes on a day (date), into a list, or with neither into the Brain Dump. Optional: start time (needs a date), label, estimate in minutes, due date, priority, notes as plain text, and subtask titles. Returns the new tasks and each affected day's totals against the workday limit.",
    readOnly: false,
    input: z.object({
      tasks: z
        .array(
          z.object({
            title: z.string().min(1).max(500),
            date: date.optional(),
            list: list.optional(),
            start: time.optional(),
            label: label.optional(),
            estimate: minutes.optional().describe("Estimate in minutes"),
            due: date.optional().describe("Due date"),
            priority: priority.optional(),
            notes: z.string().max(10_000).optional().describe("Plain text. Lines starting with '- ' become bullets"),
            subtasks: z.array(z.string().min(1).max(500)).max(30).optional(),
          }),
        )
        .min(1)
        .max(50),
    }),
    fn: api.mcp.createTasks,
    args: same,
  }),
  tool({
    name: "update_task",
    title: "Update a task",
    description: "Changes a task's title, notes (plain text), label, estimate, actual time (minutes), due date or priority. Pass null to clear a field.",
    readOnly: false,
    input: z.object({
      id,
      title: z.string().min(1).max(500).optional(),
      notes: z.string().max(10_000).nullable().optional(),
      label: label.nullable().optional(),
      estimate: minutes.nullable().optional().describe("Estimate in minutes"),
      actual: minutes.optional().describe("Total actual time in minutes"),
      due: date.nullable().optional().describe("Due date"),
      priority: priority.nullable().optional(),
    }),
    fn: api.mcp.updateTask,
    args: same,
  }),
  tool({
    name: "update_subtasks",
    title: "Update subtasks",
    description:
      "Adds, ticks, unticks, renames, reorders or removes a task's subtasks, in the order given. Ticking the last open subtask checks off the task, as in the app.",
    readOnly: false,
    input: z.object({
      task_id: id,
      changes: z
        .array(
          z.object({
            action: z.enum(["add", "done", "undone", "rename", "move", "remove"]),
            id: id.optional().describe("Subtask id, for every action except add"),
            title: z.string().min(1).max(500).optional().describe("For add and rename"),
            index: z.number().int().min(0).max(100).optional().describe("Position from 0, for move and optionally add"),
          }),
        )
        .min(1)
        .max(50),
    }),
    fn: api.mcp.updateSubtasks,
    args: ({ task_id, ...rest }) => ({ ...rest, taskId: task_id }),
  }),
  tool({
    name: "set_done",
    title: "Mark tasks done or not done",
    description:
      "Checks tasks off or back on, with the same rules as the checkbox: a task with an estimate and no tracked time gets its estimate as actual time, if the person has that setting on.",
    readOnly: false,
    input: z.object({ ids, done: z.boolean() }),
    fn: api.mcp.setDone,
    args: same,
  }),
  tool({
    name: "move_tasks",
    title: "Move tasks",
    description: "Moves tasks to a day (date), a list, or with neither to the Brain Dump. Moving clears Timebox start times.",
    readOnly: false,
    input: z.object({ ids, date: date.optional(), list: list.optional() }),
    fn: api.mcp.moveTasks,
    args: same,
  }),
  tool({
    name: "timebox_task",
    title: "Timebox a task",
    description:
      "Sets or clears (null) a task's start time on the Timebox. Its block lasts as long as its estimate, or 30 minutes without one. A date also moves the task to that day. Warns about overlaps and blocks that run past midnight.",
    readOnly: false,
    input: z.object({ id, start: time.nullable(), date: date.optional() }),
    fn: api.mcp.timeboxTask,
    args: same,
  }),
  tool({
    name: "set_repeat",
    title: "Set a repeat",
    description:
      "Makes a task repeat, or stops it repeating with null. Repeats run every N days, weeks (on chosen weekdays), months or years, from the task's day, optionally until a date or for a number of times.",
    readOnly: false,
    input: z.object({
      id,
      repeat: z
        .object({
          every: z.enum(["day", "week", "month", "year"]),
          interval: z.number().int().min(1).max(99).optional().describe("Every N days, weeks, months or years. 1 by default"),
          weekdays: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).max(7).optional().describe('For every: "week"'),
          day_of_month: z.number().int().min(1).max(31).optional().describe('For every: "month" or "year"'),
          until: date.optional().describe("Last possible day"),
          count: z.number().int().min(1).max(999).optional().describe("Number of times"),
        })
        .nullable(),
    }),
    fn: api.mcp.setRepeat,
    args: ({ repeat, ...rest }) => {
      if (!repeat) return { ...rest, repeat };
      const { day_of_month, ...r } = repeat;
      return { ...rest, repeat: { ...r, dayOfMonth: day_of_month } };
    },
  }),
  tool({
    name: "log_time",
    title: "Log time",
    description: "Adds minutes of actual time spent to a task, on top of what it already has.",
    readOnly: false,
    input: z.object({ id, minutes: z.number().min(1).max(1440) }),
    fn: api.mcp.logTime,
    args: same,
  }),
  tool({
    name: "create_list",
    title: "Create a list",
    description: "Creates a list for undated tasks, with an emoji icon and an optional label that its new tasks get automatically.",
    readOnly: false,
    input: z.object({
      name: z.string().min(1).max(80),
      icon: z.string().max(16).optional().describe("A single emoji"),
      label: label.optional().describe("Label given to tasks added to this list"),
    }),
    fn: api.mcp.createList,
    args: same,
  }),
  tool({
    name: "create_label",
    title: "Create a label",
    description: `Creates a label in one of Beans' eight label colors: ${labelColors.join(", ")}.`,
    readOnly: false,
    input: z.object({ name: z.string().min(1).max(40), color: z.enum(labelColors) }),
    fn: api.mcp.createLabel,
    args: same,
  }),
  tool({
    name: "delete_tasks",
    title: "Delete tasks",
    description: "Moves tasks to Trash, where they stay for 30 days and can be restored. Nothing is deleted for good.",
    readOnly: false,
    input: z.object({ ids }),
    fn: api.mcp.deleteTasks,
    args: same,
  }),
  tool({
    name: "restore_tasks",
    title: "Restore tasks",
    description: "Brings tasks back from Trash. As in the app, restored tasks go on today.",
    readOnly: false,
    input: z.object({ ids }),
    fn: api.mcp.restoreTasks,
    args: same,
  }),
];

/**
 * The annotations every tool sends. All three hints are set explicitly:
 * reading tools are read-only, and changing tools are marked destructive so
 * apps ask the person before each change.
 */
export function annotations(t: Pick<BeansTool, "title" | "readOnly">) {
  return {
    title: t.title,
    readOnlyHint: t.readOnly,
    destructiveHint: !t.readOnly,
    openWorldHint: false,
  };
}
