import { keyToUtc, monthName, utcToKey, weekdayName } from "@beans/core/dates";

/** The daily planner page: a date, three priorities, a line per hour, ten to-dos and notes. All pure. */

export type DayTodo = { text: string; done: boolean };

export type DayPlan = {
  /** `YYYY-MM-DD`, or "" while the page has no date. */
  date: string;
  /** Always three. */
  top: string[];
  /** The first and last hour that get a line, 0 to 23, both included. */
  startHour: number;
  endHour: number;
  /** One entry per hour of the day, so text stays put when the hours shown change. Always 24. */
  schedule: string[];
  /** Always ten. */
  todos: DayTodo[];
  notes: string;
};

export const TOP_COUNT = 3;
export const TODO_COUNT = 10;
export const MAX_LINE = 200;
export const MAX_NOTES = 2000;

const blankLines = (count: number): string[] => Array.from({ length: count }, () => "");
const blankTodos = (): DayTodo[] => Array.from({ length: TODO_COUNT }, () => ({ text: "", done: false }));

export const EMPTY_DAY_PLAN: DayPlan = { date: "", top: blankLines(TOP_COUNT), startHour: 7, endHour: 21, schedule: blankLines(24), todos: blankTodos(), notes: "" };

const hour = (value: number, fallback: number): number => (Number.isFinite(value) ? Math.min(23, Math.max(0, Math.round(value))) : fallback);

/** The hours that get a line, first to last. There is always at least one. */
export function hourLines(plan: Pick<DayPlan, "startHour" | "endHour">): number[] {
  const start = hour(plan.startHour, 7);
  const end = Math.max(start, hour(plan.endHour, 21));
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Changes the first hour. The last hour moves with it when it would end up earlier. */
export function setStartHour(plan: DayPlan, startHour: number): DayPlan {
  const start = hour(startHour, plan.startHour);
  return { ...plan, startHour: start, endHour: Math.max(start, plan.endHour) };
}

/** Changes the last hour. The first hour moves with it when it would end up later. */
export function setEndHour(plan: DayPlan, endHour: number): DayPlan {
  const end = hour(endHour, plan.endHour);
  return { ...plan, endHour: end, startHour: Math.min(end, plan.startHour) };
}

const line = (text: string) => text.slice(0, MAX_LINE);

const replaceAt = <T>(items: T[], index: number, value: T): T[] => (index < 0 || index >= items.length ? items : items.map((item, i) => (i === index ? value : item)));

export function setTop(plan: DayPlan, index: number, text: string): DayPlan {
  return { ...plan, top: replaceAt(plan.top, index, line(text)) };
}

export function setHourText(plan: DayPlan, hourOfDay: number, text: string): DayPlan {
  return { ...plan, schedule: replaceAt(plan.schedule, hourOfDay, line(text)) };
}

export function setTodoText(plan: DayPlan, index: number, text: string): DayPlan {
  const todo = plan.todos[index];
  if (!todo) return plan;
  return { ...plan, todos: replaceAt(plan.todos, index, { ...todo, text: line(text) }) };
}

export function toggleTodo(plan: DayPlan, index: number): DayPlan {
  const todo = plan.todos[index];
  if (!todo) return plan;
  return { ...plan, todos: replaceAt(plan.todos, index, { ...todo, done: !todo.done }) };
}

/** A real calendar date written `YYYY-MM-DD`. Rejects February 30 and the like. */
export function isDateKey(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  return utcToKey(keyToUtc(value)) === value;
}

/** Sets the date, or clears it when the value isn't a date. */
export function setDate(plan: DayPlan, date: string): DayPlan {
  return { ...plan, date: isDateKey(date) ? date : "" };
}

/** "Wednesday, November 11, 2026", or "" for no date. */
export function longDate(date: string): string {
  if (!isDateKey(date)) return "";
  return `${weekdayName(date, true)}, ${monthName(date, true)} ${Number(date.slice(8, 10))}, ${date.slice(0, 4)}`;
}

/** True when nothing has been written on the page. The hours shown don't count. */
export function isBlank(plan: DayPlan): boolean {
  return !plan.date && !plan.notes.trim() && plan.top.every((text) => !text.trim()) && plan.schedule.every((text) => !text.trim()) && plan.todos.every((todo) => !todo.text.trim() && !todo.done);
}

/** Wipes what was written and keeps the hours you chose. */
export function clearPlan(plan: DayPlan): DayPlan {
  return { ...EMPTY_DAY_PLAN, startHour: plan.startHour, endHour: plan.endHour };
}

const strings = (value: unknown, count: number, max: number): string[] | null => {
  if (!Array.isArray(value) || value.length !== count) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    out.push(item.slice(0, max));
  }
  return out;
};

const storedHour = (value: unknown): number | null => (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23 ? value : null);

/** Checks a page read back from local storage. */
export function parseDayPlan(stored: unknown): DayPlan | null {
  if (!stored || typeof stored !== "object") return null;
  const { date, top, startHour, endHour, schedule, todos, notes } = stored as Record<string, unknown>;
  const start = storedHour(startHour);
  const end = storedHour(endHour);
  const topLines = strings(top, TOP_COUNT, MAX_LINE);
  const hours = strings(schedule, 24, MAX_LINE);
  if (typeof date !== "string" || typeof notes !== "string" || start === null || end === null || end < start || !topLines || !hours) return null;
  if (date !== "" && !isDateKey(date)) return null;
  if (!Array.isArray(todos) || todos.length !== TODO_COUNT) return null;
  const parsedTodos: DayTodo[] = [];
  for (const todo of todos) {
    if (!todo || typeof todo !== "object") return null;
    const { text, done } = todo as Record<string, unknown>;
    if (typeof text !== "string" || typeof done !== "boolean") return null;
    parsedTodos.push({ text: text.slice(0, MAX_LINE), done });
  }
  return { date, top: topLines, startHour: start, endHour: end, schedule: hours, todos: parsedTodos, notes: notes.slice(0, MAX_NOTES) };
}
