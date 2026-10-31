/**
 * The Beans data model. Every record is owned by one user and carries the
 * fields a future offline client needs: a client-made `id`, `updatedAt` and
 * a soft-delete `deletedAt`.
 */

/** Calendar day in the user's zone, `YYYY-MM-DD`. */
export type DateKey = string;
/** Wall-clock time, `HH:mm` in 24-hour form. */
export type TimeKey = string;

export type Priority = "high" | "medium" | "low";

export interface BaseRecord {
  /** Made on the client (UUIDv7), so new items work before the server answers. */
  id: string;
  createdAt: number;
  updatedAt: number;
  /** Set when moved to Trash. Records are removed for good 30 days later. */
  deletedAt: number | null;
}

export interface Task extends BaseRecord {
  title: string;
  /** Rich-text notes as HTML from the editor. */
  notes: string;
  /** Planned day. `null` means the task sits in a list. */
  date: DateKey | null;
  /** List for unscheduled tasks. `null` with no date is the Brain Dump. */
  listId: string | null;
  /** Fractional position inside its day or list. */
  order: number;
  done: boolean;
  completedAt: number | null;
  labelId: string | null;
  /** Estimate in minutes. */
  estimate: number | null;
  /** Tracked time in minutes, typed or from the timer. */
  actual: number;
  /** Timebox start on `date`. Block length comes from the estimate. */
  start: TimeKey | null;
  dueDate: DateKey | null;
  priority: Priority | null;
  /** Repeating series this task is an instance of. */
  seriesId: string | null;
  /** The occurrence date inside its series. Unique per series. */
  seriesDate: DateKey | null;
  /** Day the task last rolled over from, for the "rolled over" tag. */
  rolledFrom: DateKey | null;
}

export interface Subtask extends BaseRecord {
  taskId: string;
  title: string;
  done: boolean;
  order: number;
}

export interface List extends BaseRecord {
  name: string;
  /** Single emoji shown before the name. */
  icon: string;
  /** Label given to tasks created in this list. */
  autoLabelId: string | null;
  order: number;
}

export interface Label extends BaseRecord {
  name: string;
  /** One of the label color tokens, such as `sprout`. */
  color: string;
  order: number;
}

export interface Template extends BaseRecord {
  title: string;
  notes: string;
  estimate: number | null;
  priority: Priority | null;
  labelId: string | null;
  subtasks: string[];
  order: number;
}

export interface RecurringSeries extends BaseRecord {
  /** RFC 5545 rule body such as `FREQ=WEEKLY;BYDAY=MO,WE`. */
  rule: string;
  /** First occurrence. */
  startDate: DateKey;
  /** Repeats at a set time and is timeboxed automatically. */
  start: TimeKey | null;
  /** Set by "Stop repeating": no occurrences on or after this day. */
  endDate: DateKey | null;
  /** Occurrences the user deleted, so they aren't made again. */
  skipped: DateKey[];
  title: string;
  notes: string;
  estimate: number | null;
  priority: Priority | null;
  labelId: string | null;
  listId: string | null;
  subtasks: string[];
}

export type TimeEntryKind = "timer" | "focus";

export interface TimeEntry extends BaseRecord {
  taskId: string;
  kind: TimeEntryKind;
  startedAt: number;
  endedAt: number;
}

export type ThemeSetting = "system" | "light" | "dark";

export interface FeatureFlags {
  dueDates: boolean;
  priority: boolean;
  templates: boolean;
  pomodoro: boolean;
  dailyPlanning: boolean;
  analytics: boolean;
}

export interface ActiveTimer {
  taskId: string;
  mode: "stopwatch" | "pomodoro";
  /** When the current running stretch began, or `null` while paused. */
  runningSince: number | null;
  /** Milliseconds banked before `runningSince` in this phase. */
  bankedMs: number;
  /** Pomodoro phase. Stopwatch timers stay in `focus`. */
  phase: "focus" | "break";
}

export interface Settings {
  id: string;
  updatedAt: number;
  theme: ThemeSetting;
  timeZone: string;
  sidebar: "one" | "all";
  newTaskPosition: "top" | "bottom";
  defaultEstimate: number | null;
  detectLabels: boolean;
  rollover: boolean;
  rolloverPosition: "top" | "bottom";
  rolloverRepeating: boolean;
  completedToBottom: boolean;
  completeWithSubtasks: boolean;
  fillActual: boolean;
  autoStartNext: boolean;
  weekStart: 0 | 1;
  dayStartHour: number;
  showWeekends: boolean;
  timeFormat: "12h" | "24h";
  snapMinutes: number;
  workloadLimit: number | null;
  pomodoroFocus: number;
  pomodoroBreak: number;
  pomodoroSound: boolean;
  dueSoonDays: number;
  calendarZoom: number;
  features: FeatureFlags;
  /** Last day the rollover job ran for this user. */
  lastRollover: DateKey | null;
  activeTimer: ActiveTimer | null;
  /** Days whose daily planning or shutdown was finished. */
  plannedDays: DateKey[];
  shutdownDays: DateKey[];
}

export interface BeansState {
  tasks: Record<string, Task>;
  subtasks: Record<string, Subtask>;
  lists: Record<string, List>;
  labels: Record<string, Label>;
  templates: Record<string, Template>;
  series: Record<string, RecurringSeries>;
  timeEntries: Record<string, TimeEntry>;
  settings: Settings;
}

export type TableName = Exclude<keyof BeansState, "settings">;

export type RecordOf<T extends TableName> = BeansState[T][string];
