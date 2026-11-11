/**
 * Time zone math for the meeting planner. Every function takes an IANA zone
 * name and a UTC timestamp (or a wall-clock date and time in a zone) and asks
 * `Intl.DateTimeFormat` for the answer, so daylight saving comes from the
 * browser's own zone data. Nothing here reads the clock.
 */

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Working hours on each strip: 9:00 up to 17:00, local time. */
export const WORK_START = 9 * 60;
export const WORK_END = 17 * 60;

export const MIN_PLACES = 2;
export const MAX_PLACES = 5;

export type Place = { zone: string; label: string };

/** Well-known zones, west to east, named by a city most people know. */
export const PLACES: readonly Place[] = [
  { zone: "Pacific/Honolulu", label: "Honolulu" },
  { zone: "America/Anchorage", label: "Anchorage" },
  { zone: "America/Los_Angeles", label: "Los Angeles" },
  { zone: "America/Phoenix", label: "Phoenix" },
  { zone: "America/Denver", label: "Denver" },
  { zone: "America/Mexico_City", label: "Mexico City" },
  { zone: "America/Chicago", label: "Chicago" },
  { zone: "America/Bogota", label: "Bogotá" },
  { zone: "America/New_York", label: "New York" },
  { zone: "America/Toronto", label: "Toronto" },
  { zone: "America/Halifax", label: "Halifax" },
  { zone: "America/Santiago", label: "Santiago" },
  { zone: "America/Sao_Paulo", label: "São Paulo" },
  { zone: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { zone: "Atlantic/Reykjavik", label: "Reykjavík" },
  { zone: "UTC", label: "UTC" },
  { zone: "Europe/Lisbon", label: "Lisbon" },
  { zone: "Europe/London", label: "London" },
  { zone: "Europe/Dublin", label: "Dublin" },
  { zone: "Africa/Lagos", label: "Lagos" },
  { zone: "Europe/Madrid", label: "Madrid" },
  { zone: "Europe/Paris", label: "Paris" },
  { zone: "Europe/Amsterdam", label: "Amsterdam" },
  { zone: "Europe/Berlin", label: "Berlin" },
  { zone: "Europe/Rome", label: "Rome" },
  { zone: "Africa/Cairo", label: "Cairo" },
  { zone: "Africa/Johannesburg", label: "Johannesburg" },
  { zone: "Europe/Athens", label: "Athens" },
  { zone: "Europe/Istanbul", label: "Istanbul" },
  { zone: "Africa/Nairobi", label: "Nairobi" },
  { zone: "Asia/Riyadh", label: "Riyadh" },
  { zone: "Europe/Moscow", label: "Moscow" },
  { zone: "Asia/Dubai", label: "Dubai" },
  { zone: "Asia/Karachi", label: "Karachi" },
  { zone: "Asia/Kolkata", label: "Mumbai and Delhi" },
  { zone: "Asia/Bangkok", label: "Bangkok" },
  { zone: "Asia/Jakarta", label: "Jakarta" },
  { zone: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City" },
  { zone: "Asia/Singapore", label: "Singapore" },
  { zone: "Asia/Hong_Kong", label: "Hong Kong" },
  { zone: "Asia/Shanghai", label: "Beijing and Shanghai" },
  { zone: "Asia/Manila", label: "Manila" },
  { zone: "Australia/Perth", label: "Perth" },
  { zone: "Asia/Seoul", label: "Seoul" },
  { zone: "Asia/Tokyo", label: "Tokyo" },
  { zone: "Australia/Brisbane", label: "Brisbane" },
  { zone: "Australia/Sydney", label: "Sydney" },
  { zone: "Pacific/Auckland", label: "Auckland" },
];

/** Older names some browsers still report for zones on the list. */
const ALIASES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "Etc/UTC": "UTC",
  "Etc/GMT": "UTC",
  GMT: "UTC",
  "US/Pacific": "America/Los_Angeles",
  "US/Mountain": "America/Denver",
  "US/Central": "America/Chicago",
  "US/Eastern": "America/New_York",
  "US/Hawaii": "Pacific/Honolulu",
  "Australia/Melbourne": "Australia/Sydney",
  "America/Montreal": "America/Toronto",
};

const formatters = new Map<string, Intl.DateTimeFormat | null>();

/** One formatter per zone, made once. Null for a zone this browser doesn't know. */
function formatterFor(zone: string): Intl.DateTimeFormat | null {
  const hit = formatters.get(zone);
  if (hit !== undefined) return hit;
  let made: Intl.DateTimeFormat | null = null;
  try {
    made = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    made = null;
  }
  formatters.set(zone, made);
  return made;
}

export function isKnownZone(zone: string): boolean {
  return typeof zone === "string" && zone.length > 0 && zone.length <= 64 && formatterFor(zone) !== null;
}

/** The zone as the list names it, or the zone itself, or UTC when the browser doesn't know it. */
export function cleanZone(zone: string): string {
  const named = ALIASES[zone] ?? zone;
  return isKnownZone(named) ? named : "UTC";
}

/** A place's name: the city on the list, or the last part of the zone name for one that isn't on it. */
export function placeLabel(zone: string): string {
  const listed = PLACES.find((place) => place.zone === zone);
  if (listed) return listed.label;
  const city = zone.split("/").pop() ?? zone;
  return city.replace(/_/g, " ");
}

/** The list, plus any chosen zones that aren't on it, so a visitor's own zone can always be picked. */
export function placeOptions(extra: readonly string[]): { value: string; label: string }[] {
  const options = PLACES.map((place) => ({ value: place.zone, label: place.label }));
  for (const zone of extra) {
    if (!options.some((option) => option.value === zone)) options.unshift({ value: zone, label: placeLabel(zone) });
  }
  return options;
}

export type WallTime = {
  /** `YYYY-MM-DD` */
  date: string;
  /** Minutes since midnight. */
  minutes: number;
};

/** The date and time on the wall in `zone` at the instant `utcMs`. */
export function wallTime(zone: string, utcMs: number): WallTime {
  const formatter = formatterFor(zone) ?? formatterFor("UTC");
  const parts: Record<string, string> = {};
  if (formatter && Number.isFinite(utcMs)) {
    for (const part of formatter.formatToParts(utcMs)) parts[part.type] = part.value;
  }
  const hour = Number(parts.hour ?? 0) % 24;
  return {
    date: `${(parts.year ?? "1970").padStart(4, "0")}-${parts.month ?? "01"}-${parts.day ?? "01"}`,
    minutes: hour * 60 + Number(parts.minute ?? 0),
  };
}

const wallAsUtc = (wall: WallTime): number => {
  const [year, month, day] = wall.date.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day) + wall.minutes * MINUTE_MS;
};

/** How far `zone` is ahead of UTC at the instant `utcMs`, in minutes. New York in winter is -300. */
export function offsetMinutes(zone: string, utcMs: number): number {
  if (!Number.isFinite(utcMs)) return 0;
  // Zones are offset by whole minutes, so compare at the start of the minute.
  const floored = Math.floor(utcMs / MINUTE_MS) * MINUTE_MS;
  return Math.round((wallAsUtc(wallTime(zone, floored)) - floored) / MINUTE_MS);
}

/**
 * The instant when the wall in `zone` reads `date` and `minutes`. On the day
 * clocks go back, the hour that happens twice gives its first pass. On the
 * day they go forward, a time in the skipped hour gives the same time an hour later.
 */
export function zonedToUtc(zone: string, date: string, minutes: number): number {
  const local = wallAsUtc({ date, minutes });
  // The offset a day either side covers both sides of any change near this time.
  const before = local - offsetMinutes(zone, local - DAY_MS) * MINUTE_MS;
  const after = local - offsetMinutes(zone, local + DAY_MS) * MINUTE_MS;
  const reads = (utcMs: number) => utcMs + offsetMinutes(zone, utcMs) * MINUTE_MS === local;
  const matches = [before, after].filter(reads);
  if (matches.length > 0) return Math.min(...matches);
  // The time doesn't exist that day.
  return Math.max(before, after);
}

/** "UTC", "UTC+1", "UTC-5", "UTC+5:30" */
export function offsetLabel(minutes: number): string {
  if (minutes === 0) return "UTC";
  const size = Math.abs(minutes);
  const rest = size % 60;
  return `UTC${minutes < 0 ? "-" : "+"}${Math.floor(size / 60)}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
}

/** Whole days from `base` to `date`: 1 when `date` is the next day, -1 the day before. */
export function dayShift(date: string, base: string): number {
  const utc = (key: string) => wallAsUtc({ date: key, minutes: 0 });
  return Math.round((utc(date) - utc(base)) / DAY_MS);
}

/** "next day", "previous day", or "" for the same day. */
export function dayShiftLabel(shift: number): string {
  if (shift === 0) return "";
  if (shift === 1) return "next day";
  if (shift === -1) return "previous day";
  return shift > 0 ? `${shift} days later` : `${-shift} days earlier`;
}

/** True when the hour starting at `minutes` sits wholly inside working hours. */
export function isWorkingHour(minutes: number): boolean {
  return minutes >= WORK_START && minutes + 60 <= WORK_END;
}

export type StripCell = {
  /** Local minutes since midnight in this place when the column's hour starts. */
  minutes: number;
  /** Days away from the first place's date: -1, 0 or 1. */
  shift: number;
  working: boolean;
};

export type Strips = {
  /** For each of the 24 columns, the instant it starts. Column `h` is `h`:00 in the first place. */
  starts: number[];
  /** One row of 24 cells per place, in the order given. */
  rows: StripCell[][];
  /** For each column, true when every place is in working hours. */
  overlap: boolean[];
};

/** The 24 hours of `date` in the first zone, and what each of them is in every zone. */
export function buildStrips(zones: readonly string[], date: string): Strips {
  const first = zones[0] ?? "UTC";
  const starts = Array.from({ length: 24 }, (_, hour) => zonedToUtc(first, date, hour * 60));
  const rows = zones.map((zone) =>
    starts.map((start) => {
      const wall = wallTime(zone, start);
      return { minutes: wall.minutes, shift: dayShift(wall.date, date), working: isWorkingHour(wall.minutes) };
    }),
  );
  const overlap = starts.map((_, column) => rows.length > 0 && rows.every((row) => row[column]!.working));
  return { starts, rows, overlap };
}

/** Runs of true in `flags`, as [first hour, hour after the last]. */
export function hourRanges(flags: readonly boolean[]): [number, number][] {
  const ranges: [number, number][] = [];
  flags.forEach((on, hour) => {
    if (!on) return;
    const last = ranges[ranges.length - 1];
    if (last && last[1] === hour) last[1] = hour + 1;
    else ranges.push([hour, hour + 1]);
  });
  return ranges;
}

/** "14:30" or "2:30 pm". */
export function formatClock(minutes: number, format: "12h" | "24h"): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, "0");
  if (format === "24h") return `${hour}:${minute}`;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour < 12 ? "am" : "pm"}`;
}

/** A short hour for a strip cell: "9", "14:30", or "9a", "2:30p" on a 12-hour clock. */
export function formatCell(minutes: number, format: "12h" | "24h"): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const tail = minute ? `:${String(minute).padStart(2, "0")}` : "";
  if (format === "24h") return `${hour}${tail}`;
  return `${hour % 12 === 0 ? 12 : hour % 12}${tail}${hour < 12 ? "a" : "p"}`;
}

/** The plain sentence under the strips. `whose` names the first place: "your time", "London time". */
export function overlapSentence(overlap: readonly boolean[], format: "12h" | "24h", whose: string): string {
  const ranges = hourRanges(overlap);
  if (ranges.length === 0) return "No hour has everyone in working hours.";
  const spans = ranges.map(([from, to]) => `from ${formatClock(from * 60, format)} to ${formatClock(to * 60, format)}`);
  const list = spans.length === 1 ? spans[0] : `${spans.slice(0, -1).join(", ")} and ${spans[spans.length - 1]}`;
  return `Everyone is in working hours ${list} ${whose}.`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Wed, Nov 11" */
export function formatDay(date: string): string {
  const utc = new Date(wallAsUtc({ date, minutes: 0 }));
  if (Number.isNaN(utc.getTime())) return "";
  return `${WEEKDAYS[utc.getUTCDay()]}, ${MONTHS[utc.getUTCMonth()]} ${utc.getUTCDate()}`;
}

/** `HH:MM` as minutes since midnight, or null for anything else. */
export function clockToMinutes(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes since midnight as `HH:MM`, the form a time field takes. */
export function minutesToClock(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** True for a real `YYYY-MM-DD` date between 1900 and 2200, the years zone rules can be trusted for. */
export function isPlannerDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split("-").map(Number) as [number, number, number];
  if (year < 1900 || year > 2200) return false;
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

/** `date` moved by whole days. */
export function shiftDay(date: string, days: number): string {
  const moved = new Date(wallAsUtc({ date, minutes: 0 }) + days * DAY_MS);
  return `${String(moved.getUTCFullYear()).padStart(4, "0")}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}-${String(moved.getUTCDate()).padStart(2, "0")}`;
}

const SUGGESTED = ["Europe/London", "America/New_York", "Asia/Tokyo", "America/Los_Angeles", "Asia/Kolkata", "Australia/Sydney", "Europe/Berlin"];

/** A place to add next: the first well-known one that isn't chosen yet. */
export function suggestZone(zones: readonly string[]): string {
  return SUGGESTED.find((zone) => !zones.includes(zone)) ?? "UTC";
}

/** The first two places for a new visitor: their own zone, and one across an ocean from it. */
export function defaultZones(localZone: string): string[] {
  const own = cleanZone(localZone);
  const far = own.startsWith("America/") || own.startsWith("Pacific/Honolulu") ? "Europe/London" : "America/New_York";
  return [own, far];
}

/** Checks the places saved in local storage: two to five zone names. */
export function parseZones(stored: unknown): string[] | null {
  if (!Array.isArray(stored) || stored.length < MIN_PLACES || stored.length > MAX_PLACES) return null;
  const zones: string[] = [];
  for (const zone of stored) {
    if (typeof zone !== "string" || !/^[A-Za-z0-9_+\-/]{1,64}$/.test(zone)) return null;
    zones.push(zone);
  }
  return zones;
}

export type PlannerSettings = { zones: string[] | null; format: "12h" | "24h" };

/** `zones` is null until the visitor changes a place; until then the defaults come from their own zone. */
export const DEFAULT_PLANNER: PlannerSettings = { zones: null, format: "24h" };

export function parsePlanner(stored: unknown): PlannerSettings | null {
  if (!stored || typeof stored !== "object") return null;
  const { zones, format } = stored as Record<string, unknown>;
  if (format !== "12h" && format !== "24h") return null;
  if (zones === null) return { zones: null, format };
  const parsed = parseZones(zones);
  return parsed ? { zones: parsed, format } : null;
}
