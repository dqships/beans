/**
 * Every free tool's slug, in the order the tools index lists them. This file
 * stays tiny on purpose: `lib/source.ts` reads it on the sign-in pages too,
 * and the tools' copy (`registry.ts`) must not ride along.
 */
export const TOOL_SLUGS = [
  "pomodoro-timer",
  "countdown-timer",
  "stopwatch",
  "break-timer",
  "time-blocking-planner",
  "daily-planner-template",
  "weekly-schedule-maker",
  "hours-in-a-week",
  "sleep-calculator",
  "to-do-list",
  "brain-dump",
  "eisenhower-matrix",
  "habit-tracker",
  "time-calculator",
  "time-duration-calculator",
  "time-card-calculator",
  "hours-to-decimal",
  "date-calculator",
  "time-zone-meeting-planner",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

export const TOOLS_PATH = "/tools";

export const toolPath = (slug: ToolSlug): string => `${TOOLS_PATH}/${slug}`;

export const TOOL_PATHS: string[] = TOOL_SLUGS.map(toolPath);
