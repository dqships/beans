/** The weekly time budget on the hours-in-a-week page: rows of hours, and what's left of 168. All pure. */

export const HOURS_IN_DAY = 24;
export const DAYS_IN_WEEK = 7;
export const HOURS_IN_WEEK = HOURS_IN_DAY * DAYS_IN_WEEK;
export const MINUTES_IN_WEEK = HOURS_IN_WEEK * 60;

export const MAX_ROWS = 12;
export const MAX_NAME = 40;

/** The label colors from DESIGN.md, in the order rows take them. */
export const ROW_COLORS = ["rain", "sprout", "pumpkin", "corn", "plum", "tomato", "beet", "soil"] as const;

export type Per = "day" | "week";

export type BudgetRow = {
  id: string;
  name: string;
  hours: number;
  per: Per;
  /** An index into `ROW_COLORS`. */
  color: number;
};

export const DEFAULT_ROWS: BudgetRow[] = [
  { id: "sleep", name: "Sleep", hours: 8, per: "day", color: 0 },
  { id: "work", name: "Work", hours: 40, per: "week", color: 1 },
  { id: "commute", name: "Commute", hours: 5, per: "week", color: 2 },
  { id: "meals", name: "Meals", hours: 1.5, per: "day", color: 3 },
  { id: "chores", name: "Chores", hours: 1, per: "day", color: 4 },
  { id: "exercise", name: "Exercise", hours: 3, per: "week", color: 5 },
];

export const maxHours = (per: Per): number => (per === "day" ? HOURS_IN_DAY : HOURS_IN_WEEK);

/** Holds a row's hours between 0 and a full day or week, to two decimals. */
export function cleanHours(hours: number, per: Per): number {
  if (!Number.isFinite(hours)) return 0;
  return Math.round(Math.min(maxHours(per), Math.max(0, hours)) * 100) / 100;
}

/** A row's hours across the whole week. */
export function weekHours(row: BudgetRow): number {
  const hours = cleanHours(row.hours, row.per);
  return Math.round((row.per === "day" ? hours * DAYS_IN_WEEK : hours) * 100) / 100;
}

export type Budget = {
  rows: {
    id: string;
    name: string;
    color: number;
    hours: number;
    /** Part of the 168 hours, 0 to 1 and beyond. */
    share: number;
    /** Part of the bar: the same as `share` until the week is over-full, then scaled so the bar still fits. */
    width: number;
  }[];
  /** Hours spoken for. */
  spoken: number;
  /** Hours left out of 168. 0 when over. */
  left: number;
  /** Hours past 168. 0 when not over. */
  over: number;
  /** The empty part of the bar, 0 to 1. */
  leftWidth: number;
};

export function budget(rows: readonly BudgetRow[]): Budget {
  const hours = rows.map(weekHours);
  const spoken = Math.round(hours.reduce((sum, value) => sum + value, 0) * 100) / 100;
  const scale = Math.max(HOURS_IN_WEEK, spoken);
  return {
    rows: rows.map((row, i) => ({ id: row.id, name: row.name, color: row.color, hours: hours[i]!, share: hours[i]! / HOURS_IN_WEEK, width: hours[i]! / scale })),
    spoken,
    left: Math.max(0, Math.round((HOURS_IN_WEEK - spoken) * 100) / 100),
    over: Math.max(0, Math.round((spoken - HOURS_IN_WEEK) * 100) / 100),
    leftWidth: Math.max(0, (HOURS_IN_WEEK - spoken) / HOURS_IN_WEEK),
  };
}

/** Hours with up to two decimals and no trailing zeros: "56", "10.5", "1,234.25". */
export function formatHours(hours: number): string {
  const rounded = Math.round((Number.isFinite(hours) ? hours : 0) * 100) / 100;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** A share of the week as a percentage: "33.3%", "0%", "100%". */
export function formatShare(share: number): string {
  const percent = Math.round((Number.isFinite(share) ? share : 0) * 1000) / 10;
  return `${percent.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

/** "1 hour", "46.5 hours" */
export function hoursText(hours: number): string {
  return `${formatHours(hours)} ${Math.round(hours * 100) / 100 === 1 ? "hour" : "hours"}`;
}

/** The first color no row is using, or the least used one when all eight are taken. */
export function nextColor(rows: readonly BudgetRow[]): number {
  const counts = ROW_COLORS.map((_, color) => rows.filter((row) => row.color === color).length);
  return counts.indexOf(Math.min(...counts));
}

/** Adds an empty row at the end. A full list changes nothing. */
export function addRow(rows: readonly BudgetRow[], id: string): BudgetRow[] {
  if (rows.length >= MAX_ROWS) return [...rows];
  return [...rows, { id, name: "", hours: 1, per: "week", color: nextColor(rows) }];
}

export function removeRow(rows: readonly BudgetRow[], id: string): BudgetRow[] {
  return rows.filter((row) => row.id !== id);
}

/** Changes a row. Switching between a day and a week keeps the number and holds it to the new limit. */
export function changeRow(rows: readonly BudgetRow[], id: string, change: Partial<Pick<BudgetRow, "name" | "hours" | "per">>): BudgetRow[] {
  return rows.map((row) => {
    if (row.id !== id) return row;
    const next = { ...row, ...change };
    return { ...next, name: next.name.slice(0, MAX_NAME), hours: cleanHours(next.hours, next.per) };
  });
}

/** Checks the rows saved in local storage. */
export function parseRows(stored: unknown): BudgetRow[] | null {
  if (!Array.isArray(stored) || stored.length > MAX_ROWS) return null;
  const rows: BudgetRow[] = [];
  const seen = new Set<string>();
  for (const item of stored) {
    if (!item || typeof item !== "object") return null;
    const { id, name, hours, per, color } = item as Record<string, unknown>;
    if (typeof id !== "string" || !id || seen.has(id) || typeof name !== "string") return null;
    if (per !== "day" && per !== "week") return null;
    if (typeof hours !== "number" || !Number.isFinite(hours) || hours < 0 || hours > maxHours(per)) return null;
    if (typeof color !== "number" || !Number.isInteger(color) || color < 0 || color >= ROW_COLORS.length) return null;
    seen.add(id);
    rows.push({ id, name: name.slice(0, MAX_NAME), hours: cleanHours(hours, per), per, color });
  }
  return rows;
}
