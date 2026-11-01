import { v, type Infer } from "convex/values";

/**
 * Field validators for each table, matching `packages/core/src/model.ts`.
 * Every record also carries `userId` (set by the server) and `clientId`
 * (made on the client, the record's identity everywhere in the app).
 */

const nullable = <T extends Parameters<typeof v.union>[0]>(x: T) => v.union(x, v.null());
const priority = nullable(v.union(v.literal("high"), v.literal("medium"), v.literal("low")));

const base = {
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: nullable(v.number()),
};

export const taskFields = {
  ...base,
  title: v.string(),
  notes: v.string(),
  date: nullable(v.string()),
  listId: nullable(v.string()),
  order: v.number(),
  done: v.boolean(),
  completedAt: nullable(v.number()),
  labelId: nullable(v.string()),
  estimate: nullable(v.number()),
  actual: v.number(),
  start: nullable(v.string()),
  dueDate: nullable(v.string()),
  priority,
  seriesId: nullable(v.string()),
  seriesDate: nullable(v.string()),
  rolledFrom: nullable(v.string()),
};

export const subtaskFields = {
  ...base,
  taskId: v.string(),
  title: v.string(),
  done: v.boolean(),
  order: v.number(),
};

export const listFields = {
  ...base,
  name: v.string(),
  icon: v.string(),
  autoLabelId: nullable(v.string()),
  order: v.number(),
};

export const labelFields = {
  ...base,
  name: v.string(),
  color: v.string(),
  order: v.number(),
};

export const templateFields = {
  ...base,
  title: v.string(),
  notes: v.string(),
  estimate: nullable(v.number()),
  priority,
  labelId: nullable(v.string()),
  subtasks: v.array(v.string()),
  order: v.number(),
};

export const seriesFields = {
  ...base,
  rule: v.string(),
  startDate: v.string(),
  start: nullable(v.string()),
  endDate: nullable(v.string()),
  skipped: v.array(v.string()),
  title: v.string(),
  notes: v.string(),
  estimate: nullable(v.number()),
  priority,
  labelId: nullable(v.string()),
  listId: nullable(v.string()),
  subtasks: v.array(v.string()),
};

export const timeEntryFields = {
  ...base,
  taskId: v.string(),
  kind: v.union(v.literal("timer"), v.literal("focus")),
  startedAt: v.number(),
  endedAt: v.number(),
};

/** Kept for the attachments feature, so adding it later needs no migration. */
export const attachmentFields = {
  ...base,
  taskId: v.string(),
  name: v.string(),
  size: v.number(),
  storageId: nullable(v.string()),
};

export const activeTimer = v.object({
  taskId: v.string(),
  mode: v.union(v.literal("stopwatch"), v.literal("pomodoro")),
  runningSince: nullable(v.number()),
  bankedMs: v.number(),
  phase: v.union(v.literal("focus"), v.literal("break")),
});

export const onboarding = v.union(
  v.object({ status: v.literal("active"), step: v.string(), day: nullable(v.string()) }),
  v.object({ status: v.union(v.literal("finished"), v.literal("skipped")), at: v.number() }),
);

export const settingsFields = {
  updatedAt: v.number(),
  theme: v.union(v.literal("system"), v.literal("light"), v.literal("dark")),
  timeZone: v.string(),
  sidebar: v.union(v.literal("one"), v.literal("all")),
  newTaskPosition: v.union(v.literal("top"), v.literal("bottom")),
  defaultEstimate: nullable(v.number()),
  detectLabels: v.boolean(),
  rollover: v.boolean(),
  rolloverPosition: v.union(v.literal("top"), v.literal("bottom")),
  rolloverRepeating: v.boolean(),
  completedToBottom: v.boolean(),
  completeWithSubtasks: v.boolean(),
  fillActual: v.boolean(),
  autoStartNext: v.boolean(),
  weekStart: v.union(v.literal(0), v.literal(1)),
  dayStartHour: v.number(),
  showWeekends: v.boolean(),
  timeFormat: v.union(v.literal("12h"), v.literal("24h")),
  snapMinutes: v.number(),
  workloadLimit: nullable(v.number()),
  pomodoroFocus: v.number(),
  pomodoroBreak: v.number(),
  pomodoroSound: v.boolean(),
  dueSoonDays: v.number(),
  calendarZoom: v.number(),
  features: v.object({
    dueDates: v.boolean(),
    priority: v.boolean(),
    templates: v.boolean(),
    pomodoro: v.boolean(),
    dailyPlanning: v.boolean(),
    analytics: v.boolean(),
  }),
  lastRollover: nullable(v.string()),
  activeTimer: nullable(activeTimer),
  plannedDays: v.array(v.string()),
  shutdownDays: v.array(v.string()),
  /** Optional because accounts made before onboarding don't have it. They read as finished. */
  onboarding: v.optional(onboarding),
};

/** Client table name to its fields. `series` is stored in `recurringSeries`. */
export const TABLE_FIELDS = {
  tasks: taskFields,
  subtasks: subtaskFields,
  lists: listFields,
  labels: labelFields,
  templates: templateFields,
  series: seriesFields,
  timeEntries: timeEntryFields,
} as const;

export type ClientTable = keyof typeof TABLE_FIELDS;

export const DB_TABLE = {
  tasks: "tasks",
  subtasks: "subtasks",
  lists: "lists",
  labels: "labels",
  templates: "templates",
  series: "recurringSeries",
  timeEntries: "timeEntries",
} as const;

function partial<T extends Record<string, Parameters<typeof v.optional>[0]>>(fields: T) {
  return Object.fromEntries(Object.entries(fields).map(([k, val]) => [k, v.optional(val)])) as {
    [K in keyof T]: ReturnType<typeof v.optional<T[K]>>;
  };
}

const record = <T extends Record<string, Parameters<typeof v.optional>[0]>>(fields: T) => v.object({ id: v.string(), ...fields });

/** One op from `packages/core/src/ops.ts`, validated per table. */
export const opValidator = v.union(
  ...(Object.keys(TABLE_FIELDS) as ClientTable[]).map((table) =>
    v.object({ kind: v.literal("put"), table: v.literal(table), record: record(TABLE_FIELDS[table]) }),
  ),
  ...(Object.keys(TABLE_FIELDS) as ClientTable[]).map((table) =>
    v.object({ kind: v.literal("patch"), table: v.literal(table), id: v.string(), fields: v.object(partial(TABLE_FIELDS[table])) }),
  ),
  ...(Object.keys(TABLE_FIELDS) as ClientTable[]).map((table) =>
    v.object({ kind: v.literal("remove"), table: v.literal(table), id: v.string() }),
  ),
  v.object({ kind: v.literal("settings"), fields: v.object(partial(settingsFields)) }),
);

export type OpInput = Infer<typeof opValidator>;
