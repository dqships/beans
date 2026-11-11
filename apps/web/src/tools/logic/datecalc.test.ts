import { addDays, weekday } from "@beans/core/dates";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATE_CALC,
  addWeekdays,
  countWeekdays,
  daysBetween,
  daysUntil,
  formatCount,
  formatLongDate,
  isDateKey,
  joinParts,
  parseDateCalc,
  plural,
  shiftDate,
} from "./datecalc";

/** The slow, obvious way to step weekdays, to check the quick one against. */
function stepWeekdays(start: string, count: number): string {
  const direction = count < 0 ? -1 : 1;
  let date = start;
  let left = Math.abs(count);
  while (left > 0) {
    date = addDays(date, direction);
    const day = weekday(date);
    if (day >= 1 && day <= 5) left -= 1;
  }
  return date;
}

describe("date keys", () => {
  it("accepts real dates", () => {
    expect(isDateKey("2026-11-11")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("1600-01-01")).toBe(true);
  });

  it("rejects dates that don't exist and years out of range", () => {
    expect(isDateKey("")).toBe(false);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("0026-01-01")).toBe(false);
    expect(isDateKey("12026-01-01")).toBe(false);
    expect(isDateKey("11/11/2026")).toBe(false);
  });
});

describe("days between two dates", () => {
  it("counts the days, leaving out the end date unless asked", () => {
    // Monday to Friday of one week.
    expect(daysBetween("2026-11-09", "2026-11-13")?.days).toBe(4);
    expect(daysBetween("2026-11-09", "2026-11-13", true)?.days).toBe(5);
    expect(daysBetween("2026-01-01", "2026-12-31")?.days).toBe(364);
    expect(daysBetween("2026-01-01", "2027-01-01")?.days).toBe(365);
  });

  it("is zero for the same day, or one with the end date counted", () => {
    expect(daysBetween("2026-11-11", "2026-11-11")?.days).toBe(0);
    expect(daysBetween("2026-11-11", "2026-11-11")?.weekdays).toBe(0);
    expect(daysBetween("2026-11-11", "2026-11-11", true)?.days).toBe(1);
    expect(daysBetween("2026-11-11", "2026-11-11", true)?.weekdays).toBe(1);
  });

  it("gives the same answer with the dates the other way round", () => {
    const forward = daysBetween("2026-03-01", "2026-11-11");
    const backward = daysBetween("2026-11-11", "2026-03-01");
    expect(backward?.days).toBe(forward?.days);
    expect(backward?.swapped).toBe(true);
    expect(forward?.swapped).toBe(false);
    expect(backward?.from).toBe("2026-03-01");
  });

  it("counts February 29 in a leap year", () => {
    expect(daysBetween("2028-02-01", "2028-03-01")?.days).toBe(29);
    expect(daysBetween("2026-02-01", "2026-03-01")?.days).toBe(28);
    expect(daysBetween("2028-01-01", "2029-01-01")?.days).toBe(366);
  });

  it("splits the span into weeks and days", () => {
    expect(daysBetween("2026-11-01", "2026-11-18")?.weeks).toEqual({ weeks: 2, days: 3 });
    expect(daysBetween("2026-11-01", "2026-11-08")?.weeks).toEqual({ weeks: 1, days: 0 });
  });

  it("splits the span into calendar months and days", () => {
    expect(daysBetween("2026-01-15", "2026-03-20")?.months).toEqual({ months: 2, days: 5 });
    expect(daysBetween("2026-01-15", "2026-03-10")?.months).toEqual({ months: 1, days: 23 });
    expect(daysBetween("2026-01-01", "2027-03-01")?.months).toEqual({ months: 14, days: 0 });
    expect(daysBetween("2026-01-01", "2027-03-04")?.years).toEqual({ years: 1, months: 2, days: 3 });
  });

  it("handles month ends, where the months have different lengths", () => {
    // January 31 plus one month is the last day of February.
    expect(daysBetween("2026-01-31", "2026-02-28")?.months).toEqual({ months: 1, days: 0 });
    expect(daysBetween("2026-01-31", "2026-03-01")?.months).toEqual({ months: 1, days: 1 });
    expect(daysBetween("2026-01-31", "2026-03-31")?.months).toEqual({ months: 2, days: 0 });
    expect(daysBetween("2026-12-31", "2027-01-01")?.months).toEqual({ months: 0, days: 1 });
  });

  it("counts weekdays only", () => {
    // A full week has five.
    expect(daysBetween("2026-11-09", "2026-11-16")?.weekdays).toBe(5);
    // Monday to Friday: four without the end date, five with it.
    expect(daysBetween("2026-11-09", "2026-11-13")?.weekdays).toBe(4);
    expect(daysBetween("2026-11-09", "2026-11-13", true)?.weekdays).toBe(5);
    // Saturday to Monday: nothing in between, then Monday itself.
    expect(daysBetween("2026-11-14", "2026-11-16")?.weekdays).toBe(0);
    expect(daysBetween("2026-11-14", "2026-11-16", true)?.weekdays).toBe(1);
    // 2026 has 261 weekdays.
    expect(daysBetween("2026-01-01", "2027-01-01")?.weekdays).toBe(261);
  });

  it("has no answer for a missing or impossible date", () => {
    expect(daysBetween("", "2026-11-11")).toBeNull();
    expect(daysBetween("2026-11-11", "")).toBeNull();
    expect(daysBetween("2026-02-30", "2026-11-11")).toBeNull();
  });
});

describe("weekdays", () => {
  it("counts none when the end isn't later", () => {
    expect(countWeekdays("2026-11-13", "2026-11-09")).toBe(0);
    expect(countWeekdays("2026-11-13", "2026-11-13")).toBe(0);
  });

  it("matches a day-by-day count from every day of the week", () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const from = addDays("2026-11-08", offset);
      for (let length = 0; length <= 30; length += 1) {
        let slow = 0;
        for (let i = 0; i < length; i += 1) {
          const day = weekday(addDays(from, i));
          if (day >= 1 && day <= 5) slow += 1;
        }
        expect(countWeekdays(from, addDays(from, length))).toBe(slow);
      }
    }
  });

  it("steps forward and back over weekends", () => {
    // Friday plus one weekday is Monday.
    expect(addWeekdays("2026-11-13", 1)).toBe("2026-11-16");
    // Monday minus one weekday is Friday.
    expect(addWeekdays("2026-11-16", -1)).toBe("2026-11-13");
    expect(addWeekdays("2026-11-11", 5)).toBe("2026-11-18");
    expect(addWeekdays("2026-11-11", 10)).toBe("2026-11-25");
    expect(addWeekdays("2026-11-11", 0)).toBe("2026-11-11");
  });

  it("starts counting from the next weekday when the start is a weekend", () => {
    // Saturday plus one weekday is Monday; plus five is Friday.
    expect(addWeekdays("2026-11-14", 1)).toBe("2026-11-16");
    expect(addWeekdays("2026-11-14", 5)).toBe("2026-11-20");
    expect(addWeekdays("2026-11-15", -1)).toBe("2026-11-13");
    expect(addWeekdays("2026-11-15", -5)).toBe("2026-11-09");
    expect(addWeekdays("2026-11-14", 0)).toBe("2026-11-14");
  });

  it("matches a day-by-day walk from every day of the week", () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const start = addDays("2026-11-08", offset);
      for (let count = -23; count <= 23; count += 1) {
        expect(addWeekdays(start, count)).toBe(stepWeekdays(start, count));
      }
    }
  });
});

describe("add or subtract", () => {
  it("adds and subtracts days and weeks", () => {
    expect(shiftDate("2026-11-11", 30, "days")).toBe("2026-12-11");
    expect(shiftDate("2026-11-11", -30, "days")).toBe("2026-10-12");
    expect(shiftDate("2026-12-25", 7, "days")).toBe("2027-01-01");
    expect(shiftDate("2026-11-11", 2, "weeks")).toBe("2026-11-25");
    expect(shiftDate("2026-11-11", -2, "weeks")).toBe("2026-10-28");
    expect(shiftDate("2026-11-11", 0, "days")).toBe("2026-11-11");
  });

  it("lands on the last day when a month is too short", () => {
    expect(shiftDate("2026-01-31", 1, "months")).toBe("2026-02-28");
    expect(shiftDate("2028-01-31", 1, "months")).toBe("2028-02-29");
    expect(shiftDate("2026-03-31", -1, "months")).toBe("2026-02-28");
    expect(shiftDate("2026-10-31", 1, "months")).toBe("2026-11-30");
    expect(shiftDate("2026-11-30", 3, "months")).toBe("2027-02-28");
    expect(shiftDate("2026-01-15", -1, "months")).toBe("2025-12-15");
    expect(shiftDate("2026-11-11", 12, "months")).toBe("2027-11-11");
  });

  it("counts weekdays only when asked", () => {
    expect(shiftDate("2026-11-11", 10, "weekdays")).toBe("2026-11-25");
    expect(shiftDate("2026-11-13", 1, "weekdays")).toBe("2026-11-16");
    expect(shiftDate("2026-11-16", -1, "weekdays")).toBe("2026-11-13");
  });

  it("drops any fraction", () => {
    expect(shiftDate("2026-11-11", 1.9, "days")).toBe("2026-11-12");
  });

  it("has no answer for a bad date, a bad number or a year out of range", () => {
    expect(shiftDate("", 5, "days")).toBeNull();
    expect(shiftDate("2026-02-30", 5, "days")).toBeNull();
    expect(shiftDate("2026-11-11", Number.NaN, "days")).toBeNull();
    expect(shiftDate("2026-11-11", 1_000_000, "days")).toBeNull();
    expect(shiftDate("9999-12-31", 1, "days")).toBeNull();
    expect(shiftDate("9990-01-01", 100_000, "weekdays")).toBeNull();
    expect(shiftDate("1600-01-01", -1, "days")).toBeNull();
    expect(shiftDate("1700-01-01", -100_000, "months")).toBeNull();
    expect(shiftDate("1700-01-01", -100_000, "weeks")).toBeNull();
    expect(shiftDate("2026-11-11", 100_000, "days")).toBe("2300-08-27");
  });
});

describe("days until", () => {
  it("counts forward from today", () => {
    // Wednesday, November 11 to Friday, December 25.
    const until = daysUntil("2026-11-11", "2026-12-25");
    expect(until?.days).toBe(44);
    expect(until?.weeks).toEqual({ weeks: 6, days: 2 });
    expect(until?.weekdays).toBe(32);
  });

  it("is zero today and negative once the date has passed", () => {
    expect(daysUntil("2026-11-11", "2026-11-11")).toEqual({ days: 0, weekdays: 0, weeks: { weeks: 0, days: 0 } });
    const past = daysUntil("2026-11-11", "2026-11-01");
    expect(past?.days).toBe(-10);
    expect(past?.weeks).toEqual({ weeks: 1, days: 3 });
    expect(past?.weekdays).toBe(7);
  });

  it("has no answer without a date", () => {
    expect(daysUntil("2026-11-11", "")).toBeNull();
    expect(daysUntil("", "2026-11-11")).toBeNull();
  });
});

describe("wording", () => {
  it("writes dates out in full", () => {
    expect(formatLongDate("2026-11-11")).toBe("Wednesday, November 11, 2026");
    expect(formatLongDate("2028-02-29")).toBe("Tuesday, February 29, 2028");
    expect(formatLongDate("2027-01-01")).toBe("Friday, January 1, 2027");
  });

  it("groups thousands and handles one and many", () => {
    expect(formatCount(12345)).toBe("12,345");
    expect(formatCount(Number.NaN)).toBe("0");
    expect(plural(1, "day")).toBe("1 day");
    expect(plural(0, "day")).toBe("0 days");
    expect(plural(1200, "day")).toBe("1,200 days");
  });

  it("joins the parts that aren't zero", () => {
    expect(joinParts(["2 weeks", "3 days"])).toBe("2 weeks and 3 days");
    expect(joinParts(["0 weeks", "3 days"])).toBe("3 days");
    expect(joinParts(["2 weeks", "0 days"])).toBe("2 weeks");
    expect(joinParts(["1 year", "2 months", "3 days"])).toBe("1 year, 2 months and 3 days");
    expect(joinParts(["0 weeks", "0 days"])).toBe("0 days");
  });
});

describe("stored date calculator", () => {
  it("accepts what it saved", () => {
    expect(parseDateCalc(JSON.parse(JSON.stringify(DEFAULT_DATE_CALC)))).toEqual(DEFAULT_DATE_CALC);
    const filled = { ...DEFAULT_DATE_CALC, mode: "add" as const, start: "2026-11-11", direction: "subtract" as const, amount: 10, unit: "weekdays" as const };
    expect(parseDateCalc(JSON.parse(JSON.stringify(filled)))).toEqual(filled);
  });

  it("rejects anything else", () => {
    expect(parseDateCalc(null)).toBeNull();
    expect(parseDateCalc({ ...DEFAULT_DATE_CALC, mode: "since" })).toBeNull();
    expect(parseDateCalc({ ...DEFAULT_DATE_CALC, from: "2026-02-30" })).toBeNull();
    expect(parseDateCalc({ ...DEFAULT_DATE_CALC, amount: -5 })).toBeNull();
    expect(parseDateCalc({ ...DEFAULT_DATE_CALC, amount: 2.5 })).toBeNull();
    expect(parseDateCalc({ ...DEFAULT_DATE_CALC, unit: "years" })).toBeNull();
    expect(parseDateCalc({ ...DEFAULT_DATE_CALC, includeEnd: "yes" })).toBeNull();
  });
});
