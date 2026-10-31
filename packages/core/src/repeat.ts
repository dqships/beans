import { RRule } from "rrule";
import { addDays, dayOfMonth, keyToUtc, monthName, utcToKey, weekday, weekdayName } from "./dates";
import { newId } from "./ids";
import { patch, put, remove, type Op } from "./ops";
import type { BeansState, DateKey, RecurringSeries, Task, TimeKey } from "./model";
import { baseTask, liveTasks, newSubtask, subtasksFor } from "./tasks";
import { orderAtBottom } from "./order";

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export type RepeatFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RepeatRule {
  freq: RepeatFrequency;
  interval: number;
  /** Weekday numbers (0 = Sunday) for weekly rules. */
  byDay: number[];
  /** Day of month for monthly and yearly rules. */
  byMonthDay: number | null;
  /** Month (1-12) for yearly rules. */
  byMonth: number | null;
  /** Last possible occurrence. */
  until: DateKey | null;
  /** Stop after this many occurrences. */
  count: number | null;
}

export function parseRule(text: string): RepeatRule {
  const parts = Object.fromEntries(text.split(";").map((p) => p.split("=") as [string, string]));
  const byDay = parts.BYDAY ? parts.BYDAY.split(",").map((d) => DAY_CODES.indexOf(d as (typeof DAY_CODES)[number])) : [];
  const until = parts.UNTIL ? `${parts.UNTIL.slice(0, 4)}-${parts.UNTIL.slice(4, 6)}-${parts.UNTIL.slice(6, 8)}` : null;
  return {
    freq: (parts.FREQ as RepeatFrequency) ?? "DAILY",
    interval: parts.INTERVAL ? Number(parts.INTERVAL) : 1,
    byDay: byDay.filter((d) => d >= 0),
    byMonthDay: parts.BYMONTHDAY ? Number(parts.BYMONTHDAY) : null,
    byMonth: parts.BYMONTH ? Number(parts.BYMONTH) : null,
    until,
    count: parts.COUNT ? Number(parts.COUNT) : null,
  };
}

export function formatRule(rule: RepeatRule): string {
  const parts = [`FREQ=${rule.freq}`];
  if (rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.freq === "WEEKLY" && rule.byDay.length) {
    parts.push(`BYDAY=${[...rule.byDay].sort().map((d) => DAY_CODES[d]).join(",")}`);
  }
  if ((rule.freq === "MONTHLY" || rule.freq === "YEARLY") && rule.byMonthDay) parts.push(`BYMONTHDAY=${rule.byMonthDay}`);
  if (rule.freq === "YEARLY" && rule.byMonth) parts.push(`BYMONTH=${rule.byMonth}`);
  if (rule.until) parts.push(`UNTIL=${rule.until.replaceAll("-", "")}T235959Z`);
  if (rule.count) parts.push(`COUNT=${rule.count}`);
  return parts.join(";");
}

export interface RepeatPreset {
  id: string;
  label: string;
  rule: string;
}

/** Common choices for a task planned on `date`. */
export function repeatPresets(date: DateKey): RepeatPreset[] {
  const wd = weekday(date);
  const md = dayOfMonth(date);
  const month = Number(date.slice(5, 7));
  return [
    { id: "daily", label: "Every day", rule: "FREQ=DAILY" },
    { id: "weekdays", label: "Every weekday (Mon to Fri)", rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
    { id: "weekly", label: `Every week on ${weekdayName(date, true)}`, rule: `FREQ=WEEKLY;BYDAY=${DAY_CODES[wd]}` },
    { id: "biweekly", label: `Every 2 weeks on ${weekdayName(date, true)}`, rule: `FREQ=WEEKLY;INTERVAL=2;BYDAY=${DAY_CODES[wd]}` },
    { id: "monthly", label: `Every month on the ${ordinal(md)}`, rule: `FREQ=MONTHLY;BYMONTHDAY=${md}` },
    { id: "yearly", label: `Every year on ${monthName(date, true)} ${md}`, rule: `FREQ=YEARLY;BYMONTH=${month};BYMONTHDAY=${md}` },
  ];
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

const FREQ_NOUN: Record<RepeatFrequency, [string, string]> = {
  DAILY: ["day", "days"],
  WEEKLY: ["week", "weeks"],
  MONTHLY: ["month", "months"],
  YEARLY: ["year", "years"],
};

/** Plain-language summary, such as "Every 2 weeks on Mon, Wed". */
export function describeRule(text: string): string {
  const rule = parseRule(text);
  if (formatRule({ ...rule, until: null, count: null }) === "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR") {
    return withEnd("Every weekday", rule);
  }
  const [one, many] = FREQ_NOUN[rule.freq];
  let base = rule.interval > 1 ? `Every ${rule.interval} ${many}` : `Every ${one}`;
  if (rule.freq === "WEEKLY" && rule.byDay.length) {
    base += ` on ${rule.byDay.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}`;
  } else if (rule.freq === "MONTHLY" && rule.byMonthDay) {
    base += ` on the ${ordinal(rule.byMonthDay)}`;
  } else if (rule.freq === "YEARLY" && rule.byMonth && rule.byMonthDay) {
    base += ` on ${monthName(`2000-${String(rule.byMonth).padStart(2, "0")}-01`, true)} ${rule.byMonthDay}`;
  }
  return withEnd(base, rule);
}

function withEnd(text: string, rule: RepeatRule): string {
  if (rule.until) return `${text}, until ${rule.until}`;
  if (rule.count) return `${text}, ${rule.count} times`;
  return text;
}

/** Occurrence dates of a series between `from` and `to`, inclusive. */
export function occurrences(series: Pick<RecurringSeries, "rule" | "startDate" | "endDate" | "skipped">, from: DateKey, to: DateKey): DateKey[] {
  const options = RRule.parseString(series.rule);
  const rr = new RRule({ ...options, dtstart: new Date(keyToUtc(series.startDate)) });
  const start = from > series.startDate ? from : series.startDate;
  if (start > to) return [];
  const dates = rr.between(new Date(keyToUtc(start)), new Date(keyToUtc(to) + 1), true).map((d) => utcToKey(d.getTime()));
  const skipped = new Set(series.skipped);
  return dates.filter((d) => !skipped.has(d) && (series.endDate === null || d < series.endDate));
}

/** Next occurrence on or after `from`, if any. */
export function nextOccurrence(series: RecurringSeries, from: DateKey): DateKey | null {
  return occurrences(series, from, addDays(from, 400))[0] ?? null;
}

function instanceFrom(series: RecurringSeries, date: DateKey, order: number, now: number): Task {
  return {
    ...baseTask(newId(now), now),
    title: series.title,
    notes: series.notes,
    date,
    order,
    labelId: series.labelId,
    estimate: series.estimate,
    priority: series.priority,
    start: series.start,
    seriesId: series.id,
    seriesDate: date,
  };
}

/**
 * Makes the missing instances of every live series between `from` and `to`.
 * Instances are keyed by series and date, so running it twice adds nothing.
 */
export function ensureInstances(state: BeansState, from: DateKey, to: DateKey, now: number = Date.now()): Op[] {
  const existing = new Set(
    Object.values(state.tasks)
      .filter((t) => t.seriesId)
      .map((t) => `${t.seriesId}:${t.seriesDate}`),
  );
  const ops: Op[] = [];
  const dayOrders = new Map<DateKey, number[]>();
  const ordersFor = (date: DateKey) => {
    if (!dayOrders.has(date)) dayOrders.set(date, liveTasks(state).filter((t) => t.date === date).map((t) => t.order));
    return dayOrders.get(date)!;
  };
  for (const series of Object.values(state.series)) {
    if (series.deletedAt !== null) continue;
    for (const date of occurrences(series, from, to)) {
      const key = `${series.id}:${date}`;
      if (existing.has(key)) continue;
      existing.add(key);
      const orders = ordersFor(date);
      const order = orderAtBottom(orders);
      orders.push(order);
      const task = instanceFrom(series, date, order, now);
      ops.push(put("tasks", task));
      series.subtasks.forEach((title, i) => ops.push(put("subtasks", newSubtask(task.id, title, i, now))));
    }
  }
  return ops;
}

/** Turns a task into the first instance of a new series. */
export function makeRepeating(state: BeansState, taskId: string, rule: string, today: DateKey, start: TimeKey | null = null, now: number = Date.now()): Op[] {
  const task = state.tasks[taskId];
  if (!task) return [];
  if (task.seriesId) return changeRule(state, task.seriesId, rule, task.seriesDate ?? task.date ?? today, now);
  const date = task.date ?? today;
  const series: RecurringSeries = {
    id: newId(now),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    rule,
    startDate: date,
    start: start ?? task.start,
    endDate: null,
    skipped: [],
    title: task.title,
    notes: task.notes,
    estimate: task.estimate,
    priority: task.priority,
    labelId: task.labelId,
    listId: null,
    subtasks: subtasksFor(state, taskId).map((s) => s.title),
  };
  const fields: Partial<Task> = { seriesId: series.id, seriesDate: date, date, listId: null };
  if (start) fields.start = start;
  return [put("series", series), patch("tasks", taskId, fields)];
}

/** Changes the rule from `from` onward, replacing future undone instances. */
export function changeRule(state: BeansState, seriesId: string, rule: string, from: DateKey, now: number = Date.now()): Op[] {
  const ops: Op[] = [patch("series", seriesId, { rule, startDate: from, skipped: [] })];
  for (const t of liveTasks(state)) {
    if (t.seriesId === seriesId && !t.done && t.seriesDate && t.seriesDate > from) ops.push(patch("tasks", t.id, { deletedAt: now }));
  }
  return ops;
}

/**
 * Stops a series after this instance. The instance stays as a normal task, so
 * no repeat icon or repeat behavior is left behind.
 */
export function stopRepeating(state: BeansState, taskId: string, now: number = Date.now()): Op[] {
  const task = state.tasks[taskId];
  if (!task?.seriesId) return [];
  const seriesId = task.seriesId;
  const cut = task.seriesDate ?? task.date;
  const ops: Op[] = [patch("series", seriesId, { endDate: cut ? addDays(cut, 1) : null, deletedAt: now })];
  for (const t of Object.values(state.tasks)) {
    if (t.seriesId !== seriesId) continue;
    if (t.id === taskId || t.done || (cut && t.seriesDate && t.seriesDate < cut)) {
      ops.push(patch("tasks", t.id, { seriesId: null, seriesDate: null }));
    } else {
      ops.push(remove("tasks", t.id));
    }
  }
  return ops;
}

/** Deletes one instance and remembers to skip its date. */
export function deleteInstance(state: BeansState, taskId: string, now: number = Date.now()): Op[] {
  const task = state.tasks[taskId];
  if (!task) return [];
  const ops: Op[] = [patch("tasks", taskId, { deletedAt: now })];
  const series = task.seriesId ? state.series[task.seriesId] : undefined;
  if (series && task.seriesDate && !series.skipped.includes(task.seriesDate)) {
    ops.push(patch("series", series.id, { skipped: [...series.skipped, task.seriesDate] }));
  }
  return ops;
}

/** Deletes the series and every instance for good. */
export function deleteSeries(state: BeansState, seriesId: string): Op[] {
  const ops: Op[] = [remove("series", seriesId)];
  for (const t of Object.values(state.tasks)) if (t.seriesId === seriesId) ops.push(remove("tasks", t.id));
  return ops;
}

/** Copies this instance's details to the series and every incomplete instance. */
export function updateAllIncomplete(state: BeansState, taskId: string): Op[] {
  const task = state.tasks[taskId];
  if (!task?.seriesId) return [];
  const fields = {
    title: task.title,
    notes: task.notes,
    estimate: task.estimate,
    labelId: task.labelId,
    priority: task.priority,
  };
  const ops: Op[] = [patch("series", task.seriesId, { ...fields, start: task.start, subtasks: subtasksFor(state, taskId).map((s) => s.title) })];
  for (const t of liveTasks(state)) {
    if (t.seriesId === task.seriesId && t.id !== taskId && !t.done) ops.push(patch("tasks", t.id, { ...fields, start: task.start }));
  }
  return ops;
}
