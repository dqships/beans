import { describe, expect, it } from "vitest";
import { BREAK_PRESETS, BREAK_PRESET_IDS, DEFAULT_BREAK, cyclesAfter, describePlan, nextPart, parseBreakSettings, partDoneMessage, partMs, partName, planFor, spanAdjective, spanText, type BreakSettings } from "./break-timer";

const custom = (work: number, rest: number): BreakSettings => ({ preset: "custom", work, rest, sound: true });
const preset = (id: BreakSettings["preset"]): BreakSettings => ({ ...DEFAULT_BREAK, preset: id });

describe("break timer patterns", () => {
  it("has the four ready-made patterns and custom", () => {
    expect(BREAK_PRESET_IDS).toEqual(["52-17", "50-10", "25-5", "20-20-20", "custom"]);
    expect(planFor(preset("52-17"))).toEqual({ workMs: 52 * 60_000, restMs: 17 * 60_000 });
    expect(planFor(preset("50-10"))).toEqual({ workMs: 50 * 60_000, restMs: 10 * 60_000 });
    expect(planFor(preset("25-5"))).toEqual({ workMs: 25 * 60_000, restMs: 5 * 60_000 });
  });

  it("gives 20-20-20 a 20-second break", () => {
    expect(planFor(preset("20-20-20"))).toEqual({ workMs: 20 * 60_000, restMs: 20_000 });
  });

  it("uses the custom lengths only for the custom pattern", () => {
    expect(planFor(custom(90, 15))).toEqual({ workMs: 90 * 60_000, restMs: 15 * 60_000 });
    expect(planFor({ ...custom(90, 15), preset: "25-5" })).toEqual({ workMs: 25 * 60_000, restMs: 5 * 60_000 });
  });

  it("holds custom lengths to their ranges", () => {
    expect(planFor(custom(0, 0))).toEqual({ workMs: 60_000, restMs: 60_000 });
    expect(planFor(custom(999, 999))).toEqual({ workMs: 180 * 60_000, restMs: 60 * 60_000 });
    expect(planFor(custom(Number.NaN, 2.6))).toEqual({ workMs: 60_000, restMs: 3 * 60_000 });
  });

  it("never has a part with no length", () => {
    for (const id of BREAK_PRESET_IDS) {
      expect(partMs("work", preset(id))).toBeGreaterThan(0);
      expect(partMs("rest", preset(id))).toBeGreaterThan(0);
    }
  });
});

describe("break timer cycle", () => {
  it("takes turns between work and break", () => {
    expect(nextPart("work")).toBe("rest");
    expect(nextPart("rest")).toBe("work");
  });

  it("counts a cycle when its break ends", () => {
    expect(cyclesAfter("work", 0)).toBe(0);
    expect(cyclesAfter("rest", 0)).toBe(1);
    expect(cyclesAfter("rest", 4)).toBe(5);
  });
});

describe("break timer wording", () => {
  it("says lengths in words", () => {
    expect(spanText(52 * 60_000)).toBe("52 minutes");
    expect(spanText(60_000)).toBe("1 minute");
    expect(spanText(20_000)).toBe("20 seconds");
    expect(spanText(1000)).toBe("1 second");
    expect(spanAdjective(17 * 60_000)).toBe("17-minute");
    expect(spanAdjective(20_000)).toBe("20-second");
  });

  it("describes each pattern", () => {
    expect(describePlan(preset("52-17"))).toBe("52 minutes of work, then a 17-minute break.");
    expect(describePlan(preset("20-20-20"))).toBe("20 minutes of work, then 20 seconds looking at something 20 feet away.");
    expect(describePlan(custom(1, 1))).toBe("1 minute of work, then a 1-minute break.");
    for (const { id } of BREAK_PRESETS) expect(describePlan(preset(id))).not.toMatch(/NaN|undefined/);
  });

  it("names the part and says what's next when it ends", () => {
    expect(partName("work", preset("25-5"))).toBe("Work");
    expect(partName("rest", preset("25-5"))).toBe("Break");
    expect(partName("rest", preset("20-20-20"))).toBe("Look 20 feet away");
    expect(partDoneMessage("work", preset("52-17"))).toBe("Time for a 17-minute break.");
    expect(partDoneMessage("work", preset("20-20-20"))).toBe("Look at something 20 feet away for 20 seconds.");
    expect(partDoneMessage("rest", preset("52-17"))).toBe("Break over. Back to work.");
  });
});

describe("stored break timer settings", () => {
  it("accepts what it saved", () => {
    expect(parseBreakSettings(JSON.parse(JSON.stringify(DEFAULT_BREAK)))).toEqual(DEFAULT_BREAK);
    expect(parseBreakSettings({ preset: "custom", work: 90, rest: 15, sound: false })).toEqual({ preset: "custom", work: 90, rest: 15, sound: false });
  });

  it("rejects anything else", () => {
    expect(parseBreakSettings(null)).toBeNull();
    expect(parseBreakSettings([])).toBeNull();
    expect(parseBreakSettings({ ...DEFAULT_BREAK, preset: "90-20" })).toBeNull();
    expect(parseBreakSettings({ ...DEFAULT_BREAK, work: 0 })).toBeNull();
    expect(parseBreakSettings({ ...DEFAULT_BREAK, rest: 61 })).toBeNull();
    expect(parseBreakSettings({ ...DEFAULT_BREAK, work: "45" })).toBeNull();
    expect(parseBreakSettings({ ...DEFAULT_BREAK, rest: 2.5 })).toBeNull();
  });
});
