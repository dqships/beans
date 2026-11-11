/** The weekly schedule maker: blocks that repeat on chosen days, and where each one sits in the week grid. All pure. */

export const LABEL_COLORS = ["soil", "tomato", "pumpkin", "corn", "sprout", "rain", "plum", "beet"] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export type WeekStart = "mon" | "sun";

export type WeekBlock = {
  id: string;
  name: string;
  /** 0 is Sunday. Sorted, no repeats, never empty. */
  days: number[];
  /** Minutes after midnight. `end` is later than `start`, and at most 1440. */
  start: number;
  end: number;
  color: LabelColor;
};

export type Week = {
  title: string;
  weekStart: WeekStart;
  /** The grid runs from the top of `startHour` to the top of `endHour`: 0 to 23, and 1 to 24. */
  startHour: number;
  endHour: number;
  blocks: WeekBlock[];
};

export const EMPTY_WEEK: Week = { title: "", weekStart: "mon", startHour: 7, endHour: 21, blocks: [] };

export const MAX_BLOCKS = 60;
export const MAX_NAME = 60;
export const MAX_TITLE = 120;
const DAY_MINUTES = 24 * 60;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** The seven days in the order the grid shows them. */
export function dayOrder(weekStart: WeekStart): number[] {
  return weekStart === "sun" ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
}

/** "9 AM", "9:30 AM", "12 PM". Midnight at the end of the day reads "12 AM". */
export function formatClock(minutes: number): string {
  const total = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** Reads a time field's "HH:MM". Null for anything else. */
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Minutes as a time field's value: "09:30". */
export function toTimeValue(minutes: number): string {
  const clamped = Math.min(DAY_MINUTES - 1, Math.max(0, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** What the add form holds while you type. */
export type BlockDraft = { name: string; days: number[]; start: string; end: string; color: LabelColor };

export const EMPTY_DRAFT: BlockDraft = { name: "", days: [], start: "09:00", end: "10:00", color: "sprout" };

export type DraftProblem = "name" | "days" | "time" | "order";

const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
const cleanDays = (days: readonly number[]) => [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);

/** Checks a draft. Returns the block's fields, or the first thing wrong with it. */
export function checkDraft(draft: BlockDraft): { ok: true; block: Omit<WeekBlock, "id"> } | { ok: false; problem: DraftProblem } {
  const name = cleanName(draft.name);
  if (!name) return { ok: false, problem: "name" };
  const days = cleanDays(draft.days);
  if (days.length === 0) return { ok: false, problem: "days" };
  const start = parseTime(draft.start);
  const end = parseTime(draft.end);
  if (start === null || end === null) return { ok: false, problem: "time" };
  // A block can't cross midnight, so an end of 12:00 AM means the end of the day.
  const until = end === 0 ? DAY_MINUTES : end;
  if (until <= start) return { ok: false, problem: "order" };
  return { ok: true, block: { name, days, start, end: until, color: draft.color } };
}

/** A saved block as a draft, to edit it in the form. */
export function draftOf(block: WeekBlock): BlockDraft {
  return { name: block.name, days: [...block.days], start: toTimeValue(block.start), end: toTimeValue(block.end === DAY_MINUTES ? 0 : block.end), color: block.color };
}

/** Widens the hours shown, if needed, so a block from `start` to `end` is all on the grid. */
export function fitHours(week: Week, start: number, end: number): Week {
  return { ...week, startHour: Math.min(week.startHour, Math.floor(start / 60)), endHour: Math.max(week.endHour, Math.ceil(end / 60)) };
}

/** Adds a block and makes sure the grid shows it. A full schedule changes nothing. */
export function addBlock(week: Week, block: Omit<WeekBlock, "id">, id: string): Week {
  if (week.blocks.length >= MAX_BLOCKS) return week;
  return fitHours({ ...week, blocks: [...week.blocks, { ...block, id }] }, block.start, block.end);
}

export function updateBlock(week: Week, id: string, block: Omit<WeekBlock, "id">): Week {
  if (!week.blocks.some((existing) => existing.id === id)) return week;
  return fitHours({ ...week, blocks: week.blocks.map((existing) => (existing.id === id ? { ...block, id } : existing)) }, block.start, block.end);
}

export function removeBlock(week: Week, id: string): Week {
  return { ...week, blocks: week.blocks.filter((block) => block.id !== id) };
}

/** Changes the first hour shown. The grid always keeps at least one hour. */
export function setStartHour(week: Week, startHour: number): Week {
  const start = Number.isFinite(startHour) ? Math.min(23, Math.max(0, Math.round(startHour))) : week.startHour;
  return { ...week, startHour: start, endHour: Math.max(start + 1, week.endHour) };
}

/** Changes the hour the grid ends at. */
export function setEndHour(week: Week, endHour: number): Week {
  const end = Number.isFinite(endHour) ? Math.min(24, Math.max(1, Math.round(endHour))) : week.endHour;
  return { ...week, endHour: end, startHour: Math.min(end - 1, week.startHour) };
}

/** The grid has one row per five minutes. */
export const SLOT_MINUTES = 5;
/** A block is never drawn shorter than this many rows, so its name can be read. */
export const MIN_SLOTS = 5;

/** How many five-minute rows the grid has. */
export function slotCount(week: Pick<Week, "startHour" | "endHour">): number {
  return ((week.endHour - week.startHour) * 60) / SLOT_MINUTES;
}

/**
 * The grid lines a block runs between, counting from 1 at the top of the
 * first hour. The block is cut to the hours shown. Null when none of it is.
 */
export function placeBlock(block: Pick<WeekBlock, "start" | "end">, startHour: number, endHour: number): { rowStart: number; rowEnd: number } | null {
  const viewStart = startHour * 60;
  const viewEnd = endHour * 60;
  const from = Math.max(block.start, viewStart);
  const to = Math.min(block.end, viewEnd);
  if (to <= from) return null;
  const slots = (viewEnd - viewStart) / SLOT_MINUTES;
  let first = Math.floor((from - viewStart) / SLOT_MINUTES);
  let last = Math.ceil((to - viewStart) / SLOT_MINUTES);
  if (last - first < MIN_SLOTS) {
    last = Math.min(slots, first + MIN_SLOTS);
    first = Math.max(0, last - MIN_SLOTS);
  }
  return { rowStart: first + 1, rowEnd: last + 1 };
}

export type PlacedBlock = {
  block: WeekBlock;
  rowStart: number;
  rowEnd: number;
  /** Blocks that overlap share the day's width: this one sits in column `lane` (from 1) of `lanes`. */
  lane: number;
  lanes: number;
};

/**
 * One day's blocks, earliest first, each with its rows and its column among
 * the blocks it overlaps. Blocks outside the hours shown are left out.
 */
export function layoutDay(week: Week, day: number): PlacedBlock[] {
  const placed: PlacedBlock[] = [];
  for (const block of week.blocks) {
    if (!block.days.includes(day)) continue;
    const rows = placeBlock(block, week.startHour, week.endHour);
    if (rows) placed.push({ block, ...rows, lane: 1, lanes: 1 });
  }
  placed.sort((a, b) => a.rowStart - b.rowStart || b.rowEnd - a.rowEnd || a.block.start - b.block.start || a.block.name.localeCompare(b.block.name));

  let group: PlacedBlock[] = [];
  let groupEnd = 0;
  let laneEnds: number[] = [];
  const close = () => {
    for (const item of group) item.lanes = laneEnds.length;
  };
  for (const item of placed) {
    if (group.length > 0 && item.rowStart >= groupEnd) {
      close();
      group = [];
      laneEnds = [];
    }
    let lane = laneEnds.findIndex((end) => end <= item.rowStart);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = item.rowEnd;
    item.lane = lane + 1;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.rowEnd);
  }
  close();
  return placed;
}

/** How many blocks have no part inside the hours shown. */
export function hiddenCount(week: Week): number {
  return week.blocks.filter((block) => placeBlock(block, week.startHour, week.endHour) === null).length;
}

/** "Mon, Wed, Fri" in the order the grid shows the days. */
export function daysLabel(days: readonly number[], weekStart: WeekStart, long = false): string {
  return dayOrder(weekStart)
    .filter((day) => days.includes(day))
    .map((day) => (long ? DAY_NAMES : DAY_SHORT)[day])
    .join(", ");
}

/** Checks a schedule read back from local storage. */
export function parseWeek(stored: unknown): Week | null {
  if (!stored || typeof stored !== "object") return null;
  const { title, weekStart, startHour, endHour, blocks } = stored as Record<string, unknown>;
  if (typeof title !== "string" || (weekStart !== "mon" && weekStart !== "sun") || !Array.isArray(blocks)) return null;
  if (typeof startHour !== "number" || typeof endHour !== "number" || !Number.isInteger(startHour) || !Number.isInteger(endHour)) return null;
  if (startHour < 0 || endHour > 24 || endHour <= startHour) return null;
  const parsed: WeekBlock[] = [];
  for (const block of blocks.slice(0, MAX_BLOCKS)) {
    if (!block || typeof block !== "object") return null;
    const { id, name, days, start, end, color } = block as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string" || !name.trim() || !Array.isArray(days)) return null;
    if (typeof start !== "number" || typeof end !== "number" || !Number.isInteger(start) || !Number.isInteger(end)) return null;
    if (start < 0 || end > DAY_MINUTES || end <= start) return null;
    if (!LABEL_COLORS.includes(color as LabelColor)) return null;
    if (days.some((day) => typeof day !== "number")) return null;
    const cleaned = cleanDays(days as number[]);
    if (cleaned.length === 0 || cleaned.length !== days.length) return null;
    parsed.push({ id, name: name.slice(0, MAX_NAME), days: cleaned, start, end, color: color as LabelColor });
  }
  return { title: title.slice(0, MAX_TITLE), weekStart, startHour, endHour, blocks: parsed };
}
