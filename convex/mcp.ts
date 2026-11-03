import { ConvexError, v, type ObjectType, type PropertyValidators } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ageInDays, analyticsFor, brainDumpAge } from "../packages/core/src/analytics";
import { createLabel as coreCreateLabel, createList as coreCreateList, liveLists } from "../packages/core/src/collections";
import { addDays, diffDays, keyToUtc, minutesNowIn, minutesToTime, startOfWeek, timeToMinutes, todayIn, utcToKey, weekdayName } from "../packages/core/src/dates";
import type { BeansState, DateKey, Label, List, Priority, Settings, Task } from "../packages/core/src/model";
import { notesToText, textToNotes } from "../packages/core/src/notes";
import { applyOps, patch, type Op } from "../packages/core/src/ops";
import { deleteInstance, describeRule, formatRule, makeRepeating, nextOccurrence, stopRepeating, type RepeatRule } from "../packages/core/src/repeat";
import {
  addSubtask,
  blockMinutes,
  createTask,
  dayTotals,
  deleteTask,
  liveLabels,
  liveTasks,
  moveSubtask,
  moveTask,
  restoreTask,
  runsPastMidnight,
  setDone as coreSetDone,
  setSubtaskDone,
  sortDay,
  sortList,
  subtasksFor,
  tasksForDay,
  updateTask as coreUpdateTask,
} from "../packages/core/src/tasks";
import { labelColors } from "../packages/tokens/src/tokens";
import { requireAccess } from "./billing";
import { getSettings, requireUser, stateWith, toRecord, toSettings } from "./lib";
import { applyOne, ensureForUser } from "./planner";
import type { OpInput } from "./validators";

/**
 * The Beans MCP server's side of Convex. The MCP route in the web app checks
 * the person's Clerk OAuth token, then calls these functions with their Clerk
 * user id (the same id `requireUser` returns) and the server-only
 * MCP_SERVER_SECRET. Every function checks the secret, the person's access and
 * the rate limits, then reads or changes the planner through the same core
 * functions and `applyOne` as the app, so open Beans windows update live.
 *
 * Read tools are mutations too: each call counts toward the rate limit and
 * makes the repeating-task instances for the days it reads, as the app does.
 */

export const MCP_LIMITS = { callsPerMinute: 60, changesPerDay: 1000, batch: 50, subtasks: 30 } as const;
const APP_URL = "https://beans.followusai.com";

type Code =
  | "not_configured"
  | "forbidden"
  | "no_planner"
  | "no_access"
  | "disconnected"
  | "rate_limited"
  | "daily_limit"
  | "not_found"
  | "invalid";

/** Errors carry a code for the route and a message that says what to do next. */
function fail(code: Code, message: string): never {
  throw new ConvexError({ code, message });
}

// ---------- Session: secret, access, connection, rate limit ----------

const session = {
  secret: v.string(),
  userId: v.string(),
  /** The OAuth client that made the call, and when its access token was issued (ms). */
  client: v.object({ id: v.string(), name: v.string(), issuedAt: v.number() }),
};

type Session = ObjectType<typeof session>;

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkSecret(secret: string) {
  const expected = process.env.MCP_SERVER_SECRET;
  if (!expected || expected.length < 32) fail("not_configured", "The Beans connector isn't set up on the server yet. Try again later.");
  if (!sameSecret(secret, expected)) fail("forbidden", "This request didn't come from the Beans MCP server.");
}

async function usageRow(ctx: MutationCtx, userId: string) {
  return await ctx.db
    .query("mcpUsage")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function connectionRow(ctx: MutationCtx, userId: string, clientId: string) {
  return await ctx.db
    .query("mcpConnections")
    .withIndex("by_user_client", (q) => q.eq("userId", userId).eq("clientId", clientId))
    .unique();
}

/** Checks everything a call needs before it touches the planner, and counts the call. */
async function begin(ctx: MutationCtx, { secret, userId, client }: Session, now: number): Promise<Settings> {
  checkSecret(secret);
  const settingsDoc = await getSettings(ctx, userId);
  if (!settingsDoc) fail("no_planner", `This Beans account has no planner yet. Open ${APP_URL}/app once to set it up, then try again.`);
  try {
    await requireAccess(ctx, userId);
  } catch {
    fail(
      "no_access",
      `Your Beans trial or subscription has ended, so connected apps can't read or change your planner. Your tasks are kept. Choose a plan at ${APP_URL}/pricing to carry on.`,
    );
  }

  const connection = await connectionRow(ctx, userId, client.id);
  if (connection?.revokedAt && client.issuedAt <= connection.revokedAt) {
    fail(
      "disconnected",
      "This app was disconnected from Beans in Settings, Connected apps. To use Beans here again, remove the Beans connector from this app and add it again.",
    );
  }
  if (connection) {
    await ctx.db.patch(connection._id, { name: client.name || connection.name, lastUsedAt: now, revokedAt: null });
  } else {
    await ctx.db.insert("mcpConnections", { userId, clientId: client.id, name: client.name, firstUsedAt: now, lastUsedAt: now, revokedAt: null });
  }

  const minute = Math.floor(now / 60_000);
  const day = utcToKey(now);
  const usage = await usageRow(ctx, userId);
  if (!usage) {
    await ctx.db.insert("mcpUsage", { userId, minute, calls: 1, day, changes: 0 });
  } else {
    const calls = usage.minute === minute ? usage.calls : 0;
    if (calls >= MCP_LIMITS.callsPerMinute) {
      fail("rate_limited", `Too many requests: connected apps can make ${MCP_LIMITS.callsPerMinute} calls a minute to Beans. Wait a minute, then try again.`);
    }
    await ctx.db.patch(usage._id, { minute, calls: calls + 1, ...(usage.day === day ? {} : { day, changes: 0 }) });
  }
  return toSettings(settingsDoc);
}

// ---------- Planner: the slice of the user's data a tool needs ----------

class Planner {
  state: BeansState;
  readonly today: DateKey;

  constructor(
    readonly ctx: MutationCtx,
    readonly userId: string,
    settings: Settings,
    readonly now: number,
  ) {
    this.state = stateWith(settings);
    this.today = todayIn(settings.timeZone, now);
  }

  get settings() {
    return this.state.settings;
  }

  private addTasks(docs: Doc<"tasks">[]) {
    for (const doc of docs) this.state.tasks[doc.clientId] = toRecord(doc);
  }

  /** Lists and labels, which almost every tool names in its answer. */
  async loadCollections() {
    const [lists, labels] = await Promise.all([
      this.ctx.db.query("lists").withIndex("by_user_client", (q) => q.eq("userId", this.userId)).collect(),
      this.ctx.db.query("labels").withIndex("by_user_client", (q) => q.eq("userId", this.userId)).collect(),
    ]);
    for (const l of lists) this.state.lists[l.clientId] = toRecord(l);
    for (const l of labels) this.state.labels[l.clientId] = toRecord(l);
  }

  /** Dated tasks from `from` to `to`, after making repeating instances for up to 62 of those days, as the app does. */
  async loadDays(from: DateKey, to: DateKey, ensure = true) {
    if (ensure && diffDays(to, from) <= 62) await ensureForUser(this.ctx, this.userId, from, to);
    this.addTasks(
      await this.ctx.db
        .query("tasks")
        .withIndex("by_user_date", (q) => q.eq("userId", this.userId).gte("date", from).lte("date", to))
        .collect(),
    );
  }

  /** Every undated task: the Brain Dump and all lists. */
  async loadUndated() {
    this.addTasks(
      await this.ctx.db
        .query("tasks")
        .withIndex("by_user_date", (q) => q.eq("userId", this.userId).eq("date", null))
        .collect(),
    );
  }

  /** Tasks by id, including ones in Trash, and the days or lists they sit in. */
  async loadTasks(ids: string[]) {
    const docs = await Promise.all(
      ids.map((id) =>
        this.ctx.db
          .query("tasks")
          .withIndex("by_user_client", (q) => q.eq("userId", this.userId).eq("clientId", id))
          .unique(),
      ),
    );
    this.addTasks(docs.filter((d): d is Doc<"tasks"> => d !== null));
  }

  async loadSubtasks(taskIds: string[]) {
    const groups = await Promise.all(
      [...new Set(taskIds)].map((taskId) =>
        this.ctx.db
          .query("subtasks")
          .withIndex("by_user_task", (q) => q.eq("userId", this.userId).eq("taskId", taskId))
          .collect(),
      ),
    );
    for (const s of groups.flat()) this.state.subtasks[s.clientId] = toRecord(s);
  }

  /** A repeating series and every instance of it. */
  async loadSeries(seriesId: string) {
    const [series, instances] = await Promise.all([
      this.ctx.db
        .query("recurringSeries")
        .withIndex("by_user_client", (q) => q.eq("userId", this.userId).eq("clientId", seriesId))
        .unique(),
      this.ctx.db
        .query("tasks")
        .withIndex("by_user_series_date", (q) => q.eq("userId", this.userId).eq("seriesId", seriesId))
        .collect(),
    ]);
    if (series) this.state.series[series.clientId] = toRecord(series);
    this.addTasks(instances);
  }

  /** The containers tasks will land in, so new positions follow the tasks already there. */
  async loadTargets(targets: { date: DateKey | null }[]) {
    const dates = [...new Set(targets.map((t) => t.date).filter((d): d is DateKey => d !== null))];
    await Promise.all(dates.map((d) => this.loadDays(d, d, false)));
    if (targets.some((t) => t.date === null)) await this.loadUndated();
  }

  /** Applies ops in this transaction and counts `changes` toward the daily limit. */
  async apply(ops: Op[], changes: number) {
    if (!ops.length) return;
    const usage = (await usageRow(this.ctx, this.userId))!;
    if (usage.changes + changes > MCP_LIMITS.changesPerDay) {
      fail(
        "daily_limit",
        `Daily limit reached: connected apps can make ${MCP_LIMITS.changesPerDay.toLocaleString("en-US")} changes a day in Beans, and ${usage.changes} are used. It resets at midnight UTC, and the Beans app itself keeps working.`,
      );
    }
    await this.ctx.db.patch(usage._id, { changes: usage.changes + changes });
    for (const op of ops) await applyOne(this.ctx, this.userId, op as OpInput, this.now);
    this.state = applyOps(this.state, ops, this.now);
  }

  task(id: string, { trashed = false } = {}): Task {
    const t = this.state.tasks[id];
    if (!t || (t.deletedAt !== null) !== trashed) {
      fail(
        "not_found",
        trashed
          ? `No task with id "${id}" is in Trash. Tasks stay in Trash for 30 days.`
          : `No task with id "${id}". Task ids come from get_day, get_week, list_tasks or search_tasks.`,
      );
    }
    return t;
  }

  label(ref: string | null | undefined): string | null | undefined {
    if (ref === undefined || ref === null) return ref;
    const labels = liveLabels(this.state);
    const found = labels.find((l) => l.id === ref) ?? labels.find((l) => l.name.trim().toLowerCase() === ref.trim().toLowerCase());
    if (!found) {
      const names = labels.map((l) => l.name).join(", ") || "none yet";
      fail("not_found", `No label "${ref}". Labels: ${names}. Make a new one with create_label.`);
    }
    return found.id;
  }

  list(ref: string | null | undefined): string | null | undefined {
    if (ref === undefined || ref === null) return ref;
    const lists = liveLists(this.state);
    const found = lists.find((l) => l.id === ref) ?? lists.find((l) => l.name.trim().toLowerCase() === ref.trim().toLowerCase());
    if (!found) {
      const names = lists.map((l) => l.name).join(", ") || "none yet";
      fail("not_found", `No list "${ref}". Lists: ${names}. Make a new one with create_list.`);
    }
    return found.id;
  }

  /** Where a task sits, in words. */
  place(t: Task): string {
    if (t.date) return t.date;
    if (t.listId) return this.state.lists[t.listId]?.name ?? "a list";
    return "Brain Dump";
  }

  /** A compact row for lists of tasks. Empty fields are left out. */
  row(t: Task, { withDate = true } = {}) {
    const subs = subtasksFor(this.state, t.id);
    return clean({
      id: t.id,
      title: t.title,
      done: t.done,
      date: withDate ? t.date : null,
      list: t.date ? null : t.listId ? (this.state.lists[t.listId]?.name ?? null) : "Brain Dump",
      label: t.labelId ? (this.state.labels[t.labelId]?.name ?? null) : null,
      start: t.start,
      estimate: t.estimate,
      actual: t.actual ? round(t.actual) : null,
      due: t.dueDate,
      priority: t.priority,
      repeats: t.seriesId ? true : null,
      subtasks: subs.length ? `${subs.filter((s) => s.done).length}/${subs.length} done` : null,
    });
  }

  /** One day's tasks in board order, with totals against the workday limit. */
  day(date: DateKey, { withDate = false } = {}) {
    const tasks = tasksForDay(this.state, date);
    const totals = dayTotals(tasks);
    const limit = this.settings.workloadLimit;
    const left = tasks.filter((t) => !t.done).reduce((s, t) => s + (t.estimate ?? 0), 0);
    return clean({
      date,
      weekday: weekdayName(date, true),
      today: date === this.today ? true : null,
      tasks: totals.count,
      done: totals.done,
      estimate: totals.estimate,
      actual: round(totals.actual),
      left,
      workdayLimit: limit,
      overBy: limit !== null && totals.estimate > limit ? totals.estimate - limit : null,
      list: tasks.map((t) => this.row(t, { withDate })),
    });
  }
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Drops null and undefined fields, so answers stay short. */
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)) as Partial<T>;
}

/**
 * One MCP tool as a Convex mutation: the session arguments plus the tool's
 * own, checked before the handler runs.
 */
function tool<A extends PropertyValidators, R>(args: A, handler: (p: Planner, args: ObjectType<A>) => Promise<R>) {
  return mutation({
    args: { ...session, ...args },
    handler: async (ctx, all): Promise<R> => {
      const { secret, userId, client, ...rest } = all as Session & ObjectType<A>;
      const now = Date.now();
      const settings = await begin(ctx, { secret, userId, client }, now);
      const p = new Planner(ctx, userId, settings, now);
      await p.loadCollections();
      return await handler(p, rest as unknown as ObjectType<A>);
    },
  });
}

// ---------- Input checks ----------

function checkDate(value: string, field = "date"): DateKey {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || utcToKey(keyToUtc(value)) !== value) {
    fail("invalid", `"${value}" isn't a valid ${field}. Use YYYY-MM-DD, such as 2026-11-03.`);
  }
  return value;
}

function checkTime(value: string): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail("invalid", `"${value}" isn't a valid start time. Use 24-hour HH:mm, such as 09:30 or 14:00.`);
  return value;
}

function checkMinutes(value: number, field: string, max = 1440): number {
  if (!Number.isFinite(value) || value < 0 || value > max) fail("invalid", `${field} must be between 0 and ${max} minutes.`);
  return Math.round(value);
}

function checkTitle(value: string, field = "Title"): string {
  const title = value.trim();
  if (!title) fail("invalid", `${field} can't be empty.`);
  if (title.length > 500) fail("invalid", `${field} is too long: keep it under 500 characters.`);
  return title;
}

function checkBatch(ids: unknown[], what = "tasks") {
  if (!ids.length) fail("invalid", `Give at least one of the ${what}.`);
  if (ids.length > MCP_LIMITS.batch) fail("invalid", `At most ${MCP_LIMITS.batch} ${what} at once. Split the rest into another call.`);
}

function checkRange(from: DateKey, to: DateKey, maxDays: number) {
  if (to < from) fail("invalid", `The range ends (${to}) before it starts (${from}).`);
  if (diffDays(to, from) + 1 > maxDays) fail("invalid", `That range is ${diffDays(to, from) + 1} days. Ask for ${maxDays} days or fewer at a time.`);
}

const nullableString = v.optional(v.union(v.string(), v.null()));
const priorityArg = v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"), v.null()));

/** Where a task goes: a day, a list, or (with neither) the Brain Dump. */
function target(p: Planner, where: { date?: string; list?: string }) {
  if (where.date && where.list) fail("invalid", "Give a date or a list, not both. A task on a day isn't in a list.");
  if (where.date) return { date: checkDate(where.date), listId: null };
  return { date: null, listId: p.list(where.list) ?? null };
}

/** Each day's totals after a change, so the AI can see what fits the workday limit. */
function dayLoads(p: Planner, dates: (DateKey | null)[]) {
  return [...new Set(dates.filter((d): d is DateKey => d !== null))].sort().map((d) => {
    const { list, ...summary } = p.day(d);
    void list;
    return summary;
  });
}

// ---------- Reading ----------

export const getOverview = tool({}, async (p) => {
  const s = p.settings;
  await Promise.all([p.loadDays(p.today, p.today), p.loadDays(addDays(p.today, -14), addDays(p.today, -1), false), p.loadUndated()]);
  const live = liveTasks(p.state);
  const { list, ...today } = p.day(p.today);
  void list;
  return {
    today: p.today,
    weekday: weekdayName(p.today, true),
    time: minutesToTime(minutesNowIn(s.timeZone, p.now)),
    timeZone: s.timeZone,
    weekStartsOn: s.weekStart === 1 ? "Monday" : "Sunday",
    workdayLimit: s.workloadLimit,
    defaultEstimate: s.defaultEstimate,
    lists: liveLists(p.state).map((l) => ({
      id: l.id,
      name: l.name,
      icon: l.icon,
      label: l.autoLabelId ? p.state.labels[l.autoLabelId]?.name : undefined,
      open: live.filter((t) => t.date === null && t.listId === l.id && !t.done).length,
    })),
    labels: liveLabels(p.state).map((l) => ({ id: l.id, name: l.name, color: l.color })),
    todaySummary: today,
    brainDump: live.filter((t) => t.date === null && t.listId === null && !t.done).length,
    overdue: live.filter((t) => t.date !== null && t.date < p.today && !t.done).length,
  };
});

export const getDay = tool({ date: v.string() }, async (p, { date }) => {
  checkDate(date);
  await p.loadDays(date, date);
  await p.loadSubtasks(tasksForDay(p.state, date).map((t) => t.id));
  return p.day(date);
});

export const getWeek = tool({ date: v.optional(v.string()) }, async (p, { date }) => {
  const from = startOfWeek(date ? checkDate(date) : p.today, p.settings.weekStart);
  const to = addDays(from, 6);
  await p.loadDays(from, to);
  await p.loadSubtasks(liveTasks(p.state).map((t) => t.id));
  const days = Array.from({ length: 7 }, (_, i) => p.day(addDays(from, i)));
  return {
    from,
    to,
    workdayLimit: p.settings.workloadLimit,
    estimate: days.reduce((s, d) => s + (d.estimate ?? 0), 0),
    days,
  };
});

export const listTasks = tool(
  {
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    list: v.optional(v.string()),
    brainDump: v.optional(v.boolean()),
    label: v.optional(v.string()),
    done: v.optional(v.boolean()),
    dueBy: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  async (p, args) => {
    const limit = Math.min(Math.max(1, Math.round(args.limit ?? 100)), 200);
    const listId = p.list(args.list);
    const labelId = p.label(args.label);
    const dated = args.from !== undefined || args.to !== undefined;
    const undated = listId !== undefined || args.brainDump === true;
    // With no place given: everything undated plus the last 30 and next 60 days.
    const from = dated ? checkDate((args.from ?? args.to)!, "from date") : addDays(p.today, -30);
    const to = dated ? checkDate((args.to ?? args.from)!, "to date") : addDays(p.today, 60);
    if (dated) checkRange(from, to, 92);
    if (dated || !undated) await p.loadDays(from, to, diffDays(to, from) <= 62);
    if (undated || !dated) await p.loadUndated();
    const dueBy = args.dueBy ? checkDate(args.dueBy, "due date") : null;

    const matches = liveTasks(p.state).filter((t) => {
      const inPlace = dated || undated
        ? (dated && t.date !== null && t.date >= from && t.date <= to) ||
          (listId !== undefined && t.date === null && t.listId === listId) ||
          (args.brainDump === true && t.date === null && t.listId === null)
        : t.date === null || (t.date >= from && t.date <= to);
      if (!inPlace) return false;
      if (labelId !== undefined && t.labelId !== labelId) return false;
      if (args.done !== undefined && t.done !== args.done) return false;
      if (dueBy && (!t.dueDate || t.dueDate > dueBy)) return false;
      return true;
    });

    // Days in date order, then the Brain Dump and lists, each in board order.
    const groups = new Map<string, Task[]>();
    for (const t of matches) {
      const key = t.date ?? `~${t.listId ?? ""}`;
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    const bottom = p.settings.completedToBottom;
    const ordered = [...groups.keys()]
      .sort()
      .flatMap((key) => (key.startsWith("~") ? sortList(groups.get(key)!, bottom) : sortDay(groups.get(key)!, bottom)));
    const shown = ordered.slice(0, limit);
    await p.loadSubtasks(shown.map((t) => t.id));
    return clean({
      count: matches.length,
      shown: shown.length,
      more: matches.length > shown.length ? `${matches.length - shown.length} more. Narrow the filters or raise the limit (up to 200).` : null,
      tasks: shown.map((t) => p.row(t)),
    });
  },
);

export const searchTasks = tool({ query: v.string(), includeDone: v.optional(v.boolean()), limit: v.optional(v.number()) }, async (p, args) => {
  const text = args.query.trim();
  if (text.length < 2) fail("invalid", "Search for at least 2 characters.");
  const limit = Math.min(Math.max(1, Math.round(args.limit ?? 20)), 50);
  const docs = await p.ctx.db
    .query("tasks")
    .withSearchIndex("search_title", (q) => q.search("title", text.slice(0, 200)).eq("userId", p.userId))
    .take(limit * 3);
  const found = docs
    .map((d) => toRecord(d) as Task)
    .filter((t) => t.deletedAt === null && (args.includeDone !== false || !t.done))
    .slice(0, limit);
  for (const t of found) p.state.tasks[t.id] = t;
  await p.loadSubtasks(found.map((t) => t.id));
  return { count: found.length, tasks: found.map((t) => p.row(t)) };
});

export const getTask = tool({ id: v.string() }, async (p, { id }) => {
  await p.loadTasks([id]);
  const t = p.task(id);
  await p.loadSubtasks([id]);
  if (t.seriesId) await p.loadSeries(t.seriesId);
  const series = t.seriesId ? p.state.series[t.seriesId] : undefined;
  return clean({
    ...p.row(t),
    notes: notesToText(t.notes) || null,
    subtasks: subtasksFor(p.state, id).map((s) => ({ id: s.id, title: s.title, done: s.done })),
    repeat: series && series.deletedAt === null ? describeRule(series.rule) : null,
    nextRepeat: series && series.deletedAt === null ? nextOccurrence(series, addDays(t.seriesDate ?? p.today, 1)) : null,
    created: todayIn(p.settings.timeZone, t.createdAt),
    finished: t.completedAt ? todayIn(p.settings.timeZone, t.completedAt) : null,
  });
});

export const getAnalytics = tool({ from: v.string(), to: v.string() }, async (p, args) => {
  const from = checkDate(args.from, "from date");
  const to = checkDate(args.to, "to date");
  checkRange(from, to, 366);
  // Tasks are usually finished on or near their day, so a margin catches the rest.
  await Promise.all([p.loadDays(addDays(from, -31), addDays(to, 31), false), p.loadUndated()]);
  const tasks = liveTasks(p.state);
  const a = analyticsFor(tasks, from, to, p.settings.timeZone);
  const labelName = (id: string | null) => (id ? (p.state.labels[id]?.name ?? "Deleted label") : "No label");
  const age = brainDumpAge(tasks, p.today, p.settings.timeZone);
  return {
    from,
    to,
    finished: a.total.tasks,
    minutes: round(a.total.minutes),
    byLabel: a.byLabel.map((r) => ({
      label: labelName(r.labelId),
      minutes: round(r.minutes),
      tasks: r.tasks,
      share: a.total.minutes ? Math.round((r.minutes / a.total.minutes) * 100) : 0,
    })),
    perDay: a.perDay.filter((d) => d.tasks > 0).map((d) => ({ date: d.date, minutes: round(d.minutes), tasks: d.tasks })),
    estimates: { ...a.estimates, actual: round(a.estimates.actual) },
    tasks: a.finished.slice(0, 100).map((t) =>
      clean({
        title: t.title,
        label: t.labelId ? labelName(t.labelId) : null,
        estimate: t.estimate,
        actual: round(t.actual),
        finished: t.completedAt ? todayIn(p.settings.timeZone, t.completedAt) : t.date,
      }),
    ),
    waiting: {
      undatedTasks: age.count,
      averageDays: age.averageDays,
      waitingTwoWeeksOrMore: age.stale.length,
      oldest: [...age.stale]
        .sort((x, y) => x.createdAt - y.createdAt)
        .slice(0, 10)
        .map((t) => ({ id: t.id, title: t.title, days: ageInDays(t, p.today, p.settings.timeZone), in: p.place(t) })),
    },
  };
});

// ---------- Changing ----------

export const createTasks = tool(
  {
    tasks: v.array(
      v.object({
        title: v.string(),
        date: v.optional(v.string()),
        list: v.optional(v.string()),
        start: v.optional(v.string()),
        label: v.optional(v.string()),
        estimate: v.optional(v.number()),
        due: v.optional(v.string()),
        priority: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
        notes: v.optional(v.string()),
        subtasks: v.optional(v.array(v.string())),
      }),
    ),
  },
  async (p, { tasks }) => {
    checkBatch(tasks);
    const planned = tasks.map((input, i) => {
      const where = target(p, input);
      if (input.start && !where.date) fail("invalid", `Task ${i + 1}, "${input.title}": a start time needs a date. Give it a date, or leave out the start.`);
      if ((input.subtasks?.length ?? 0) > MCP_LIMITS.subtasks) fail("invalid", `Task ${i + 1} has more than ${MCP_LIMITS.subtasks} subtasks.`);
      return {
        ...where,
        title: checkTitle(input.title),
        start: input.start ? checkTime(input.start) : null,
        labelId: p.label(input.label) ?? null,
        estimate: input.estimate !== undefined ? checkMinutes(input.estimate, "Estimate") || null : undefined,
        dueDate: input.due ? checkDate(input.due, "due date") : null,
        priority: (input.priority ?? null) as Priority | null,
        notes: input.notes ? textToNotes(input.notes) : "",
        subtasks: (input.subtasks ?? []).map((s) => checkTitle(s, "Subtask title")),
      };
    });
    await p.loadTargets(planned);
    let state = p.state;
    const ops: Op[] = [];
    const ids: string[] = [];
    for (const input of planned) {
      // A label left out is null, so `createTask` can still pick it from `[Label]` in the title or the list's auto label.
      const made = createTask(state, { ...input, position: "bottom" }, p.now);
      state = applyOps(state, made.ops, p.now);
      ops.push(...made.ops);
      ids.push(made.id);
    }
    await p.apply(ops, ids.length);
    return {
      created: ids.map((id) => p.row(p.state.tasks[id]!)),
      days: dayLoads(p, planned.map((t) => t.date)),
    };
  },
);

export const updateTask = tool(
  {
    id: v.string(),
    title: v.optional(v.string()),
    notes: nullableString,
    label: nullableString,
    estimate: v.optional(v.union(v.number(), v.null())),
    actual: v.optional(v.number()),
    due: nullableString,
    priority: priorityArg,
  },
  async (p, args) => {
    await p.loadTasks([args.id]);
    const t = p.task(args.id);
    const fields: Partial<Task> = {};
    if (args.title !== undefined) fields.title = checkTitle(args.title);
    if (args.notes !== undefined) fields.notes = args.notes ? textToNotes(args.notes) : "";
    if (args.label !== undefined) fields.labelId = p.label(args.label) ?? null;
    if (args.estimate !== undefined) fields.estimate = args.estimate === null ? null : checkMinutes(args.estimate, "Estimate") || null;
    if (args.actual !== undefined) fields.actual = checkMinutes(args.actual, "Actual time");
    if (args.due !== undefined) fields.dueDate = args.due ? checkDate(args.due, "due date") : null;
    if (args.priority !== undefined) fields.priority = args.priority;
    if (!Object.keys(fields).length) fail("invalid", "Nothing to change. Give at least one of title, notes, label, estimate, actual, due or priority.");
    await p.loadSubtasks([t.id]);
    await p.apply(coreUpdateTask(t.id, fields), 1);
    return p.row(p.state.tasks[t.id]!);
  },
);

export const updateSubtasks = tool(
  {
    taskId: v.string(),
    changes: v.array(
      v.object({
        action: v.union(v.literal("add"), v.literal("done"), v.literal("undone"), v.literal("rename"), v.literal("move"), v.literal("remove")),
        id: v.optional(v.string()),
        title: v.optional(v.string()),
        index: v.optional(v.number()),
      }),
    ),
  },
  async (p, { taskId, changes }) => {
    checkBatch(changes, "subtask changes");
    await p.loadTasks([taskId]);
    const t = p.task(taskId);
    await p.loadSubtasks([taskId]);
    const ops: Op[] = [];
    const run = (next: Op[]) => {
      p.state = applyOps(p.state, next, p.now);
      ops.push(...next);
    };
    const subtask = (id: string | undefined, i: number) => {
      const s = id ? p.state.subtasks[id] : undefined;
      if (!s || s.taskId !== taskId || s.deletedAt !== null) {
        fail("not_found", `Change ${i + 1}: ${id ? `no subtask "${id}" on this task` : "give the subtask's id"}. Subtask ids come from get_task.`);
      }
      return s;
    };
    const before = { ...p.state };
    changes.forEach((c, i) => {
      if (c.action === "add") {
        if (subtasksFor(p.state, taskId).length >= MCP_LIMITS.subtasks) fail("invalid", `A task can have up to ${MCP_LIMITS.subtasks} subtasks here.`);
        const made = addSubtask(p.state, taskId, checkTitle(c.title ?? "", "Subtask title"), undefined, p.now);
        run(made.ops);
        if (c.index !== undefined) run(moveSubtask(p.state, made.id, Math.max(0, Math.round(c.index))));
      } else {
        const s = subtask(c.id, i);
        if (c.action === "done" || c.action === "undone") run(setSubtaskDone(p.state, s.id, c.action === "done", p.now));
        else if (c.action === "rename") run([patch("subtasks", s.id, { title: checkTitle(c.title ?? "", "Subtask title") })]);
        else if (c.action === "move") run(moveSubtask(p.state, s.id, Math.max(0, Math.round(c.index ?? 0))));
        else run([patch("subtasks", s.id, { deletedAt: p.now })]);
      }
    });
    p.state = before;
    await p.apply(ops, 1);
    return {
      task: p.row(p.state.tasks[taskId]!),
      subtasks: subtasksFor(p.state, taskId).map((s) => ({ id: s.id, title: s.title, done: s.done })),
      ...clean({ finished: !t.done && p.state.tasks[taskId]!.done ? "Every subtask is done, so the task was checked off too." : null }),
    };
  },
);

export const setDone = tool({ ids: v.array(v.string()), done: v.boolean() }, async (p, { ids, done }) => {
  checkBatch(ids);
  await p.loadTasks(ids);
  const tasks = ids.map((id) => p.task(id));
  let state = p.state;
  const ops: Op[] = [];
  for (const t of tasks) {
    const next = coreSetDone(state, t.id, done, p.now);
    ops.push(...next);
    state = applyOps(state, next, p.now);
  }
  await p.apply(ops, tasks.length);
  await p.loadSubtasks(ids);
  return { tasks: tasks.map((t) => p.row(p.state.tasks[t.id]!)) };
});

export const moveTasks = tool(
  { ids: v.array(v.string()), date: v.optional(v.string()), list: v.optional(v.string()) },
  async (p, args) => {
    checkBatch(args.ids);
    const where = target(p, args);
    await p.loadTasks(args.ids);
    const tasks = args.ids.map((id) => p.task(id));
    await p.loadTargets([where]);
    const from = tasks.map((t) => t.date);
    let state = p.state;
    const ops: Op[] = [];
    for (const t of tasks) {
      const next = moveTask(state, t.id, { ...where, index: undefined });
      ops.push(...next);
      state = applyOps(state, next, p.now);
    }
    await p.apply(ops, tasks.length);
    await p.loadSubtasks(args.ids);
    return {
      moved: tasks.map((t) => p.row(p.state.tasks[t.id]!)),
      note: tasks.some((t) => t.start) ? "Moving clears Timebox start times." : undefined,
      days: dayLoads(p, [...from, where.date]),
    };
  },
);

export const timeboxTask = tool({ id: v.string(), start: v.union(v.string(), v.null()), date: v.optional(v.string()) }, async (p, args) => {
  await p.loadTasks([args.id]);
  const t = p.task(args.id);
  const date = args.date ? checkDate(args.date) : t.date;
  if (!date) fail("invalid", `"${t.title}" is in the ${p.place(t)}, not on a day. Give a date to plan it and timebox it in one go.`);
  const start = args.start === null ? null : checkTime(args.start);
  await p.loadDays(date, date, false);
  const ops = date !== t.date ? moveTask(p.state, t.id, { date, listId: null, start }) : coreUpdateTask(t.id, { start });
  await p.apply(ops, 1);
  const task = p.state.tasks[t.id]!;

  const warnings: string[] = [];
  if (task.start) {
    const begins = timeToMinutes(task.start);
    const ends = begins + blockMinutes(task);
    if (!task.estimate) warnings.push("It has no estimate, so its block is 30 minutes.");
    if (runsPastMidnight(task)) warnings.push("Its block runs past midnight.");
    for (const other of tasksForDay(p.state, date)) {
      if (other.id === task.id || !other.start || other.done) continue;
      const s = timeToMinutes(other.start);
      if (s < ends && begins < s + blockMinutes(other)) warnings.push(`It overlaps "${other.title}" at ${other.start}.`);
    }
  }
  await p.loadSubtasks([t.id]);
  return {
    task: p.row(task),
    ...clean({
      ends: task.start ? minutesToTime(Math.min(timeToMinutes(task.start) + blockMinutes(task), 24 * 60 - 1)) : null,
      warnings: warnings.length ? warnings : null,
    }),
  };
});

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export const setRepeat = tool(
  {
    id: v.string(),
    repeat: v.union(
      v.null(),
      v.object({
        every: v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("year")),
        interval: v.optional(v.number()),
        weekdays: v.optional(v.array(v.string())),
        dayOfMonth: v.optional(v.number()),
        until: v.optional(v.string()),
        count: v.optional(v.number()),
      }),
    ),
  },
  async (p, args) => {
    await p.loadTasks([args.id]);
    const t = p.task(args.id);
    if (t.seriesId) await p.loadSeries(t.seriesId);
    await p.loadSubtasks([t.id]);

    if (args.repeat === null) {
      if (!t.seriesId) fail("invalid", `"${t.title}" doesn't repeat.`);
      await p.apply(stopRepeating(p.state, t.id, p.now), 1);
      return { task: p.row(p.state.tasks[t.id]!), repeat: "Stopped. This task stays as a normal task, and later repeats are removed." };
    }

    const r = args.repeat;
    const date = t.date ?? p.today;
    const interval = Math.round(r.interval ?? 1);
    if (interval < 1 || interval > 99) fail("invalid", "interval must be between 1 and 99.");
    const byDay = (r.weekdays ?? []).map((d) => {
      const i = WEEKDAYS.indexOf(d.trim().toLowerCase().slice(0, 3) as (typeof WEEKDAYS)[number]);
      if (i < 0) fail("invalid", `"${d}" isn't a weekday. Use mon, tue, wed, thu, fri, sat or sun.`);
      return i;
    });
    if (byDay.length && r.every !== "week") fail("invalid", 'weekdays only work with every: "week".');
    const dayOfMonth = r.dayOfMonth !== undefined ? Math.round(r.dayOfMonth) : null;
    if (dayOfMonth !== null && (dayOfMonth < 1 || dayOfMonth > 31 || r.every === "day" || r.every === "week")) {
      fail("invalid", 'dayOfMonth must be 1 to 31, with every: "month" or "year".');
    }
    if (r.count !== undefined && (r.count < 1 || r.count > 999)) fail("invalid", "count must be between 1 and 999.");
    const rule: RepeatRule = {
      freq: ({ day: "DAILY", week: "WEEKLY", month: "MONTHLY", year: "YEARLY" } as const)[r.every],
      interval,
      byDay: r.every === "week" ? (byDay.length ? byDay : [new Date(keyToUtc(date)).getUTCDay()]) : [],
      byMonthDay: r.every === "month" || r.every === "year" ? (dayOfMonth ?? Number(date.slice(8, 10))) : null,
      byMonth: r.every === "year" ? Number(date.slice(5, 7)) : null,
      until: r.until ? checkDate(r.until, "until date") : null,
      count: r.count !== undefined ? Math.round(r.count) : null,
    };
    const text = formatRule(rule);
    await p.apply(makeRepeating(p.state, t.id, text, p.today, null, p.now), 1);
    const task = p.state.tasks[t.id]!;
    const series = task.seriesId ? p.state.series[task.seriesId] : undefined;
    return {
      task: p.row(task),
      repeat: describeRule(text),
      ...clean({
        next: series ? nextOccurrence(series, addDays(task.seriesDate ?? date, 1)) : null,
        note: t.date ? null : `It was in the ${p.place(t)}, so it now starts today, ${p.today}.`,
      }),
    };
  },
);

export const logTime = tool({ id: v.string(), minutes: v.number() }, async (p, args) => {
  const minutes = checkMinutes(args.minutes, "minutes");
  if (minutes === 0) fail("invalid", "Log at least 1 minute.");
  await p.loadTasks([args.id]);
  const t = p.task(args.id);
  await p.apply(coreUpdateTask(t.id, { actual: round(t.actual + minutes) }), 1);
  await p.loadSubtasks([t.id]);
  return p.row(p.state.tasks[t.id]!);
});

export const createList = tool({ name: v.string(), icon: v.optional(v.string()), label: v.optional(v.string()) }, async (p, args) => {
  const name = checkTitle(args.name, "List name").slice(0, 80);
  const existing = liveLists(p.state).find((l) => l.name.trim().toLowerCase() === name.toLowerCase());
  if (existing) fail("invalid", `A list called "${existing.name}" already exists, with id ${existing.id}.`);
  const icon = (args.icon ?? "").trim() || "📋";
  if ([...icon].length > 4) fail("invalid", "icon should be a single emoji, such as 🏃.");
  const made = coreCreateList(p.state, { name, icon, autoLabelId: p.label(args.label) ?? null }, p.now);
  await p.apply(made.ops, 1);
  const list: List = p.state.lists[made.id]!;
  return clean({ id: list.id, name: list.name, icon: list.icon, label: list.autoLabelId ? p.state.labels[list.autoLabelId]?.name : null });
});

export const createLabel = tool({ name: v.string(), color: v.string() }, async (p, args) => {
  const name = checkTitle(args.name, "Label name").slice(0, 40);
  const existing = liveLabels(p.state).find((l) => l.name.trim().toLowerCase() === name.toLowerCase());
  if (existing) fail("invalid", `A label called "${existing.name}" already exists, with id ${existing.id}.`);
  const color = args.color.trim().toLowerCase();
  if (!(labelColors as readonly string[]).includes(color)) fail("invalid", `"${args.color}" isn't a label color. Choose one of: ${labelColors.join(", ")}.`);
  const made = coreCreateLabel(p.state, { name, color }, p.now);
  await p.apply(made.ops, 1);
  const label: Label = p.state.labels[made.id]!;
  return { id: label.id, name: label.name, color: label.color };
});

export const deleteTasks = tool({ ids: v.array(v.string()) }, async (p, { ids }) => {
  checkBatch(ids);
  await p.loadTasks(ids);
  const tasks = ids.map((id) => p.task(id));
  for (const seriesId of new Set(tasks.map((t) => t.seriesId).filter((s): s is string => s !== null))) await p.loadSeries(seriesId);
  let state = p.state;
  const ops: Op[] = [];
  for (const t of tasks) {
    // A repeating task's day is skipped, so the repeat doesn't bring it back.
    const next = t.seriesId ? deleteInstance(state, t.id, p.now) : deleteTask(t.id, p.now);
    ops.push(...next);
    state = applyOps(state, next, p.now);
  }
  await p.apply(ops, tasks.length);
  return {
    trashed: tasks.map((t) => ({ id: t.id, title: t.title, was: p.place(t) })),
    note: "They're in Trash for 30 days. restore_tasks brings them back.",
  };
});

export const restoreTasks = tool({ ids: v.array(v.string()) }, async (p, { ids }) => {
  checkBatch(ids);
  await p.loadTasks(ids);
  const tasks = ids.map((id) => p.task(id, { trashed: true }));
  await p.loadDays(p.today, p.today, false);
  let state = p.state;
  const ops: Op[] = [];
  for (const t of tasks) {
    const next = restoreTask(state, t.id, p.today);
    ops.push(...next);
    state = applyOps(state, next, p.now);
  }
  await p.apply(ops, tasks.length);
  await p.loadSubtasks(ids);
  return {
    restored: tasks.map((t) => p.row(p.state.tasks[t.id]!)),
    note: `Restored tasks go on today, ${p.today}, as in the Beans app. Move them with move_tasks if they belong elsewhere.`,
  };
});

// ---------- Settings > Connected apps ----------

/** AI apps that have used this account through the MCP server, newest first. */
export const connections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db
      .query("mcpConnections")
      .withIndex("by_user_client", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((r) => r.revokedAt === null)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .map((r) => ({ clientId: r.clientId, name: r.name, firstUsedAt: r.firstUsedAt, lastUsedAt: r.lastUsedAt }));
  },
});

/**
 * Stops an app reading or changing the planner. Its current tokens are
 * refused from now on; signing in to Beans from that app again reconnects it.
 */
export const disconnect = mutation({
  args: { clientId: v.string() },
  handler: async (ctx, { clientId }) => {
    const userId = await requireUser(ctx);
    const row = await ctx.db
      .query("mcpConnections")
      .withIndex("by_user_client", (q) => q.eq("userId", userId).eq("clientId", clientId))
      .unique();
    if (row) await ctx.db.patch(row._id, { revokedAt: Date.now() });
  },
});
