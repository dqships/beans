import { describe, expect, it } from "vitest";
import { MINUS, clock12, clock24, decimalHours, decimalMinutes, decimalNumber, decimalOnly, digitsOnly, fixed, formatHms, parseClock, plural, spanShort, spanWords, splitSeconds, toSeconds, trimmed, wholeNumber } from "./hms";

describe("reading what was typed", () => {
  it("keeps digits only in a whole-number field", () => {
    expect(digitsOnly("12a3")).toBe("123");
    expect(digitsOnly("-5")).toBe("5");
    expect(digitsOnly("1234567")).toBe("12345");
    expect(digitsOnly("")).toBe("");
  });

  it("keeps digits and one point in a decimal field", () => {
    expect(decimalOnly("1.5")).toBe("1.5");
    expect(decimalOnly("1,5")).toBe("1.5");
    expect(decimalOnly("1.2.3")).toBe("1.23");
    expect(decimalOnly("-2.5h")).toBe("2.5");
    expect(decimalOnly(".25")).toBe(".25");
  });

  it("reads blank and broken fields as zero", () => {
    expect(wholeNumber("")).toBe(0);
    expect(wholeNumber("abc")).toBe(0);
    expect(wholeNumber("045")).toBe(45);
    expect(decimalNumber("")).toBe(0);
    expect(decimalNumber(".")).toBe(0);
    expect(decimalNumber("1,75")).toBe(1.75);
    expect(decimalNumber(".5")).toBe(0.5);
  });
});

describe("splitting and formatting seconds", () => {
  it("splits seconds into hours, minutes and seconds", () => {
    expect(splitSeconds(toSeconds(1, 30, 15))).toEqual({ negative: false, hours: 1, minutes: 30, seconds: 15 });
    expect(splitSeconds(-90)).toEqual({ negative: true, hours: 0, minutes: 1, seconds: 30 });
    expect(splitSeconds(Number.NaN)).toEqual({ negative: false, hours: 0, minutes: 0, seconds: 0 });
  });

  it("writes h:mm:ss, with a minus sign when negative", () => {
    expect(formatHms(5400)).toBe("1:30:00");
    expect(formatHms(0)).toBe("0:00:00");
    expect(formatHms(-61)).toBe(`${MINUS}0:01:01`);
    expect(formatHms(100 * 3600 + 59)).toBe("100:00:59");
  });

  it("turns seconds into decimal hours and minutes at two places", () => {
    expect(decimalHours(5400)).toBe(1.5);
    expect(decimalHours(15 * 60)).toBe(0.25);
    expect(decimalHours(20 * 60)).toBe(0.33);
    expect(decimalHours(40 * 60)).toBe(0.67);
    expect(decimalHours(18)).toBe(0.01);
    expect(decimalHours(-5400)).toBe(-1.5);
    expect(Object.is(decimalHours(-1), 0)).toBe(true);
    expect(decimalMinutes(90)).toBe(1.5);
    expect(decimalMinutes(100)).toBe(1.67);
    expect(decimalMinutes(-30)).toBe(-0.5);
  });

  it("formats numbers without a stray minus zero", () => {
    expect(fixed(1.5)).toBe("1.50");
    expect(fixed(-1.5)).toBe(`${MINUS}1.50`);
    expect(fixed(-0.001)).toBe("0.00");
    expect(fixed(Number.NaN)).toBe("0.00");
    expect(fixed(8)).toBe("8.00");
    expect(fixed(81694.43)).toBe("81,694.43");
    expect(fixed(-1515.25)).toBe(`${MINUS}1,515.25`);
    expect(trimmed(90)).toBe("90");
    expect(trimmed(90.5)).toBe("90.5");
    expect(trimmed(-90.25)).toBe(`${MINUS}90.25`);
    expect(trimmed(3075)).toBe("3,075");
    expect(trimmed(Number.POSITIVE_INFINITY)).toBe("0");
  });

  it("puts a length of time into words", () => {
    expect(plural(1, "hour")).toBe("1 hour");
    expect(plural(2, "hour")).toBe("2 hours");
    expect(spanWords(5400)).toBe("1 hour 30 minutes");
    expect(spanWords(3600)).toBe("1 hour");
    expect(spanWords(61)).toBe("1 minute 1 second");
    expect(spanWords(0)).toBe("0 minutes");
    expect(spanWords(-5400)).toBe("1 hour 30 minutes");
    expect(spanWords(51 * 3600 + 15 * 60, { days: true })).toBe("2 days 3 hours 15 minutes");
    expect(spanWords(86400, { days: true })).toBe("1 day");
    expect(spanWords(86400)).toBe("24 hours");
  });

  it("puts a length of time into short units", () => {
    expect(spanShort(5400)).toBe("1 h 30 min");
    expect(spanShort(4536)).toBe("1 h 15 min 36 s");
    expect(spanShort(45)).toBe("45 s");
    expect(spanShort(3600)).toBe("1 h");
    expect(spanShort(0)).toBe("0 min");
    expect(spanShort(-90)).toBe("1 min 30 s");
    expect(spanShort(99_999 * 3600 + 59 * 60 + 59)).toBe("99,999 h 59 min 59 s");
  });
});

describe("clock times", () => {
  it("reads a time input", () => {
    expect(parseClock("00:00")).toBe(0);
    expect(parseClock("09:30")).toBe(570);
    expect(parseClock("23:59")).toBe(1439);
    expect(parseClock("09:30:15")).toBe(570);
    expect(parseClock("")).toBeNull();
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("9:30")).toBeNull();
    expect(parseClock("12:60")).toBeNull();
  });

  it("writes 12-hour and 24-hour times", () => {
    expect(clock12(0)).toBe("12:00 AM");
    expect(clock12(12 * 60)).toBe("12:00 PM");
    expect(clock12(17 * 60 + 30)).toBe("5:30 PM");
    expect(clock12(1440 + 75)).toBe("1:15 AM");
    expect(clock12(-30)).toBe("11:30 PM");
    expect(clock24(17 * 60 + 5)).toBe("17:05");
    expect(clock24(0)).toBe("00:00");
  });
});
