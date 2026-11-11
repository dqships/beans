/** The Pomodoro timer's rounds: focus, a short break, and a long break every few rounds. */

export type Phase = "focus" | "short" | "long";

export type PomodoroSettings = {
  /** Minutes. */
  focus: number;
  short: number;
  long: number;
  /** A long break comes after this many focus rounds. */
  every: number;
  sound: boolean;
  /** Start the next round without pressing Start. */
  autoStart: boolean;
};

export const DEFAULT_POMODORO: PomodoroSettings = { focus: 25, short: 5, long: 15, every: 4, sound: true, autoStart: false };

export const phaseName: Record<Phase, string> = { focus: "Focus", short: "Short break", long: "Long break" };

export function phaseMinutes(phase: Phase, settings: PomodoroSettings): number {
  return settings[phase];
}

/**
 * The phase after this one ends. `focusDone` counts finished focus rounds,
 * including the one that just ended when `phase` is "focus".
 */
export function nextPhase(phase: Phase, focusDone: number, every: number): Phase {
  if (phase !== "focus") return "focus";
  return focusDone > 0 && focusDone % Math.max(1, every) === 0 ? "long" : "short";
}

/** Which round of the set a focus phase is: 1 to `every`. */
export function roundInSet(focusDone: number, every: number): number {
  return (focusDone % Math.max(1, every)) + 1;
}

const minutes = (value: unknown, min: number, max: number): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;

/** Checks settings read back from local storage. */
export function parsePomodoroSettings(stored: unknown): PomodoroSettings | null {
  if (!stored || typeof stored !== "object") return null;
  const s = stored as Record<string, unknown>;
  const focus = minutes(s.focus, 1, 180);
  const short = minutes(s.short, 1, 60);
  const long = minutes(s.long, 1, 120);
  const every = minutes(s.every, 1, 12);
  if (focus === null || short === null || long === null || every === null) return null;
  return { focus, short, long, every: Math.round(every), sound: s.sound !== false, autoStart: s.autoStart === true };
}
