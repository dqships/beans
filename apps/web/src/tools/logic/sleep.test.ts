import { describe, expect, it } from "vitest";
import { DEFAULT_SLEEP, bedtimesFor, formatSleepHours, formatSleepTime, parseSleepSettings, parseTime, wakeTimesFor } from "./sleep";

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

describe("bedtimes for a wake-up time", () => {
  it("counts back 6, 5, 4 and 3 cycles of 90 minutes, plus the time to fall asleep", () => {
    const options = bedtimesFor(at(7), 15);
    expect(options.map((option) => option.cycles)).toEqual([6, 5, 4, 3]);
    // 7:00 less 9 hours and 15 minutes is 21:45 the evening before, and so on.
    expect(options.map((option) => option.minutes)).toEqual([at(21, 45), at(23, 15), at(0, 45), at(2, 15)]);
    expect(options.map((option) => option.asleep)).toEqual([540, 450, 360, 270]);
  });

  it("knows which bedtimes fall on the evening before", () => {
    expect(bedtimesFor(at(7), 15).map((option) => option.shift)).toEqual([-1, -1, 0, 0]);
    // A wake-up in the afternoon keeps every bedtime on the same day.
    expect(bedtimesFor(at(18), 15).map((option) => option.shift)).toEqual([0, 0, 0, 0]);
    expect(bedtimesFor(at(0), 0).map((option) => option.shift)).toEqual([-1, -1, -1, -1]);
  });

  it("marks 5 and 6 cycles as the 7.5 to 9 hour range", () => {
    expect(bedtimesFor(at(7)).map((option) => option.inRange)).toEqual([true, true, false, false]);
  });

  it("uses 15 minutes to fall asleep unless told otherwise", () => {
    expect(bedtimesFor(at(7))).toEqual(bedtimesFor(at(7), 15));
    expect(bedtimesFor(at(7), 0).map((option) => option.minutes)).toEqual([at(22), at(23, 30), at(1), at(2, 30)]);
    expect(bedtimesFor(at(7), 30)[0]?.minutes).toBe(at(21, 30));
  });

  it("holds a bad fall-asleep time inside its limits", () => {
    expect(bedtimesFor(at(7), Number.NaN)).toEqual(bedtimesFor(at(7), 15));
    expect(bedtimesFor(at(7), -20)).toEqual(bedtimesFor(at(7), 0));
    expect(bedtimesFor(at(7), 999)).toEqual(bedtimesFor(at(7), 120));
  });
});

describe("wake-up times for a bedtime", () => {
  it("counts forward from when you fall asleep", () => {
    const options = wakeTimesFor(at(23), 15);
    // 23:00 plus 15 minutes plus 9 hours is 8:15 the next morning.
    expect(options.map((option) => option.minutes)).toEqual([at(8, 15), at(6, 45), at(5, 15), at(3, 45)]);
    expect(options.map((option) => option.shift)).toEqual([1, 1, 1, 1]);
    expect(options.map((option) => option.inRange)).toEqual([true, true, false, false]);
  });

  it("stays on the same day for a nap-length night started early", () => {
    expect(wakeTimesFor(at(1), 15).map((option) => option.shift)).toEqual([0, 0, 0, 0]);
    expect(wakeTimesFor(at(19), 15).map((option) => option.shift)).toEqual([1, 1, 1, 0]);
  });

  it("is the mirror of the bedtime sum", () => {
    for (const bed of [at(21, 45), at(23, 15), at(0, 45), at(2, 15)]) {
      const cycles = bedtimesFor(at(7), 15).find((option) => option.minutes === bed)?.cycles;
      const wake = wakeTimesFor(bed, 15).find((option) => option.cycles === cycles);
      expect(wake?.minutes).toBe(at(7));
    }
  });
});

describe("formats", () => {
  it("reads a time of day", () => {
    expect(parseTime("07:00")).toBe(420);
    expect(parseTime("23:59")).toBe(1439);
    expect(parseTime("07:00:30")).toBe(420);
    expect(parseTime("")).toBeNull();
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("7am")).toBeNull();
  });

  it("writes hours of sleep", () => {
    expect(formatSleepHours(540)).toBe("9 hours");
    expect(formatSleepHours(450)).toBe("7.5 hours");
    expect(formatSleepHours(270)).toBe("4.5 hours");
    expect(formatSleepHours(60)).toBe("1 hour");
  });

  it("writes times on either clock", () => {
    expect(formatSleepTime(at(21, 45), "12h")).toBe("9:45 pm");
    expect(formatSleepTime(at(0, 45), "12h")).toBe("12:45 am");
    expect(formatSleepTime(at(12), "12h")).toBe("12:00 pm");
    expect(formatSleepTime(at(21, 45), "24h")).toBe("21:45");
    expect(formatSleepTime(at(0, 45), "24h")).toBe("00:45");
    expect(formatSleepTime(-15, "24h")).toBe("23:45");
  });
});

describe("stored sleep settings", () => {
  it("accepts what it saved", () => {
    expect(parseSleepSettings(JSON.parse(JSON.stringify(DEFAULT_SLEEP)))).toEqual(DEFAULT_SLEEP);
    const changed = { mode: "now", wake: "", bed: "22:30", fallAsleep: 0, format: "24h" };
    expect(parseSleepSettings(changed)).toEqual(changed);
  });

  it("rejects anything else", () => {
    expect(parseSleepSettings(null)).toBeNull();
    expect(parseSleepSettings({ ...DEFAULT_SLEEP, mode: "nap" })).toBeNull();
    expect(parseSleepSettings({ ...DEFAULT_SLEEP, wake: "7am" })).toBeNull();
    expect(parseSleepSettings({ ...DEFAULT_SLEEP, fallAsleep: 500 })).toBeNull();
    expect(parseSleepSettings({ ...DEFAULT_SLEEP, fallAsleep: 7.5 })).toBeNull();
    expect(parseSleepSettings({ ...DEFAULT_SLEEP, format: "am" })).toBeNull();
  });
});
