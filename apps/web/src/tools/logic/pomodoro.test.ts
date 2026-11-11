import { describe, expect, it } from "vitest";
import { DEFAULT_POMODORO, nextPhase, parsePomodoroSettings, roundInSet } from "./pomodoro";

describe("pomodoro rounds", () => {
  it("takes a short break after the first three rounds and a long one after the fourth", () => {
    expect(nextPhase("focus", 1, 4)).toBe("short");
    expect(nextPhase("focus", 3, 4)).toBe("short");
    expect(nextPhase("focus", 4, 4)).toBe("long");
    expect(nextPhase("focus", 8, 4)).toBe("long");
  });

  it("goes back to focus after either break", () => {
    expect(nextPhase("short", 1, 4)).toBe("focus");
    expect(nextPhase("long", 4, 4)).toBe("focus");
  });

  it("numbers the round within its set", () => {
    expect(roundInSet(0, 4)).toBe(1);
    expect(roundInSet(3, 4)).toBe(4);
    expect(roundInSet(4, 4)).toBe(1);
  });
});

describe("stored pomodoro settings", () => {
  it("accepts what it saved", () => {
    expect(parsePomodoroSettings(JSON.parse(JSON.stringify(DEFAULT_POMODORO)))).toEqual(DEFAULT_POMODORO);
  });

  it("rejects anything else", () => {
    expect(parsePomodoroSettings(null)).toBeNull();
    expect(parsePomodoroSettings({ focus: 0, short: 5, long: 15, every: 4 })).toBeNull();
    expect(parsePomodoroSettings({ focus: "25", short: 5, long: 15, every: 4 })).toBeNull();
  });
});
