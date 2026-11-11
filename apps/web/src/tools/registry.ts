import type { PublicPage } from "@/marketing/pages";
import { brainDump } from "./content/brain-dump";
import { breakTimer } from "./content/break-timer";
import { countdownTimer } from "./content/countdown-timer";
import { dailyPlannerTemplate } from "./content/daily-planner-template";
import { dateCalculator } from "./content/date-calculator";
import { eisenhowerMatrix } from "./content/eisenhower-matrix";
import { habitTracker } from "./content/habit-tracker";
import { hoursInAWeek } from "./content/hours-in-a-week";
import { hoursToDecimal } from "./content/hours-to-decimal";
import { pomodoroTimer } from "./content/pomodoro-timer";
import { sleepCalculator } from "./content/sleep-calculator";
import { stopwatch } from "./content/stopwatch";
import { timeBlockingPlanner } from "./content/time-blocking-planner";
import { timeCalculator } from "./content/time-calculator";
import { timeCardCalculator } from "./content/time-card-calculator";
import { timeDurationCalculator } from "./content/time-duration-calculator";
import { timeZoneMeetingPlanner } from "./content/time-zone-meeting-planner";
import { toDoList } from "./content/to-do-list";
import { weeklyScheduleMaker } from "./content/weekly-schedule-maker";
import { TOOL_SLUGS, toolPath, type ToolSlug } from "./slugs";
import type { ToolDef, ToolGroup } from "./types";

/**
 * Every free tool's copy. Server code reads this: `props.ts` at build time,
 * the sitemap, `llms.txt` and the markdown versions. Tool pages get only
 * their own tool through `getStaticProps`, so don't import this from a
 * component.
 */
const defs: ToolDef[] = [
  pomodoroTimer,
  countdownTimer,
  stopwatch,
  breakTimer,
  timeBlockingPlanner,
  dailyPlannerTemplate,
  weeklyScheduleMaker,
  hoursInAWeek,
  sleepCalculator,
  toDoList,
  brainDump,
  eisenhowerMatrix,
  habitTracker,
  timeCalculator,
  timeDurationCalculator,
  timeCardCalculator,
  hoursToDecimal,
  dateCalculator,
  timeZoneMeetingPlanner,
];

export const tools = Object.fromEntries(defs.map((tool) => [tool.slug, tool])) as Record<ToolSlug, ToolDef>;

/** In the order of `TOOL_SLUGS`. */
export const toolList: ToolDef[] = TOOL_SLUGS.map((slug) => tools[slug]);

export const toolGroups: { id: ToolGroup; name: string; about: string }[] = [
  { id: "timers", name: "Timers", about: "Keep to one thing for a set stretch, then stop." },
  { id: "plan", name: "Plan a day or a week", about: "Decide what goes where before the day starts." },
  { id: "tasks", name: "Sort your tasks", about: "Get everything out of your head and into some order." },
  { id: "time", name: "Work out the time", about: "Add it up, convert it, or count the days." },
];

export const toolsIn = (group: ToolGroup): ToolDef[] => toolList.filter((tool) => tool.group === group);

/** Each tool as a public page, for the sitemap, head-tag checks and markdown. */
export const toolPages: PublicPage[] = toolList.map((tool) => ({
  path: toolPath(tool.slug),
  title: tool.title,
  description: tool.description,
  lastModified: tool.lastModified,
}));
