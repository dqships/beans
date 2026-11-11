/** The stopwatch: time kept by the clock, and laps. All pure: the component passes in the time. */

export type StopwatchState = {
  /** Time counted before the last stop, in milliseconds. */
  bankedMs: number;
  /** When it was last started, as a timestamp. Null while stopped. */
  startedAt: number | null;
  /** The running total at each lap, oldest first. */
  laps: number[];
};

export const ZERO_STOPWATCH: StopwatchState = { bankedMs: 0, startedAt: null, laps: [] };

export const MAX_LAPS = 200;

/**
 * The time on the stopwatch at `now`. It's the banked time plus the clock time
 * since the last start, so a slowed-down background tab can't make it lose
 * time. A clock that jumps backwards never takes time off.
 */
export function elapsedMs(state: StopwatchState, now: number | null): number {
  if (state.startedAt === null || now === null) return state.bankedMs;
  return state.bankedMs + Math.max(0, now - state.startedAt);
}

export function startStopwatch(state: StopwatchState, now: number): StopwatchState {
  return state.startedAt === null ? { ...state, startedAt: now } : state;
}

export function stopStopwatch(state: StopwatchState, now: number): StopwatchState {
  return state.startedAt === null ? state : { ...state, bankedMs: elapsedMs(state, now), startedAt: null };
}

/** Marks a lap at `now`. Only while running, and only up to `MAX_LAPS`. */
export function addLap(state: StopwatchState, now: number): StopwatchState {
  if (state.startedAt === null || state.laps.length >= MAX_LAPS) return state;
  return { ...state, laps: [...state.laps, elapsedMs(state, now)] };
}

/** The time since the last lap, or since the start when there are none. */
export function currentLapMs(state: StopwatchState, now: number | null): number {
  return Math.max(0, elapsedMs(state, now) - (state.laps.at(-1) ?? 0));
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The reading in two parts: `12:34` and `56` hundredths. Hours join once it
 * passes 60 minutes: `1:02:03`. Hundredths are cut, not rounded, so the
 * reading never runs ahead of the clock.
 */
export function stopwatchReading(ms: number): { main: string; hundredths: string } {
  const safe = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const main = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  return { main, hundredths: pad(Math.floor((safe % 1000) / 10)) };
}

/** The reading as one string: `12:34.56`. */
export function formatHundredths(ms: number): string {
  const { main, hundredths } = stopwatchReading(ms);
  return `${main}.${hundredths}`;
}

export type LapRow = {
  /** 1 for the first lap. */
  number: number;
  /** This lap's own time. */
  lapMs: number;
  /** The running total when the lap was marked. */
  totalMs: number;
  mark: "fastest" | "slowest" | null;
};

/**
 * The laps as rows, newest first. With three or more laps, the quickest and
 * the slowest are marked. When several tie, the earliest one gets the mark,
 * and when every lap took the same time nothing is marked.
 */
export function lapRows(laps: readonly number[]): LapRow[] {
  const rows: LapRow[] = laps.map((totalMs, i) => ({ number: i + 1, lapMs: Math.max(0, totalMs - (laps[i - 1] ?? 0)), totalMs, mark: null }));
  if (rows.length >= 3) {
    const times = rows.map((row) => row.lapMs);
    const fastest = Math.min(...times);
    const slowest = Math.max(...times);
    if (fastest !== slowest) {
      rows[times.indexOf(fastest)]!.mark = "fastest";
      rows[times.indexOf(slowest)]!.mark = "slowest";
    }
  }
  return rows.reverse();
}
