import { describe, expect, it } from "vitest";
import { MAX_DECIMAL_HOURS, REFERENCE_MINUTES, decimalToTime, referencePairs, referenceRows, timeToDecimal } from "./decimal-hours";

describe("time to decimal hours", () => {
  it("converts hours and minutes", () => {
    expect(timeToDecimal(1, 30)).toEqual({ seconds: 5400, hours: 1.5, minutes: 90 });
    expect(timeToDecimal(0, 15).hours).toBe(0.25);
    expect(timeToDecimal(0, 45).hours).toBe(0.75);
    expect(timeToDecimal(7, 48).hours).toBe(7.8);
    expect(timeToDecimal(8, 0).hours).toBe(8);
  });

  it("rounds to two decimal places", () => {
    expect(timeToDecimal(0, 20).hours).toBe(0.33);
    expect(timeToDecimal(0, 40).hours).toBe(0.67);
    expect(timeToDecimal(0, 1).hours).toBe(0.02);
    expect(timeToDecimal(0, 50).hours).toBe(0.83);
  });

  it("counts seconds, and minutes past 59", () => {
    expect(timeToDecimal(0, 0, 36).hours).toBe(0.01);
    expect(timeToDecimal(0, 90).hours).toBe(1.5);
    expect(timeToDecimal(0, 0, 3600)).toEqual({ seconds: 3600, hours: 1, minutes: 60 });
    expect(timeToDecimal(0, 1, 30).minutes).toBe(1.5);
  });

  it("reads empty, negative and broken values as zero and stops at the limit", () => {
    expect(timeToDecimal(0, 0, 0)).toEqual({ seconds: 0, hours: 0, minutes: 0 });
    expect(timeToDecimal(-2, Number.NaN, -5)).toEqual({ seconds: 0, hours: 0, minutes: 0 });
    expect(timeToDecimal(Number.POSITIVE_INFINITY, 0).hours).toBe(0);
    expect(timeToDecimal(MAX_DECIMAL_HOURS * 2, 0).hours).toBe(MAX_DECIMAL_HOURS);
  });
});

describe("decimal hours to time", () => {
  it("converts back to hours and minutes", () => {
    expect(decimalToTime(1.5)).toEqual({ totalSeconds: 5400, hours: 1, minutes: 30, seconds: 0, totalMinutes: 90 });
    expect(decimalToTime(0.25)).toMatchObject({ hours: 0, minutes: 15, seconds: 0 });
    expect(decimalToTime(7.8)).toMatchObject({ hours: 7, minutes: 48, seconds: 0 });
    expect(decimalToTime(8)).toMatchObject({ hours: 8, minutes: 0, seconds: 0 });
  });

  it("keeps the seconds a rounded decimal leaves behind", () => {
    // 0.33 is a rounded third of an hour, so it comes back 12 seconds short of 20 minutes.
    expect(decimalToTime(0.33)).toMatchObject({ hours: 0, minutes: 19, seconds: 48 });
    expect(decimalToTime(1.26)).toMatchObject({ hours: 1, minutes: 15, seconds: 36 });
    expect(decimalToTime(0.1)).toMatchObject({ hours: 0, minutes: 6, seconds: 0 });
  });

  it("reads zero, negative and broken values as zero and stops at the limit", () => {
    expect(decimalToTime(0)).toEqual({ totalSeconds: 0, hours: 0, minutes: 0, seconds: 0, totalMinutes: 0 });
    expect(decimalToTime(-3).totalSeconds).toBe(0);
    expect(decimalToTime(Number.NaN).totalSeconds).toBe(0);
    expect(decimalToTime(1e12).hours).toBe(MAX_DECIMAL_HOURS);
  });

  it("round-trips every whole minute of an hour to within the rounding", () => {
    for (let minutes = 0; minutes <= 60; minutes++) {
      const back = decimalToTime(timeToDecimal(0, minutes).hours).totalSeconds;
      // Two decimal places of an hour is 36 seconds, so half that is the most it can be off.
      expect(Math.abs(back - minutes * 60)).toBeLessThanOrEqual(18);
    }
  });
});

describe("reference table", () => {
  it("lists the well-known values", () => {
    const table = Object.fromEntries(referenceRows().map((row) => [row.minutes, row.hours]));
    expect(table[6]).toBe("0.10");
    expect(table[15]).toBe("0.25");
    expect(table[20]).toBe("0.33");
    expect(table[30]).toBe("0.50");
    expect(table[45]).toBe("0.75");
    expect(table[60]).toBe("1.00");
  });

  it("has one row per reference minute, split into two columns in order", () => {
    expect(referenceRows()).toHaveLength(REFERENCE_MINUTES.length);
    const pairs = referencePairs();
    const down = [...pairs.map(([left]) => left.minutes), ...pairs.flatMap(([, right]) => (right ? [right.minutes] : []))];
    expect(down).toEqual([...REFERENCE_MINUTES]);
  });
});
