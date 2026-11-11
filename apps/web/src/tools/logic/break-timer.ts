/** The break timer: a stretch of work, then a break, over and over. */

export type BreakPresetId = "52-17" | "50-10" | "25-5" | "20-20-20" | "custom";

export type BreakSettings = {
  preset: BreakPresetId;
  /** Minutes of work, used when the preset is "custom". */
  work: number;
  /** Minutes of break, used when the preset is "custom". */
  rest: number;
  sound: boolean;
};

export const DEFAULT_BREAK: BreakSettings = { preset: "52-17", work: 45, rest: 10, sound: true };

export const WORK_RANGE = { min: 1, max: 180 } as const;
export const REST_RANGE = { min: 1, max: 60 } as const;

const MINUTE = 60_000;

/** The ready-made patterns. `custom` isn't here: its lengths come from the settings. */
export const BREAK_PRESETS: readonly { id: Exclude<BreakPresetId, "custom">; label: string; workMs: number; restMs: number }[] = [
  { id: "52-17", label: "52 / 17", workMs: 52 * MINUTE, restMs: 17 * MINUTE },
  { id: "50-10", label: "50 / 10", workMs: 50 * MINUTE, restMs: 10 * MINUTE },
  { id: "25-5", label: "25 / 5", workMs: 25 * MINUTE, restMs: 5 * MINUTE },
  { id: "20-20-20", label: "20-20-20", workMs: 20 * MINUTE, restMs: 20_000 },
];

export const BREAK_PRESET_IDS: readonly BreakPresetId[] = [...BREAK_PRESETS.map((preset) => preset.id), "custom"];

export type Part = "work" | "rest";

const clampMinutes = (value: number, range: { min: number; max: number }) => (Number.isFinite(value) ? Math.min(range.max, Math.max(range.min, Math.round(value))) : range.min);

/** How long the work and the break last under these settings. */
export function planFor(settings: BreakSettings): { workMs: number; restMs: number } {
  const preset = BREAK_PRESETS.find((candidate) => candidate.id === settings.preset);
  if (preset) return { workMs: preset.workMs, restMs: preset.restMs };
  return { workMs: clampMinutes(settings.work, WORK_RANGE) * MINUTE, restMs: clampMinutes(settings.rest, REST_RANGE) * MINUTE };
}

export function partMs(part: Part, settings: BreakSettings): number {
  const plan = planFor(settings);
  return part === "work" ? plan.workMs : plan.restMs;
}

/** Work and break take turns. */
export function nextPart(part: Part): Part {
  return part === "work" ? "rest" : "work";
}

/** Cycles finished after `part` ends by itself. A cycle is one stretch of work and the break after it. */
export function cyclesAfter(part: Part, cycles: number): number {
  return part === "rest" ? cycles + 1 : cycles;
}

/** A length in words: "52 minutes", "1 minute", "20 seconds". */
export function spanText(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} ${seconds === 60 ? "minute" : "minutes"}`;
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

/** The same length before a noun: "17-minute", "20-second". */
export function spanAdjective(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60}-minute` : `${seconds}-second`;
}

/** One line saying what the chosen pattern does. */
export function describePlan(settings: BreakSettings): string {
  const { workMs, restMs } = planFor(settings);
  if (settings.preset === "20-20-20") return "20 minutes of work, then 20 seconds looking at something 20 feet away.";
  return `${spanText(workMs)} of work, then a ${spanAdjective(restMs)} break.`;
}

/** What the face calls the part you're in. */
export function partName(part: Part, settings: BreakSettings): string {
  if (part === "work") return "Work";
  return settings.preset === "20-20-20" ? "Look 20 feet away" : "Break";
}

/** The notification when `part` ends. */
export function partDoneMessage(part: Part, settings: BreakSettings): string {
  if (part === "rest") return "Break over. Back to work.";
  if (settings.preset === "20-20-20") return "Look at something 20 feet away for 20 seconds.";
  return `Time for a ${spanAdjective(planFor(settings).restMs)} break.`;
}

const isPresetId = (value: unknown): value is BreakPresetId => typeof value === "string" && (BREAK_PRESET_IDS as readonly string[]).includes(value);

const minutesIn = (value: unknown, range: { min: number; max: number }): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= range.min && value <= range.max ? value : null;

/** Checks settings read back from local storage. */
export function parseBreakSettings(stored: unknown): BreakSettings | null {
  if (!stored || typeof stored !== "object") return null;
  const s = stored as Record<string, unknown>;
  const work = minutesIn(s.work, WORK_RANGE);
  const rest = minutesIn(s.rest, REST_RANGE);
  if (!isPresetId(s.preset) || work === null || rest === null) return null;
  return { preset: s.preset, work, rest, sound: s.sound !== false };
}
