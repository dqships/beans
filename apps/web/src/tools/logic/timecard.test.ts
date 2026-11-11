import { describe, expect, it } from "vitest";
import {
  EMPTY_CARD,
  breakSwallowsShift,
  clearShifts,
  copyMondayToWeekdays,
  decimalHours,
  formatHoursMinutes,
  formatMoney,
  hasAnyTime,
  isOvernight,
  parseClock,
  parseTimeCard,
  setShift,
  shiftMinutes,
  weekTotals,
  type TimeCard,
} from "./timecard";

const shift = (start: string, end: string, breakMin = 0) => ({ start, end, breakMin });

/** A card with the same shift on the first `count` days. */
const cardWith = (count: number, start: string, end: string, breakMin = 0, extra: Partial<TimeCard> = {}): TimeCard => ({
  ...EMPTY_CARD,
  days: EMPTY_CARD.days.map((day, i) => (i < count ? shift(start, end, breakMin) : day)),
  ...extra,
});

describe("clock times", () => {
  it("reads HH:MM, with or without seconds", () => {
    expect(parseClock("09:00")).toBe(540);
    expect(parseClock("9:05")).toBe(545);
    expect(parseClock("23:59")).toBe(1439);
    expect(parseClock("17:30:00")).toBe(1050);
  });

  it("rejects anything that isn't a time of day", () => {
    expect(parseClock("")).toBeNull();
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("12:60")).toBeNull();
    expect(parseClock("noon")).toBeNull();
  });
});

describe("one shift", () => {
  it("is clock out minus clock in, less the break", () => {
    expect(shiftMinutes(shift("09:00", "17:00"))).toBe(480);
    expect(shiftMinutes(shift("09:00", "17:30", 30))).toBe(480);
    expect(shiftMinutes(shift("08:15", "12:00", 15))).toBe(210);
  });

  it("runs past midnight when the out time is earlier than the in time", () => {
    expect(shiftMinutes(shift("22:00", "06:00"))).toBe(480);
    expect(shiftMinutes(shift("22:00", "06:00", 30))).toBe(450);
    expect(isOvernight(shift("22:00", "06:00"))).toBe(true);
    expect(isOvernight(shift("09:00", "17:00"))).toBe(false);
  });

  it("has no hours until both times are filled in", () => {
    expect(shiftMinutes(shift("", ""))).toBeNull();
    expect(shiftMinutes(shift("09:00", ""))).toBeNull();
    expect(shiftMinutes(shift("", "17:00"))).toBeNull();
  });

  it("counts the same time twice as no shift, not a full day", () => {
    expect(shiftMinutes(shift("09:00", "09:00"))).toBe(0);
  });

  it("never goes below zero when the break is longer than the shift", () => {
    expect(shiftMinutes(shift("09:00", "09:30", 60))).toBe(0);
    expect(breakSwallowsShift(shift("09:00", "09:30", 60))).toBe(true);
    expect(breakSwallowsShift(shift("09:00", "17:00", 60))).toBe(false);
    expect(breakSwallowsShift(shift("", "", 60))).toBe(false);
  });

  it("treats a bad break as no break", () => {
    expect(shiftMinutes(shift("09:00", "17:00", Number.NaN))).toBe(480);
    expect(shiftMinutes(shift("09:00", "17:00", -30))).toBe(480);
  });
});

describe("the week", () => {
  it("adds up the days and skips the empty ones", () => {
    const totals = weekTotals(cardWith(5, "09:00", "17:30", 30));
    expect(totals.dayMinutes).toEqual([480, 480, 480, 480, 480, null, null]);
    expect(totals.totalMinutes).toBe(2400);
    expect(totals.overtimeMinutes).toBe(0);
    expect(totals.grossPay).toBe(0);
  });

  it("is all zeros for an empty card", () => {
    const totals = weekTotals(EMPTY_CARD);
    expect(totals.totalMinutes).toBe(0);
    expect(totals.regularPay).toBe(0);
    expect(totals.grossPay).toBe(0);
  });

  it("works out gross pay from the rate", () => {
    const totals = weekTotals(cardWith(5, "09:00", "16:45", 0, { rate: 18.5 }));
    // 5 days of 7 hours 45 minutes is 38.75 hours.
    expect(totals.totalMinutes).toBe(2325);
    expect(totals.grossPay).toBe(716.88);
  });

  it("pays hours past 40 at 1.5 times only when overtime is on", () => {
    const long = cardWith(5, "08:00", "17:30", 0, { rate: 20 });
    const flat = weekTotals(long);
    expect(flat.totalMinutes).toBe(2850);
    expect(flat.overtimeMinutes).toBe(0);
    expect(flat.grossPay).toBe(950);

    const split = weekTotals({ ...long, overtime: true });
    expect(split.regularMinutes).toBe(2400);
    expect(split.overtimeMinutes).toBe(450);
    expect(split.regularPay).toBe(800);
    expect(split.overtimePay).toBe(225);
    expect(split.grossPay).toBe(1025);
  });

  it("has no overtime at exactly 40 hours", () => {
    const totals = weekTotals(cardWith(5, "09:00", "17:00", 0, { rate: 10, overtime: true }));
    expect(totals.overtimeMinutes).toBe(0);
    expect(totals.grossPay).toBe(400);
  });

  it("keeps the pay lines adding up to the total", () => {
    const totals = weekTotals(cardWith(6, "07:10", "15:27", 0, { rate: 17.33, overtime: true }));
    expect(totals.grossPay).toBeCloseTo(totals.regularPay + totals.overtimePay, 10);
  });

  it("ignores a rate that isn't a number", () => {
    expect(weekTotals(cardWith(1, "09:00", "17:00", 0, { rate: Number.NaN })).grossPay).toBe(0);
    expect(weekTotals(cardWith(1, "09:00", "17:00", 0, { rate: -5 })).grossPay).toBe(0);
  });
});

describe("formats", () => {
  it("shows hours and minutes, and decimal hours", () => {
    expect(formatHoursMinutes(0)).toBe("0h 00m");
    expect(formatHoursMinutes(485)).toBe("8h 05m");
    expect(formatHoursMinutes(2325)).toBe("38h 45m");
    expect(decimalHours(2325)).toBe("38.75");
    expect(decimalHours(450)).toBe("7.50");
    expect(decimalHours(0)).toBe("0.00");
  });

  it("shows pay as a plain number with two decimals", () => {
    expect(formatMoney(0)).toBe("0.00");
    expect(formatMoney(716.88)).toBe("716.88");
    expect(formatMoney(1234.5)).toBe("1,234.50");
    expect(formatMoney(Number.NaN)).toBe("0.00");
  });
});

describe("changing the card", () => {
  it("changes one day", () => {
    const card = setShift(EMPTY_CARD, 2, { start: "10:00" });
    expect(card.days[2]).toEqual(shift("10:00", ""));
    expect(card.days[1]).toEqual(shift("", ""));
    expect(setShift(EMPTY_CARD, 0, { breakMin: 9999 }).days[0]?.breakMin).toBe(600);
  });

  it("copies Monday to Tuesday through Friday and leaves the weekend", () => {
    const start = setShift(setShift(EMPTY_CARD, 0, shift("09:00", "17:00", 30)), 5, shift("10:00", "14:00"));
    const card = copyMondayToWeekdays(start);
    expect(card.days.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => shift("09:00", "17:00", 30)));
    expect(card.days[5]).toEqual(shift("10:00", "14:00"));
    expect(card.days[6]).toEqual(shift("", ""));
  });

  it("clears the times but keeps the name and the rate", () => {
    const card = clearShifts(cardWith(5, "09:00", "17:00", 30, { name: "Sam", rate: 20, overtime: true, week: "2026-11-09" }));
    expect(hasAnyTime(card)).toBe(false);
    expect(card.name).toBe("Sam");
    expect(card.rate).toBe(20);
    expect(card.overtime).toBe(true);
    expect(card.week).toBe("");
  });
});

describe("stored time card", () => {
  it("accepts what it saved", () => {
    const card = cardWith(5, "22:00", "06:00", 30, { name: "Sam", week: "2026-11-09", rate: 18.5, overtime: true });
    expect(parseTimeCard(JSON.parse(JSON.stringify(card)))).toEqual(card);
    expect(parseTimeCard(JSON.parse(JSON.stringify(EMPTY_CARD)))).toEqual(EMPTY_CARD);
  });

  it("rejects anything else", () => {
    expect(parseTimeCard(null)).toBeNull();
    expect(parseTimeCard("card")).toBeNull();
    expect(parseTimeCard({ ...EMPTY_CARD, days: EMPTY_CARD.days.slice(0, 6) })).toBeNull();
    expect(parseTimeCard({ ...EMPTY_CARD, rate: "20" })).toBeNull();
    expect(parseTimeCard({ ...EMPTY_CARD, rate: -1 })).toBeNull();
    expect(parseTimeCard({ ...EMPTY_CARD, week: "next week" })).toBeNull();
    expect(parseTimeCard({ ...EMPTY_CARD, days: EMPTY_CARD.days.map(() => shift("25:00", "")) })).toBeNull();
    expect(parseTimeCard({ ...EMPTY_CARD, days: EMPTY_CARD.days.map(() => ({ start: "", end: "", breakMin: "30" })) })).toBeNull();
  });
});
