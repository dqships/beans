import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, parseDuration, formatStopwatch } from "./duration";

describe("durations", () => {
  it.each([
    ["45", 45],
    ["45m", 45],
    ["1h", 60],
    ["1h 30m", 90],
    ["1h30m", 90],
    ["1.5h", 90],
    ["1:30", 90],
    ["90 min", 90],
    ["2 hours", 120],
  ])("parses %s", (input, minutes) => {
    expect(parseDuration(input)).toBe(minutes);
  });
  it("rejects text that isn't a duration", () => {
    expect(parseDuration("soon")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("1h banana")).toBeNull();
  });
  it("formats", () => {
    expect(formatClock(45)).toBe("0:45");
    expect(formatClock(90)).toBe("1:30");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(5)).toBe("5m");
    expect(formatStopwatch(65_000)).toBe("01:05");
    expect(formatStopwatch(3_725_000)).toBe("1:02:05");
  });
});
