import { describe, expect, it } from "vitest";
import { COUNTDOWN_PRESETS, DEFAULT_COUNTDOWN, MAX_COUNTDOWN_SECONDS, ceilToSecond, describeLength, joinLength, parseCountdownSettings, splitLength } from "./countdown";

describe("countdown length", () => {
  it("splits a length into the three fields and joins it back", () => {
    expect(splitLength(600)).toEqual({ hours: 0, minutes: 10, seconds: 0 });
    expect(splitLength(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
    expect(joinLength({ hours: 1, minutes: 1, seconds: 1 })).toBe(3661);
    for (const minutes of COUNTDOWN_PRESETS) expect(joinLength(splitLength(minutes * 60))).toBe(minutes * 60);
  });

  it("holds each field to its range", () => {
    expect(joinLength({ hours: 0, minutes: 75, seconds: 0 })).toBe(59 * 60);
    expect(joinLength({ hours: 500, minutes: 59, seconds: 59 })).toBe(MAX_COUNTDOWN_SECONDS);
    expect(joinLength({ hours: -1, minutes: -5, seconds: Number.NaN })).toBe(0);
    expect(joinLength({ hours: 0, minutes: 1.4, seconds: 0 })).toBe(60);
    expect(splitLength(-10)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(splitLength(Number.POSITIVE_INFINITY)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });

  it("rounds the time left up, so zero shows only at the end", () => {
    expect(ceilToSecond(600_000)).toBe(600_000);
    expect(ceilToSecond(599_999)).toBe(600_000);
    expect(ceilToSecond(1)).toBe(1000);
    expect(ceilToSecond(0)).toBe(0);
    expect(ceilToSecond(-50)).toBe(0);
  });

  it("says the length in words", () => {
    expect(describeLength(600)).toBe("10 minutes");
    expect(describeLength(60)).toBe("1 minute");
    expect(describeLength(5400)).toBe("1 hour 30 minutes");
    expect(describeLength(45)).toBe("45 seconds");
  });
});

describe("stored countdown settings", () => {
  it("accepts what it saved", () => {
    expect(parseCountdownSettings(JSON.parse(JSON.stringify(DEFAULT_COUNTDOWN)))).toEqual(DEFAULT_COUNTDOWN);
    expect(parseCountdownSettings({ seconds: 0, sound: false })).toEqual({ seconds: 0, sound: false });
  });

  it("rejects anything else", () => {
    expect(parseCountdownSettings(null)).toBeNull();
    expect(parseCountdownSettings("600")).toBeNull();
    expect(parseCountdownSettings({ seconds: "600" })).toBeNull();
    expect(parseCountdownSettings({ seconds: -1 })).toBeNull();
    expect(parseCountdownSettings({ seconds: 1.5 })).toBeNull();
    expect(parseCountdownSettings({ seconds: MAX_COUNTDOWN_SECONDS + 1 })).toBeNull();
  });
});
