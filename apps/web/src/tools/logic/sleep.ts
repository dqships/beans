/** The sleep calculator's arithmetic: count back or forward in 90-minute cycles. All pure. */

/** One sleep cycle, in minutes. An average: real cycles vary. */
export const CYCLE_MINUTES = 90;

/** The options shown, longest night first. */
export const CYCLE_COUNTS = [6, 5, 4, 3] as const;

export const DEFAULT_FALL_ASLEEP = 15;
export const MAX_FALL_ASLEEP = 120;

const DAY_MINUTES = 24 * 60;

export type SleepOption = {
  cycles: number;
  /** The bedtime or the wake-up time, in minutes since midnight. */
  minutes: number;
  /** Time asleep, in minutes: cycles of 90. The time to fall asleep is not part of it. */
  asleep: number;
  /** Days from the time you gave: -1 for a bedtime the evening before, 1 for a wake-up the next morning. */
  shift: number;
  /** True for 5 and 6 cycles, which give 7.5 and 9 hours of sleep. */
  inRange: boolean;
};

const cleanLead = (minutes: number) => (Number.isFinite(minutes) ? Math.min(MAX_FALL_ASLEEP, Math.max(0, Math.round(minutes))) : DEFAULT_FALL_ASLEEP);

const wrap = (minutes: number) => ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;

const inRange = (cycles: number) => {
  const asleep = cycles * CYCLE_MINUTES;
  return asleep >= 7.5 * 60 && asleep <= 9 * 60;
};

/** `HH:MM` as minutes since midnight, or null for anything else. */
export function parseTime(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** When to get into bed to wake at `wake` after whole cycles, allowing `fallAsleep` minutes to drift off. */
export function bedtimesFor(wake: number, fallAsleep: number = DEFAULT_FALL_ASLEEP): SleepOption[] {
  const lead = cleanLead(fallAsleep);
  return CYCLE_COUNTS.map((cycles) => {
    const asleep = cycles * CYCLE_MINUTES;
    const raw = wake - asleep - lead;
    return { cycles, minutes: wrap(raw), asleep, shift: Math.floor(raw / DAY_MINUTES), inRange: inRange(cycles) };
  });
}

/** When to wake after whole cycles if you get into bed at `bed` and take `fallAsleep` minutes to drift off. */
export function wakeTimesFor(bed: number, fallAsleep: number = DEFAULT_FALL_ASLEEP): SleepOption[] {
  const lead = cleanLead(fallAsleep);
  return CYCLE_COUNTS.map((cycles) => {
    const asleep = cycles * CYCLE_MINUTES;
    const raw = bed + lead + asleep;
    return { cycles, minutes: wrap(raw), asleep, shift: Math.floor(raw / DAY_MINUTES), inRange: inRange(cycles) };
  });
}

/** "7.5 hours", "9 hours", "1 hour" */
export function formatSleepHours(asleep: number): string {
  const hours = Math.round((asleep / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** "10:45 pm" or "22:45" */
export function formatSleepTime(minutes: number, format: "12h" | "24h"): string {
  const total = wrap(Math.round(minutes));
  const hour = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, "0");
  if (format === "24h") return `${String(hour).padStart(2, "0")}:${minute}`;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${hour < 12 ? "am" : "pm"}`;
}

export type SleepMode = "wake" | "bed" | "now";

export type SleepSettings = {
  mode: SleepMode;
  /** `HH:MM` */
  wake: string;
  bed: string;
  fallAsleep: number;
  format: "12h" | "24h";
};

export const DEFAULT_SLEEP: SleepSettings = { mode: "wake", wake: "07:00", bed: "23:00", fallAsleep: DEFAULT_FALL_ASLEEP, format: "12h" };

const isTimeOrEmpty = (value: unknown): value is string => typeof value === "string" && (value === "" || parseTime(value) !== null);

/** Checks the settings saved in local storage. */
export function parseSleepSettings(stored: unknown): SleepSettings | null {
  if (!stored || typeof stored !== "object") return null;
  const { mode, wake, bed, fallAsleep, format } = stored as Record<string, unknown>;
  if (mode !== "wake" && mode !== "bed" && mode !== "now") return null;
  if (!isTimeOrEmpty(wake) || !isTimeOrEmpty(bed)) return null;
  if (typeof fallAsleep !== "number" || !Number.isInteger(fallAsleep) || fallAsleep < 0 || fallAsleep > MAX_FALL_ASLEEP) return null;
  if (format !== "12h" && format !== "24h") return null;
  return { mode, wake, bed, fallAsleep, format };
}
