import { describe, expect, it } from "vitest";
import { MAX_LAPS, ZERO_STOPWATCH, addLap, currentLapMs, elapsedMs, formatHundredths, lapRows, startStopwatch, stopStopwatch, stopwatchReading, type StopwatchState } from "./stopwatch";

const T0 = 1_800_000_000_000;

describe("stopwatch time", () => {
  it("reads zero before it starts", () => {
    expect(elapsedMs(ZERO_STOPWATCH, null)).toBe(0);
    expect(elapsedMs(ZERO_STOPWATCH, T0)).toBe(0);
  });

  it("keeps time by the clock, however rarely it's read", () => {
    const running = startStopwatch(ZERO_STOPWATCH, T0);
    expect(elapsedMs(running, T0 + 250)).toBe(250);
    // A background tab that wasn't looked at for ten minutes.
    expect(elapsedMs(running, T0 + 600_000)).toBe(600_000);
  });

  it("banks the time on stop and carries on from it", () => {
    const stopped = stopStopwatch(startStopwatch(ZERO_STOPWATCH, T0), T0 + 5000);
    expect(stopped).toEqual({ bankedMs: 5000, startedAt: null, laps: [] });
    // Time that passes while stopped isn't counted.
    expect(elapsedMs(stopped, T0 + 60_000)).toBe(5000);
    const again = startStopwatch(stopped, T0 + 60_000);
    expect(elapsedMs(again, T0 + 61_500)).toBe(6500);
  });

  it("ignores a second start, and a stop when it isn't running", () => {
    const running = startStopwatch(ZERO_STOPWATCH, T0);
    expect(startStopwatch(running, T0 + 999)).toBe(running);
    expect(stopStopwatch(ZERO_STOPWATCH, T0)).toBe(ZERO_STOPWATCH);
  });

  it("never loses time when the clock jumps back or the last reading is stale", () => {
    const running = startStopwatch({ ...ZERO_STOPWATCH, bankedMs: 3000 }, T0);
    expect(elapsedMs(running, T0 - 5000)).toBe(3000);
    expect(elapsedMs(running, null)).toBe(3000);
  });
});

describe("stopwatch reading", () => {
  it("shows minutes, seconds and hundredths", () => {
    expect(stopwatchReading(0)).toEqual({ main: "00:00", hundredths: "00" });
    expect(formatHundredths(1234)).toBe("00:01.23");
    expect(formatHundredths(59_999)).toBe("00:59.99");
    expect(formatHundredths(754_560)).toBe("12:34.56");
  });

  it("adds hours once past 60 minutes", () => {
    expect(formatHundredths(3_599_990)).toBe("59:59.99");
    expect(formatHundredths(3_600_000)).toBe("1:00:00.00");
    expect(formatHundredths(3_723_450)).toBe("1:02:03.45");
    expect(formatHundredths(36_000_000)).toBe("10:00:00.00");
  });

  it("reads bad values as zero", () => {
    expect(formatHundredths(-5)).toBe("00:00.00");
    expect(formatHundredths(Number.NaN)).toBe("00:00.00");
  });
});

describe("laps", () => {
  const withLaps = (...totals: number[]): StopwatchState => ({ bankedMs: 0, startedAt: T0, laps: totals });

  it("marks a lap with the running total", () => {
    let watch = startStopwatch(ZERO_STOPWATCH, T0);
    watch = addLap(watch, T0 + 10_000);
    watch = addLap(watch, T0 + 25_000);
    expect(watch.laps).toEqual([10_000, 25_000]);
    expect(currentLapMs(watch, T0 + 31_000)).toBe(6000);
  });

  it("carries laps across a stop and start", () => {
    let watch = addLap(startStopwatch(ZERO_STOPWATCH, T0), T0 + 4000);
    watch = startStopwatch(stopStopwatch(watch, T0 + 6000), T0 + 100_000);
    watch = addLap(watch, T0 + 103_000);
    expect(watch.laps).toEqual([4000, 9000]);
  });

  it("doesn't mark a lap while stopped or past the limit", () => {
    expect(addLap(ZERO_STOPWATCH, T0)).toBe(ZERO_STOPWATCH);
    const full = withLaps(...Array.from({ length: MAX_LAPS }, (_, i) => (i + 1) * 1000));
    expect(addLap(full, T0 + 999_000)).toBe(full);
  });

  it("lists laps newest first with each lap's own time", () => {
    expect(lapRows([10_000, 25_000])).toEqual([
      { number: 2, lapMs: 15_000, totalMs: 25_000, mark: null },
      { number: 1, lapMs: 10_000, totalMs: 10_000, mark: null },
    ]);
    expect(lapRows([])).toEqual([]);
  });

  it("marks the fastest and slowest once there are three laps", () => {
    const rows = lapRows([10_000, 25_000, 33_000]);
    expect(rows.map((row) => [row.number, row.mark])).toEqual([
      [3, "fastest"],
      [2, "slowest"],
      [1, null],
    ]);
  });

  it("marks the earliest lap on a tie, and nothing when all laps match", () => {
    const tie = lapRows([5000, 10_000, 18_000, 26_000]);
    expect(tie.find((row) => row.mark === "fastest")?.number).toBe(1);
    expect(tie.find((row) => row.mark === "slowest")?.number).toBe(3);
    expect(lapRows([5000, 10_000, 15_000]).every((row) => row.mark === null)).toBe(true);
  });
});
