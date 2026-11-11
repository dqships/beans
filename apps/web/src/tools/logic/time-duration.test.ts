import { describe, expect, it } from "vitest";
import { INITIAL_DURATION, TODAY, betweenDates, betweenTimes, dayNumber, momentLabel, parseDurationState, rangeLabel, resolveDate, swapDates } from "./time-duration";

describe("between two times", () => {
  it("measures a span on one day", () => {
    expect(betweenTimes("09:00", "17:00")).toEqual({ grossMinutes: 480, breakMinutes: 0, minutes: 480, overnight: false, breakTooLong: false });
    expect(betweenTimes("08:45", "12:10")?.minutes).toBe(205);
    expect(betweenTimes("00:00", "23:59")?.minutes).toBe(1439);
  });

  it("reads an earlier end as the next day", () => {
    expect(betweenTimes("22:00", "06:00")).toMatchObject({ minutes: 480, overnight: true });
    expect(betweenTimes("23:59", "00:00")).toMatchObject({ minutes: 1, overnight: true });
    expect(betweenTimes("12:00", "11:59")).toMatchObject({ minutes: 1439, overnight: true });
  });

  it("counts the same time twice as nothing", () => {
    expect(betweenTimes("09:00", "09:00")).toMatchObject({ minutes: 0, overnight: false });
  });

  it("takes the break off", () => {
    expect(betweenTimes("09:00", "17:30", "30")).toMatchObject({ grossMinutes: 510, breakMinutes: 30, minutes: 480, breakTooLong: false });
    expect(betweenTimes("22:00", "06:00", "45")).toMatchObject({ minutes: 435, overnight: true });
    expect(betweenTimes("09:00", "17:00", "")).toMatchObject({ breakMinutes: 0, minutes: 480 });
    expect(betweenTimes("09:00", "17:00", "0")).toMatchObject({ breakMinutes: 0, minutes: 480 });
  });

  it("never goes below zero when the break is longer than the span", () => {
    expect(betweenTimes("09:00", "10:00", "90")).toEqual({ grossMinutes: 60, breakMinutes: 60, minutes: 0, overnight: false, breakTooLong: true });
    expect(betweenTimes("09:00", "10:00", "60")).toMatchObject({ minutes: 0, breakTooLong: false });
  });

  it("has no answer until both times are in", () => {
    expect(betweenTimes("", "17:00")).toBeNull();
    expect(betweenTimes("09:00", "")).toBeNull();
    expect(betweenTimes("9am", "5pm")).toBeNull();
  });
});

describe("dates as day counts", () => {
  it("reads real dates", () => {
    expect(dayNumber("1970-01-01")).toBe(0);
    expect(dayNumber("1970-01-02")).toBe(1);
    expect(dayNumber("2028-02-29")).not.toBeNull();
    expect(dayNumber("0001-01-01")).not.toBeNull();
    expect(dayNumber("0099-12-31")! - dayNumber("0099-12-30")!).toBe(1);
  });

  it("rejects blanks and dates that don't exist", () => {
    expect(dayNumber("")).toBeNull();
    expect(dayNumber("2026-02-30")).toBeNull();
    expect(dayNumber("2026-02-29")).toBeNull();
    expect(dayNumber("2026-13-01")).toBeNull();
    expect(dayNumber("2026-00-10")).toBeNull();
    expect(dayNumber("2026-1-5")).toBeNull();
    expect(dayNumber("12026-01-05")).toBeNull();
    expect(dayNumber("today")).toBeNull();
  });
});

describe("between two dates", () => {
  it("measures days, hours and minutes", () => {
    expect(betweenDates("2026-11-11", "09:00", "2026-11-13", "12:15")).toEqual({ minutes: 2 * 1440 + 195, backwards: false });
    expect(betweenDates("2026-11-11", "09:00", "2026-11-11", "17:00")).toEqual({ minutes: 480, backwards: false });
    expect(betweenDates("2026-11-11", "09:00", "2026-11-11", "09:00")).toEqual({ minutes: 0, backwards: false });
  });

  it("handles an end time earlier in the day than the start time", () => {
    expect(betweenDates("2026-11-11", "22:00", "2026-11-12", "06:00")).toEqual({ minutes: 480, backwards: false });
  });

  it("crosses month ends and leap days", () => {
    expect(betweenDates("2026-01-31", "00:00", "2026-03-01", "00:00")?.minutes).toBe(29 * 1440);
    expect(betweenDates("2028-01-31", "00:00", "2028-03-01", "00:00")?.minutes).toBe(30 * 1440);
    expect(betweenDates("2026-12-31", "23:00", "2027-01-01", "01:00")?.minutes).toBe(120);
    expect(betweenDates("2026-01-01", "00:00", "2027-01-01", "00:00")?.minutes).toBe(365 * 1440);
    expect(betweenDates("2028-01-01", "00:00", "2029-01-01", "00:00")?.minutes).toBe(366 * 1440);
  });

  it("counts every day as 24 hours, on the days clocks change too", () => {
    // Clocks go forward on 8 March 2026 and back on 1 November 2026 in the United States.
    expect(betweenDates("2026-03-08", "00:00", "2026-03-09", "00:00")?.minutes).toBe(1440);
    expect(betweenDates("2026-11-01", "00:00", "2026-11-02", "00:00")?.minutes).toBe(1440);
    // And on 29 March 2026 in Europe.
    expect(betweenDates("2026-03-28", "12:00", "2026-03-30", "12:00")?.minutes).toBe(2880);
  });

  it("says when the end is before the start, and still gives the gap", () => {
    expect(betweenDates("2026-11-13", "12:15", "2026-11-11", "09:00")).toEqual({ minutes: 2 * 1440 + 195, backwards: true });
    expect(betweenDates("2026-11-11", "17:00", "2026-11-11", "09:00")).toEqual({ minutes: 480, backwards: true });
  });

  it("has no answer until both dates and times are real", () => {
    expect(betweenDates("", "09:00", "2026-11-13", "12:15")).toBeNull();
    expect(betweenDates("2026-11-11", "", "2026-11-13", "12:15")).toBeNull();
    expect(betweenDates("2026-11-11", "09:00", "2026-02-30", "12:15")).toBeNull();
    expect(betweenDates("2026-11-11", "09:00", "2026-11-13", "")).toBeNull();
  });
});

describe("naming a date and time", () => {
  it("gets the weekday right", () => {
    expect(momentLabel("1970-01-01", "00:00")).toBe("Thu, Jan 1, 12:00 AM");
    expect(momentLabel("2000-01-01", "12:00")).toBe("Sat, Jan 1, 12:00 PM");
    expect(momentLabel("2026-11-11", "09:00")).toBe("Wed, Nov 11, 9:00 AM");
    expect(momentLabel("2028-02-29", "17:30")).toBe("Tue, Feb 29, 5:30 PM");
    expect(momentLabel("1969-12-31", "23:59")).toBe("Wed, Dec 31, 11:59 PM");
  });

  it("adds the year when asked, and is empty for a date that isn't real", () => {
    expect(momentLabel("2026-12-31", "23:00", true)).toBe("Thu, Dec 31 2026, 11:00 PM");
    expect(momentLabel("2026-02-30", "09:00")).toBe("");
    expect(momentLabel("2026-11-11", "")).toBe("");
  });

  it("names both ends, with years only when they differ", () => {
    expect(rangeLabel("2026-11-11", "09:00", "2026-11-13", "12:15")).toBe("Wed, Nov 11, 9:00 AM to Fri, Nov 13, 12:15 PM.");
    expect(rangeLabel("2026-12-31", "23:00", "2027-01-01", "01:00")).toBe("Thu, Dec 31 2026, 11:00 PM to Fri, Jan 1 2027, 1:00 AM.");
  });
});

describe("dates not picked yet", () => {
  it("uses today until a date is picked", () => {
    expect(resolveDate(TODAY, "2026-11-11")).toBe("2026-11-11");
    expect(resolveDate("2026-12-25", "2026-11-11")).toBe("2026-12-25");
  });

  it("is blank before today is known, and when a date was cleared", () => {
    expect(resolveDate(TODAY, null)).toBe("");
    expect(resolveDate("", "2026-11-11")).toBe("");
    expect(betweenDates(resolveDate(TODAY, null), "09:00", resolveDate(TODAY, null), "17:00")).toBeNull();
  });

  it("gives the default a working answer once today is known", () => {
    const today = "2026-11-11";
    const { startDate, startTime, endDate, endTime } = INITIAL_DURATION;
    expect(betweenDates(resolveDate(startDate, today), startTime, resolveDate(endDate, today), endTime)).toEqual({ minutes: 480, backwards: false });
  });

  it("swaps start and end", () => {
    const state = { ...INITIAL_DURATION, startDate: "2026-11-13", startTime: "12:15", endDate: TODAY, endTime: "09:00" };
    expect(swapDates(state)).toMatchObject({ startDate: TODAY, startTime: "09:00", endDate: "2026-11-13", endTime: "12:15" });
    expect(swapDates(swapDates(state))).toEqual(state);
  });
});

describe("stored duration calculator", () => {
  it("accepts what it saved", () => {
    expect(parseDurationState(JSON.parse(JSON.stringify(INITIAL_DURATION)))).toEqual(INITIAL_DURATION);
    const typed = { mode: "dates", start: "", end: "23:30", breakMinutes: "45", startDate: "2026-11-11", startTime: "08:00", endDate: "", endTime: "" };
    expect(parseDurationState(typed)).toEqual(typed);
  });

  it("rejects anything else", () => {
    expect(parseDurationState(null)).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, mode: "weeks" })).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, start: "9:00" })).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, endDate: "2026-02-30" })).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, startDate: "tomorrow" })).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, breakMinutes: "-30" })).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, breakMinutes: 30 })).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, breakMinutes: "12345" })).toBeNull();
    expect(parseDurationState({ ...INITIAL_DURATION, endTime: undefined })).toBeNull();
  });
});
